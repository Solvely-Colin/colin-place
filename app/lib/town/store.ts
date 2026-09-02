import type { Building } from "./types";

// Upstash Redis over REST, same shape as the presence route. Two lists:
// approved buildings show for everyone; pending ones wait for Colin.
const APPROVED = "town:approved";
const PENDING = "town:pending";
const MAX_LIST = 400;

interface PipelineResult {
  result?: unknown;
  error?: string;
}

function creds(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export function storeConfigured(): boolean {
  return creds() !== null;
}

async function pipeline(commands: string[][]): Promise<PipelineResult[] | null> {
  const c = creds();
  if (!c) return null;
  try {
    const res = await fetch(c.url + "/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + c.token, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    if (!res.ok) return null;
    return (await res.json()) as PipelineResult[];
  } catch {
    return null;
  }
}

function parseList(result: unknown): Building[] {
  if (!Array.isArray(result)) return [];
  const out: Building[] = [];
  for (const item of result) {
    if (typeof item !== "string") continue;
    try {
      out.push(JSON.parse(item) as Building);
    } catch {
      // skip corrupt entry
    }
  }
  return out;
}

export async function listBuildings(list: "approved" | "pending"): Promise<Building[]> {
  const key = list === "approved" ? APPROVED : PENDING;
  const res = await pipeline([["LRANGE", key, "0", String(MAX_LIST)]]);
  return parseList(res?.[0]?.result);
}

export async function pushBuilding(list: "approved" | "pending", b: Building): Promise<boolean> {
  const key = list === "approved" ? APPROVED : PENDING;
  const res = await pipeline([
    ["LPUSH", key, JSON.stringify(b)],
    ["LTRIM", key, "0", String(MAX_LIST)],
  ]);
  return res !== null && !res[0]?.error;
}

export async function removeBuilding(list: "approved" | "pending", id: string): Promise<Building | null> {
  const items = await listBuildings(list);
  const found = items.find((b) => b.id === id);
  if (!found) return null;
  const key = list === "approved" ? APPROVED : PENDING;
  await pipeline([["LREM", key, "0", JSON.stringify(found)]]);
  return found;
}
