// One door to Ollama Cloud for structured output. Cloud models do not
// reliably honour `format` as a grammar, so the schema is also spelled out
// in the prompt, reasoning runs at low effort (it is separated from the
// reply, and it is fast), and the reply is scrubbed of fences and any
// stray reasoning before parsing.

export const DEFAULT_MODEL = "glm-5.3-flash:cloud";

export interface OllamaJsonRequest {
  system: string;
  user: string;
  schema: unknown;
  temperature?: number;
  numPredict?: number;
  timeoutMs?: number;
}

export interface OllamaJsonResult {
  json: unknown;
  model: string;
}

interface ChatResponse {
  message?: { content?: string; thinking?: string };
  error?: string;
}

export function modelName(): string {
  return process.env.OLLAMA_MODEL || DEFAULT_MODEL;
}

export function ollamaReady(): boolean {
  return Boolean(process.env.OLLAMA_API_KEY);
}

export function extractJson(content: string): unknown {
  let text = content;
  const closeThink = text.lastIndexOf("</think>");
  if (closeThink >= 0) text = text.slice(closeThink + "</think>".length);
  text = text.replace(/```(?:json)?/gi, "");
  const start = text.indexOf("{");
  if (start < 0) throw new Error("no JSON object in reply");
  const body = text.slice(start);
  try {
    return JSON.parse(body.slice(0, body.lastIndexOf("}") + 1));
  } catch {
    return JSON.parse(repairJson(body));
  }
}

// Models cut off mid-string, leave trailing commas, and put raw quotes inside
// strings more often than they should. Escape inner quotes, close what is
// open, drop what is broken, so a long reply still yields its fields.
export function repairJson(input: string): string {
  // Pass 1: escape double quotes that sit inside string values. A quote
  // closes a string only if the next non-space character could follow a
  // value or key: , } ] :
  let fixed = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        fixed += ch;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        fixed += ch;
        continue;
      }
      if (ch === "\n") {
        fixed += "\\n";
        continue;
      }
      if (ch === '"') {
        let j = i + 1;
        while (j < input.length && (input[j] === " " || input[j] === "\n" || input[j] === "\r" || input[j] === "\t")) j += 1;
        const next = input[j];
        if (next === undefined || next === "," || next === "}" || next === "]" || next === ":") {
          inString = false;
          fixed += ch;
        } else fixed += '\\"';
        continue;
      }
      fixed += ch;
      continue;
    }
    if (ch === '"') inString = true;
    fixed += ch;
  }
  // Pass 2: close what is open.
  let out = "";
  const stack: string[] = [];
  inString = false;
  escaped = false;
  for (const ch of fixed) {
    if (inString) {
      out += ch;
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
    } else if (ch === "{" || ch === "[") {
      stack.push(ch === "{" ? "}" : "]");
      out += ch;
    } else if (ch === "}" || ch === "]") {
      if (stack.length === 0) break;
      stack.pop();
      out = out.replace(/,\s*$/, "") + ch;
      if (stack.length === 0) break;
    } else out += ch;
  }
  if (inString) out += '"';
  out = out.replace(/,\s*"[^"]*"\s*:\s*("[^"]*")?\s*$/, "").replace(/,\s*$/, "");
  while (stack.length > 0) out += stack.pop();
  return out;
}

export async function ollamaJson(req: OllamaJsonRequest): Promise<OllamaJsonResult> {
  const apiKey = process.env.OLLAMA_API_KEY;
  if (!apiKey) throw new Error("OLLAMA_API_KEY is not set");
  const model = modelName();
  const system =
    req.system +
    "\n\nOUTPUT CONTRACT: reply with ONE JSON object and nothing else. No prose, no code fences. " +
    "Use exactly these keys and types (this is a JSON Schema):\n" +
    JSON.stringify(req.schema);
  const res = await fetch("https://ollama.com/api/chat", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      think: "low",
      format: req.schema,
      keep_alive: "10m",
      options: { temperature: req.temperature ?? 0.7, num_predict: req.numPredict ?? 1600 },
      messages: [
        { role: "system", content: system },
        { role: "user", content: req.user },
      ],
    }),
    signal: AbortSignal.timeout(req.timeoutMs ?? 45000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error("ollama " + res.status + " " + body.slice(0, 200));
  }
  const data = (await res.json()) as ChatResponse;
  if (data.error) throw new Error("ollama: " + data.error);
  return { json: extractJson(data.message?.content ?? ""), model };
}

// ---------------------------------------------------------------- streaming

export interface ChatTurn {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface OllamaStreamRequest {
  messages: ChatTurn[];
  temperature?: number;
  numPredict?: number;
  timeoutMs?: number;
}

/**
 * Streams the reply as plain UTF-8 text chunks. Reasoning runs at low effort
 * and arrives on a separate field, so only the answer is forwarded. Errors
 * surface as a short readable line rather than a broken stream.
 */
export async function ollamaStream(req: OllamaStreamRequest): Promise<ReadableStream<Uint8Array>> {
  const encoder = new TextEncoder();
  const apiKey = process.env.OLLAMA_API_KEY;
  const model = modelName();
  if (!apiKey) {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode("The model is not wired up yet. Colin is on it."));
        controller.close();
      },
    });
  }
  const res = await fetch("https://ollama.com/api/chat", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: true,
      think: "low",
      keep_alive: "10m",
      options: { temperature: req.temperature ?? 0.6, num_predict: req.numPredict ?? 600 },
      messages: req.messages,
    }),
    signal: AbortSignal.timeout(req.timeoutMs ?? 60000),
  });
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => "");
    console.error("[ollama] stream failed:", res.status, body.slice(0, 200));
    return new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode("The model is busy right now. Try again in a moment."));
        controller.close();
      },
    });
  }
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let sawThinkClose = false;
  let pending = "";
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await reader.read();
      if (done) {
        if (pending) controller.enqueue(encoder.encode(pending));
        controller.close();
        return;
      }
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.trim()) continue;
        let chunk: { message?: { content?: string }; done?: boolean; error?: string };
        try {
          chunk = JSON.parse(line);
        } catch {
          continue;
        }
        if (chunk.error) {
          controller.enqueue(encoder.encode(" [the model hit an error]"));
          continue;
        }
        let text = chunk.message?.content ?? "";
        if (!text) continue;
        // Defensive: some models leak reasoning into content before a </think>.
        if (!sawThinkClose) {
          pending += text;
          const idx = pending.indexOf("</think>");
          if (idx >= 0) {
            sawThinkClose = true;
            text = pending.slice(idx + "</think>".length);
            pending = "";
          } else if (pending.length > 400 || chunk.done) {
            // No reasoning leak; flush what we have and stop buffering.
            sawThinkClose = true;
            text = pending;
            pending = "";
          } else continue;
        }
        if (text) controller.enqueue(encoder.encode(text));
      }
    },
    cancel() {
      reader.cancel().catch(() => undefined);
    },
  });
}

export function textStreamResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
}

// Best-effort per-instance daily limits, shared by the model endpoints.
const buckets = new Map<string, { count: number; day: string }>();
export function overLimit(scope: string, ip: string, perIp: number, global = 600): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const key = scope + ":" + ip;
  const gkey = scope + ":*";
  const e = buckets.get(key) ?? { count: 0, day };
  const g = buckets.get(gkey) ?? { count: 0, day };
  if (e.day !== day) Object.assign(e, { count: 0, day });
  if (g.day !== day) Object.assign(g, { count: 0, day });
  if (e.count >= perIp || g.count >= global) return true;
  e.count += 1;
  g.count += 1;
  buckets.set(key, e);
  buckets.set(gkey, g);
  if (buckets.size > 8000) buckets.clear();
  return false;
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}
