import crypto from "crypto";

/**
 * Genera un token único, aleatorio e imposible de adivinar para usar en la
 * URL pública de confirmación (/confirmar/TOKEN).
 *
 * - 24 bytes de entropía criptográfica (192 bits) codificados en base62
 *   (solo letras y números, seguro para URLs, sin caracteres ambiguos como / o +).
 * - No contiene ni codifica ningún dato del cliente ni de la cita.
 */
export function generateAppointmentToken(): string {
  const bytes = crypto.randomBytes(24);
  return toBase62(bytes);
}

const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function toBase62(buffer: Buffer): string {
  let value = BigInt("0x" + buffer.toString("hex"));
  if (value === 0n) return "0";
  let out = "";
  const base = BigInt(ALPHABET.length);
  while (value > 0n) {
    const rem = value % base;
    out = ALPHABET[Number(rem)] + out;
    value = value / base;
  }
  return out;
}
