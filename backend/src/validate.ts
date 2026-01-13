export function isString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export function isNumber(v: unknown): v is number {
  return typeof v === "number" && !Number.isNaN(v);
}
