import { NextRequest, NextResponse } from "next/server";
import { fetchGithubActivity } from "../../lib/activity";
import { fetchPulse } from "../../lib/pulse";
import { searchGitHub } from "../../lib/github-search";
import { JOURNAL_ENTRIES } from "../../lib/journal";

const SYSTEM_PROMPT = `You are Clippy Colin, the mascot of colin.place — Colin Johnson's personal site, which is styled like a playful desktop OS. You are not the real Colin; you are the site's assistant, a tiny on-brand relative of Colin's own AI setup.

About Colin:
- Colin Johnson: developer ecosystem operator, open-source maintainer, and technical community builder. Runs Solvely, the company behind his operations, experiments, and infrastructure.
- Volunteer maintainer and contributor at the OpenClaw Foundation: 29 merged PRs into openclaw/openclaw spanning iOS, Android, macOS, web UI, Slack, Discord, and the plugin runtime, plus QA evidence infrastructure now running in the project CI.
- Community admin and maintainer on the original 64k-star get-shit-done project, then helped steward it into Open GSD. 18 merged PRs on gsd-browser (a Rust browser-automation CLI with a full MCP server), plus gsd-core and gsd-pi work. 82+ merged PRs across the ecosystems overall.
- Day job: Senior Manager, CRM at Youth Enrichment Brands — CRM architecture and custom HubSpot apps across four franchise brands, API integrations, lifecycle email tooling. Speaker at HubSpot events including INBOUND.
- Ships TypeScript, Rust, Go, Python, and JavaScript via agent-orchestrated development with human review.
- Other projects: Quorum (multi-AI deliberation framework where models debate, critique, and vote), SpecIt (one adaptive interview generates a structured spec file for coding frameworks), solvely-web, and this site (Colin OS).
- Open to: collaborations, consulting, and interesting technical work.
- Contact: email hello@colin.place, X @colinsolvely, GitHub Solvely-Colin, LinkedIn colin-w-johnson. The site's Contact window has the same links, and the Resume window has the full track record.
- Site trivia: press Cmd/Ctrl+K for the command palette; the Terminal app has commands (tell people to try typing "surprise"); windows minimize to the taskbar at the bottom; clicking the mascot opens this chat; the Live window streams Colin's real public developer activity.

Tools you can use:
- get_live_activity: call this when someone asks what Colin has been up to lately, what he is working on now, or about recent activity. Answer from the real data it returns, and consider opening the live window.
- get_pulse: call this for Colin's current telemetry — open PRs, push velocity over 7/30 days, repos he is shepherding, and language mix.
- search_github: call this to hunt down a specific PR, review, issue, or discussion Colin is involved in across GitHub, e.g. "find his most heated PR review". Search with focused keywords and, if needed, search again with a different angle before answering.
- open_window: open a window on the visitor's desktop when it genuinely helps — at most one per answer, only when natural (projects for work, contact for reaching him, live for recent activity, journal for Colin's own approved writing, workshop for playable artifacts, resume for track record, terminal for the curious).

You may chain multiple tools — gather what you need across several tool calls before you answer.

Rules:
- Answer in 1-3 short sentences. For research answers that came from tool results, up to 5 sentences is fine, and you MUST include the exact URLs you used. Warm, a little playful, plain text with no markdown.
- Only answer questions about Colin, his work, his projects, or this site. For anything else, say you are only briefed on Colin and steer back.
- Never invent facts about Colin. If you do not know, say so and suggest asking him directly via the Contact window.
- No private or sensitive personal details: nothing about family, health, finances, or precise location.
- If people ask about working with Colin, be warm and point to the Contact window. Do not oversell.`;

// Approved Journal entries are Colin's own current voice — the bot reads them
// so it can answer "what's on Colin's mind" from what he actually wrote.
const JOURNAL_CONTEXT =
  JOURNAL_ENTRIES.length === 0
    ? ""
    : "\n\nFrom Colin's Journal (entries he wrote and approved, newest first):\n" +
      JOURNAL_ENTRIES.slice(0, 5)
        .map((e) => "- " + e.date + " — " + e.title + ": " + e.body.replace(/\n+/g, " "))
        .join("\n");

const SYSTEM_PROMPT_FULL = SYSTEM_PROMPT + JOURNAL_CONTEXT;

const WINDOW_IDS = ["about", "projects", "resume", "ask", "now", "live", "journal", "workshop", "contact", "terminal"];

