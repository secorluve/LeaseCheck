import { parseJsonSafe } from "./helpers";

export type FieldSourceType = "json_ld" | "script_json" | "meta" | "dom" | "regex" | "fallback" | "none";

export interface FieldTrace {
  source: FieldSourceType;
  path?: string;
  note?: string;
}

export function extractScriptJsonObjects(html: string): Array<{ id: string; data: unknown }> {
  const objects: Array<{ id: string; data: unknown }> = [];
  const scriptRegex = /<script([^>]*)>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  let index = 0;
  while ((match = scriptRegex.exec(html))) {
    index += 1;
    const attrs = match[1] ?? "";
    const body = (match[2] ?? "").trim();
    const scriptId = attrs.match(/id=["']([^"']+)["']/i)?.[1] ?? `script_${index}`;
    const type = attrs.match(/type=["']([^"']+)["']/i)?.[1];

    if (type?.toLowerCase() === "application/ld+json") continue;
    if (!body || body.length < 2) continue;

    const directJson = parseJsonSafe(body);
    if (directJson) {
      objects.push({ id: scriptId, data: directJson });
      continue;
    }

    const assignmentRegex = /(?:window\.)?([A-Z0-9_.]+)\s*=\s*({[\s\S]*?}|\[[\s\S]*?\])(?:;|$)/gi;
    let assignMatch: RegExpExecArray | null;
    while ((assignMatch = assignmentRegex.exec(body))) {
      const parsed = parseJsonSafe(assignMatch[2]);
      if (parsed) {
        objects.push({ id: `${scriptId}:${assignMatch[1]}`, data: parsed });
      }
    }
  }
  return objects;
}

export function deepFindFirst(
  root: unknown,
  keys: string[],
): { value: unknown; path: string } | undefined {
  const queue: Array<{ value: unknown; path: string }> = [{ value: root, path: "$" }];
  const normalized = new Set(keys.map((k) => k.toLowerCase()));

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || !current.value || typeof current.value !== "object") continue;

    if (Array.isArray(current.value)) {
      current.value.forEach((item, idx) => queue.push({ value: item, path: `${current.path}[${idx}]` }));
      continue;
    }

    const obj = current.value as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj)) {
      const nextPath = `${current.path}.${key}`;
      if (normalized.has(key.toLowerCase())) {
        return { value, path: nextPath };
      }
      if (value && typeof value === "object") queue.push({ value, path: nextPath });
    }
  }

  return undefined;
}

export function deepCollectByKey(root: unknown, keys: string[]): Array<{ value: unknown; path: string }> {
  const queue: Array<{ value: unknown; path: string }> = [{ value: root, path: "$" }];
  const normalized = new Set(keys.map((k) => k.toLowerCase()));
  const out: Array<{ value: unknown; path: string }> = [];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current || !current.value || typeof current.value !== "object") continue;

    if (Array.isArray(current.value)) {
      current.value.forEach((item, idx) => queue.push({ value: item, path: `${current.path}[${idx}]` }));
      continue;
    }

    const obj = current.value as Record<string, unknown>;
    for (const [key, value] of Object.entries(obj)) {
      const nextPath = `${current.path}.${key}`;
      if (normalized.has(key.toLowerCase())) out.push({ value, path: nextPath });
      if (value && typeof value === "object") queue.push({ value, path: nextPath });
    }
  }
  return out;
}
