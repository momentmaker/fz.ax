/**
 * Minimal djb2 string hash. Returns a non-negative 32-bit integer.
 *
 * Used to seed deterministic rotations (Library quote per user/week,
 * Echo pick per day). Not cryptographic — stability and speed are the
 * goals, not collision resistance.
 */
export function hashString(value: string): number {
  if (value.length === 0) return 0
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = ((hash << 5) + hash + value.charCodeAt(i)) | 0
  }
  // Force non-negative by masking the sign bit.
  return hash >>> 0
}
