/** Strip undefined, null, and empty-string values before passing to API. */
export function stripEmptyParams<T extends object>(
  obj: T,
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") {
      result[k] = v as string | number | boolean;
    }
  }
  return result;
}
