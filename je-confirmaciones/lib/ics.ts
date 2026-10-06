import type { Appointment } from "@prisma/client";

/**
 * Genera un archivo .ics (formato estándar iCalendar) para la cita.
 * Este formato es compatible directamente con Google Calendar, Apple Calendar
 * y Outlook sin necesitar ninguna API ni credenciales de Google: el cliente
 * simplemente descarga el archivo y su calendario lo abre.
 *
 * La cita se asume con duración de 45 minutos por defecto.
 */
export function buildIcsForAppointment(appointment: Appointment): string {
  const start = new Date(appointment.appointmentDate);
  const end = new Date(start.getTime() + 45 * 60 * 1000);

  const uid = `${appointment.token}@jeaguirreconsultores`;
  const dtStamp = formatIcsDate(new Date());
  const dtStart = formatIcsDate(start);
  const dtEnd = formatIcsDate(end);

  const description = [
    `Reunión con ${appointment.advisorName}, JE Aguirre Consultores.`,
    `Enlace de Zoom: ${appointment.zoomLink}`,
  ]
    .join("\\n")
    .replace(/,/g, "\\,");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//JE Aguirre Consultores//Confirmaciones//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Reunión con ${escapeIcs(appointment.advisorName)} — JE Aguirre Consultores`,
    `DESCRIPTION:${description}`,
    `LOCATION:${escapeIcs(appointment.zoomLink)}`,
    `URL:${escapeIcs(appointment.zoomLink)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  // iCalendar requiere terminadores de línea CRLF.
  return lines.join("\r\n");
}

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcs(value: string): string {
  return value.replace(/,/g, "\\,").replace(/;/g, "\\;");
}
