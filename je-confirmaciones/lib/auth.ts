import crypto from "crypto";

/**
 * Verificación de la contraseña del panel administrativo.
 * Usa comparación en tiempo constante (crypto.timingSafeEqual) para evitar
 * ataques de temporización. Este archivo usa el módulo "crypto" de Node,
 * así que solo debe importarse desde rutas de API (runtime de Node), nunca
 * desde middleware.ts (Edge Runtime) — para eso existe lib/session.ts.
 */
export function checkAdminPassword(password: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    throw new Error(
      "Falta la variable de entorno ADMIN_PASSWORD. Defínela en tu archivo .env."
    );
  }
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}
