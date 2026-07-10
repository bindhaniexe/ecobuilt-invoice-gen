import { createHmac, timingSafeEqual } from "crypto";

export const AUTH_COOKIE_NAME = "ecobuilt-session";
const TOKEN_VALUE = "authenticated";

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error(
      "AUTH_SECRET environment variable is not set. Generate one with: openssl rand -base64 32",
    );
  }
  return secret;
}

export function getPassword(): string {
  const password = process.env.INVOICE_APP_PASSWORD;
  if (!password) {
    throw new Error("INVOICE_APP_PASSWORD environment variable is not set.");
  }
  return password;
}

/** Create a signed token that proves the user has logged in. */
export function createSessionToken(): string {
  const hmac = createHmac("sha256", getSecret());
  hmac.update(TOKEN_VALUE);
  const signature = hmac.digest("hex");
  return `${TOKEN_VALUE}.${signature}`;
}

/** Verify that a session token is valid and was signed with our secret. */
export function verifySessionToken(token: string): boolean {
  const parts = token.split(".");
  if (parts.length !== 2) return false;

  const [value, signature] = parts;
  if (value !== TOKEN_VALUE) return false;

  const hmac = createHmac("sha256", getSecret());
  hmac.update(value);
  const expectedSignature = hmac.digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(expectedSignature, "hex"),
    );
  } catch {
    return false;
  }
}
