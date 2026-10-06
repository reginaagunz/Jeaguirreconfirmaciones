/**
 * Convierte una fecha y hora "de pared" (p. ej. 10:00 en America/Mexico_City)
 * a un instante UTC (Date) correcto, sin depender de la zona horaria del
 * servidor donde corre Node.
 *
 * Esto importa porque el servidor de producción normalmente corre en UTC
 * (Vercel, por ejemplo), así que `new Date("2026-10-02T10:00:00")` NO
 * produce las 10:00 de Ciudad de México — produce las 10:00 UTC, que son
 * las 4:00 o 5:00 en CDMX según horario de verano. Este helper evita ese
 * desfase.
 */
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  // Primer intento: tratamos la hora de pared como si ya fuera UTC.
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);

  // Vemos qué hora local produce ese instante en la zona horaria deseada.
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(new Date(utcGuess));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);

  const asIfUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), 0);

  // Diferencia entre lo que pedimos y lo que obtuvimos = desfase de la zona horaria.
  const offset = utcGuess - asIfUtc;

  return new Date(utcGuess + offset);
}
