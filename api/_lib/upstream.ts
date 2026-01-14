import type { VercelResponse } from "@vercel/node";

const upstreamBase = (process.env.UPSTREAM_BASE || "http://43.159.63.122/api").replace(/\/$/, "");

export async function fetchUpstream(path: string, init?: RequestInit) {
  const url = `${upstreamBase}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {})
    }
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upstream ${url} failed: ${res.status} ${text}`);
  }
  if (res.headers.get("content-type")?.includes("application/json")) {
    return res.json();
  }
  return res.text();
}

export function methodNotAllowed(res: VercelResponse, methods: string[]) {
  res.setHeader("Allow", methods);
  return res.status(405).json({ error: "Method Not Allowed" });
}

export function badRequest(res: VercelResponse, message: string) {
  return res.status(400).json({ error: message });
}
