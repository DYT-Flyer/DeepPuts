import { createHash } from "crypto";

export function computePayloadHash(payload: string): string {
  return createHash("sha256").update(payload).digest("hex");
}
