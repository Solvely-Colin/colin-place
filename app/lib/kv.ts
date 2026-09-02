// Tiny Upstash Redis REST client for JSON values. Returns null when the
// store is not configured or unreachable; callers must cope.

function creds(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

export function kvConfigured(): boolean {
  return creds() !== null;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const c = creds();
  if (!c) return null;
  try {
    const res = await fetch(c.url + "/get/" + encodeURIComponent(key), {
      headers: { Authorization: "Bearer " + c.token },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { result?: string | null };
    if (typeof data.result !== "string") return null;
    return JSON.parse(data.result) as T;
  } catch {
    return null;
  }
}

export async function kvSet(key: string, value: unknown): Promise<boolean> {
  const c = creds();
  if (!c) return false;
  try {
    const res = await fetch(c.url + "/pipeline", {
      method: "POST",
      headers: { Authorization: "Bearer " + c.token, "Content-Type": "application/json" },
      body: JSON.stringify([["SET", key, JSON.stringify(value)]]),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}
