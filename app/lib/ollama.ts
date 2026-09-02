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
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no JSON object in reply");
  return JSON.parse(text.slice(start, end + 1));
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
