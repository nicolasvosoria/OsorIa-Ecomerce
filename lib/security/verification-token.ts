import { randomBytes, createHash } from "crypto";

const TOKEN_BYTE_LENGTH = 32;

export type VerificationToken = {
  token: string;
  tokenHash: string;
};

// One call produces both halves of D6's ownership link: the plaintext token
// goes into the emailed URL (app/auth/mailbox-verification reads it from the
// query string) and is never stored; only its hash is persisted, so a
// database read alone can never forge a working link.
export function createVerificationToken(): VerificationToken {
  const token = randomBytes(TOKEN_BYTE_LENGTH).toString("base64url");
  return { token, tokenHash: hashVerificationToken(token) };
}

export function hashVerificationToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
