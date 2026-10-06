/**
 * A partir de un Date, produce las cadenas de despliegue en español que se
 * muestran al cliente ("Jueves 2 de octubre de 2026", "10:00 AM").
 * Se guardan como texto en la base de datos junto con el Date real, para que
 * lo que el cliente vio al confirmar nunca cambie aunque cambien reglas de
 * formato en el futuro.
 */
export function formatDisplayDate(date: Date, timezone: string): string {
  const formatted = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(date);
  return capitalize(formatted);
}

export function formatDisplayTime(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  }).format(date);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