const TOOLS = [
  {
    type: "function",
    function: {
      name: "open_window",
      description: "Open a window on the visitor's desktop, e.g. to show Colin's projects or contact info.",
      parameters: {
        type: "object",
        properties: { id: { type: "string", enum: WINDOW_IDS } },
        required: ["id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_live_activity",
      description: "Get Colin's recent public developer activity (GitHub pushes, PRs, releases) when asked what he has been up to lately.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_pulse",
      description: "Get Colin’s current telemetry: open PRs, recent push velocity, repos he is shepherding, language mix",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "search_github",
      description: "Search issues/PRs/comments Colin is involved in across GitHub, e.g. to find a specific PR review or discussion",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
    },
  },
];

const FALLBACK_REPLY = "Hmm, I drew a blank there. Ask me again?";
const ERROR_REPLY = "My wires got crossed for a second — try again.";
const RATE_REPLY = "I have been chatting a lot today and need a breather. Come back tomorrow?";
const NO_KEY_REPLY = "I am not wired up just yet. Colin is on it.";
const BAD_REPLY = "Say that again a different way? I did not quite catch it.";

// Best-effort in-memory rate limiting (resets when the serverless instance recycles).
const DAY_LIMIT_IP = 20;
const DAY_LIMIT_GLOBAL = 300;
const perIp = new Map<string, { count: number; day: string }>();
let globalCount = { count: 0, day: "" };

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function rateLimit(ip: string): boolean {
  const day = today();
  if (globalCount.day !== day) globalCount = { count: 0, day };
  const entry = perIp.get(ip) ?? { count: 0, day };
  if (entry.day !== day) {
    entry.count = 0;
    entry.day = day;
  }
  if (entry.count >= DAY_LIMIT_IP || globalCount.count >= DAY_LIMIT_GLOBAL) return false;
  entry.count += 1;
  globalCount.count += 1;
  perIp.set(ip, entry);
  if (perIp.size > 5000) perIp.clear();
  return true;
}

interface OaiToolCall {
  id: string;
  function: { name: string; arguments?: string };
}
interface OaiMessage {
  role?: string;
  content?: string | null;
  tool_calls?: OaiToolCall[];
}
interface OaiResponse {
  choices?: { message?: OaiMessage }[];
}

async function callOpenAI(messages: Record<string, unknown>[]): Promise<OaiResponse> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + (process.env.OPENAI_API_KEY ?? ""),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-5.4-mini",
      messages,
      tools: TOOLS,
      max_completion_tokens: 500,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error("openai " + res.status);
  return (await res.json()) as OaiResponse;
}

// Executes one tool call and returns the text fed back to the model.
// open_window also records a side-effect action for the client.
async function runTool(tc: OaiToolCall, actions: { type: string; id: string }[]): Promise<string> {
  if (tc.function.name === "open_window") {
    let id = "";
    try {
      id = String(JSON.parse(tc.function.arguments ?? "{}").id ?? "");
    } catch {
      id = "";
    }
    if (WINDOW_IDS.includes(id) && id !== "ask") {
      actions.push({ type: "open_window", id });
      return "The " + id + " window is now open.";
    }
    return "That window cannot be opened.";
  }

  if (tc.function.name === "get_live_activity") {
    const items = await fetchGithubActivity();
    return items.length === 0
      ? "No recent public activity found."
      : items
          .slice(0, 8)
          .map((i) => "- " + i.text + " (" + i.at.slice(0, 10) + ")")
          .join("\n");
  }

  if (tc.function.name === "get_pulse") {
    const pulse = await fetchPulse();
    if (!pulse.ok) return "Telemetry is unavailable right now.";
    return JSON.stringify({
      openPrs: { count: pulse.openPrs.length, titles: pulse.openPrs.map((p) => p.repo + " #" + p.number + " " + p.title + " (" + p.url + ")") },
      pushes7d: pulse.pushes7d,
      pushes30d: pulse.pushes30d,
      shepherding: pulse.shepherding,
      languages: pulse.languages,
    });
  }

  if (tc.function.name === "search_github") {
    let query = "";
    try {
      query = String(JSON.parse(tc.function.arguments ?? "{}").query ?? "").slice(0, 200);
    } catch {
      query = "";
    }
    if (!query) return "A search query is required.";
    const results = await searchGitHub(query);
    return results.length === 0
      ? "No matching issues, PRs, or comments found for that query."
      : results
          .map((r) => r.kind + " | " + r.repo + " | " + r.title + " | " + r.url + " | " + r.updatedAt.slice(0, 10))
          .join("\n");
  }

  return "Unknown tool.";
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!rateLimit(ip)) return NextResponse.json({ reply: RATE_REPLY, actions: [] });
  if (!process.env.OPENAI_API_KEY) return NextResponse.json({ reply: NO_KEY_REPLY, actions: [] });

  let body: { messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ reply: BAD_REPLY, actions: [] });
  }

  const raw = Array.isArray(body.messages) ? body.messages : [];
  const messages = raw
    .filter(
      (m): m is { role: string; content: string } =>
        !!m &&
        typeof m === "object" &&
        typeof (m as { role?: unknown }).role === "string" &&
        typeof (m as { content?: unknown }).content === "string"
    )
    .filter((m) => m.role === "user" || m.role === "assistant")
    .slice(-8)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 600) }));

  if (messages.length === 0) return NextResponse.json({ reply: BAD_REPLY, actions: [] });

  const conversation: Record<string, unknown>[] = [
    { role: "system", content: SYSTEM_PROMPT_FULL },
    ...messages,
  ];
  const actions: { type: string; id: string }[] = [];

  try {
    // Bounded agent loop: let the bot chain tools for a few rounds, then
    // answer. Anything past MAX_ROUNDS bails to the fallback reply.
    const MAX_ROUNDS = 4;
    for (let round = 0; round < MAX_ROUNDS; round += 1) {
      const data = await callOpenAI(conversation);
      const msg = data.choices?.[0]?.message;
      const toolCalls = msg?.tool_calls ?? [];

      if (!msg || toolCalls.length === 0) {
        const reply = msg?.content?.trim();
        return NextResponse.json({ reply: reply || FALLBACK_REPLY, actions });
      }

      conversation.push(msg as unknown as Record<string, unknown>);
      for (const tc of toolCalls.slice(0, 3)) {
        conversation.push({ role: "tool", tool_call_id: tc.id, content: await runTool(tc, actions) });
      }
    }
    return NextResponse.json({ reply: FALLBACK_REPLY, actions });
  } catch {
    return NextResponse.json({ reply: ERROR_REPLY, actions: [] });
  }
}
