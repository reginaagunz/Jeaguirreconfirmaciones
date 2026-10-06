/**
 * Manejo de la cookie de sesión del panel admin usando Web Crypto (SubtleCrypto),
 * que funciona tanto en el runtime de Node como en el Edge Runtime (donde corre
 * el middleware de Next.js). Por eso este archivo NO usa el módulo "crypto" de
 * Node — ver lib/auth.ts para la verificación de contraseña, que sí lo usa y
 * solo se ejecuta en rutas de API (runtime de Node).
 */

export const ADMIN_COOKIE_NAME = "je_admin_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 12; // 12 horas

function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "Falta la variable de entorno ADMIN_SESSION_SECRET. Defínela en tu archivo .env."
    );
  }
  return secret;
}

async function hmacHex(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createSessionCookieValue(): Promise<string> {
  const expires = Date.now() + SESSION_TTL_MS;
  const payload = `admin:${expires}`;
  const signature = await hmacHex(payload);
  return `${payload}:${signature}`;
}

export async function isValidSessionCookieValue(
  value: string | undefined
): Promise<boolean> {
  if (!value) return false;
  const parts = value.split(":");
  if (parts.length !== 3) return false;
  const [role, expiresStr, signature] = parts;
  const payload = `${role}:${expiresStr}`;
  const expectedSignature = await hmacHex(payload);

  if (signature.length !== expectedSignature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < signature.length; i++) {
    mismatch |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
  }
  if (mismatch !== 0) return false;

  const expires = Number(expiresStr);
  if (!Number.isFinite(expires) || Date.now() > expires) return false;

  return role === "admin";
}

export { SESSION_TTL_MS };
