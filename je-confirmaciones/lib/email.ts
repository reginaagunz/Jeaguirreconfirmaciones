import nodemailer from "nodemailer";
import type { Appointment } from "@prisma/client";

/**
 * Envío de correos vía Gmail SMTP + Nodemailer, usando una "Contraseña de
 * aplicación" de Google (App Password). Esta es la opción más simple y
 * confiable para un equipo pequeño: no requiere aprobar una app OAuth con
 * Google ni gestionar tokens que expiran, solo activar verificación en 2
 * pasos en la cuenta de Gmail y generar una contraseña de aplicación.
 *
 * Si en el futuro se prefiere reutilizar la integración OAuth de Google
 * Calendar/Gmail del proyecto anterior, este archivo es el único lugar que
 * habría que modificar (createTransport) — el resto de la app llama a
 * sendTeamConfirmedEmail / sendTeamDeclinedEmail / sendClientConfirmedEmail
 * sin conocer el mecanismo de envío.
 */

function getTransporter() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      "Faltan las variables de entorno GMAIL_USER y/o GMAIL_APP_PASSWORD. Ver .env.example."
    );
  }
  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

function getTeamEmail(): string {
  const email = process.env.TEAM_NOTIFICATION_EMAIL;
  if (!email) {
    throw new Error("Falta la variable de entorno TEAM_NOTIFICATION_EMAIL. Ver .env.example.");
  }
  return email;
}

const brandFooter = `
  <div style="margin-top:32px;padding-top:20px;border-top:1px solid #E4E1D9;color:#8A8A85;font-size:12px;font-family:'Helvetica Neue',Arial,sans-serif;">
    JE Aguirre Consultores
  </div>
`;

function wrapEmail(bodyHtml: string): string {
  return `
  <!DOCTYPE html>
  <html lang="es">
    <body style="margin:0;padding:32px 16px;background:#F6F5F1;font-family:'Helvetica Neue',Arial,sans-serif;">
      <table role="presentation" width="100%" style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:12px;overflow:hidden;border:1px solid #E9E7E0;">
        <tr>
          <td style="padding:36px 36px 28px 36px;">
            ${bodyHtml}
            ${brandFooter}
          </td>
        </tr>
      </table>
    </body>
  </html>`;
}

function labelValueRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:6px 0;color:#8A8A85;font-size:12px;letter-spacing:0.04em;">${label}</td>
    </tr>
    <tr>
      <td style="padding:0 0 14px 0;color:#232323;font-size:15px;">${value}</td>
    </tr>`;
}

/** Correo al equipo cuando el cliente CONFIRMA su asistencia. */
export async function sendTeamConfirmedEmail(appointment: Appointment) {
  const transporter = getTransporter();
  const html = wrapEmail(`
    <p style="margin:0 0 4px 0;color:#1F8A82;font-size:13px;font-weight:600;letter-spacing:0.03em;">
      ASISTENCIA CONFIRMADA
    </p>
    <h1 style="margin:0 0 18px 0;color:#232323;font-size:20px;font-weight:600;">
      ${appointment.clientName} confirmó su cita
    </h1>
    <table role="presentation" width="100%">
      ${labelValueRow("FECHA", appointment.displayDate)}
      ${labelValueRow("HORA", `${appointment.displayTime} (${appointment.timezone})`)}
      ${labelValueRow("MODALIDAD", "Reunión por Zoom")}
      ${labelValueRow("ASESOR", appointment.advisorName)}
      ${labelValueRow("EMAIL DEL CLIENTE", appointment.clientEmail)}
      ${appointment.clientPhone ? labelValueRow("TELÉFONO", appointment.clientPhone) : ""}
    </table>
    <a href="${appointment.zoomLink}" style="display:inline-block;margin-top:12px;padding:12px 22px;background:#1F2547;color:#FFFFFF;text-decoration:none;border-radius:6px;font-size:14px;">
      Entrar a Zoom
    </a>
  `);

  await transporter.sendMail({
    from: `"JE Aguirre Consultores" <${process.env.GMAIL_USER}>`,
    to: getTeamEmail(),
    subject: `✅ Cita confirmada — ${appointment.clientName}`,
    html,
  });
}

/** Correo al equipo cuando el cliente indica que NO podrá asistir. */
export async function sendTeamDeclinedEmail(appointment: Appointment) {
  const transporter = getTransporter();
  const html = wrapEmail(`
    <p style="margin:0 0 4px 0;color:#B4553F;font-size:13px;font-weight:600;letter-spacing:0.03em;">
      NO PODRÁ ASISTIR
    </p>
    <h1 style="margin:0 0 18px 0;color:#232323;font-size:20px;font-weight:600;">
      ${appointment.clientName} no podrá asistir
    </h1>
    <table role="presentation" width="100%">
      ${labelValueRow("FECHA ORIGINAL", appointment.displayDate)}
      ${labelValueRow("HORA ORIGINAL", `${appointment.displayTime} (${appointment.timezone})`)}
      ${labelValueRow("ASESOR", appointment.advisorName)}
      ${labelValueRow("EMAIL DEL CLIENTE", appointment.clientEmail)}
      ${appointment.clientPhone ? labelValueRow("TELÉFONO", appointment.clientPhone) : ""}
    </table>
    <p style="margin-top:16px;color:#5B5B57;font-size:14px;">
      Conviene contactarlo para reagendar.
    </p>
  `);

  await transporter.sendMail({
    from: `"JE Aguirre Consultores" <${process.env.GMAIL_USER}>`,
    to: getTeamEmail(),
    subject: `🔴 Cita no confirmada — ${appointment.clientName}`,
    html,
  });
}

/** Correo al cliente confirmando su cita. */
export async function sendClientConfirmedEmail(appointment: Appointment) {
  const transporter = getTransporter();
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "";
  const icsUrl = `${baseUrl}/api/ics/${appointment.token}`;

  const html = wrapEmail(`
    <h1 style="margin:0 0 6px 0;color:#232323;font-size:21px;font-weight:600;">
      Hola, ${appointment.clientName}:
    </h1>
    <p style="margin:0 0 20px 0;color:#5B5B57;font-size:15px;line-height:1.6;">
      Gracias por confirmar tu asistencia. Tu cita está lista:
    </p>
    <table role="presentation" width="100%">
      ${labelValueRow("FECHA", appointment.displayDate)}
      ${labelValueRow("HORA", `${appointment.displayTime} (${appointment.timezone})`)}
      ${labelValueRow("MODALIDAD", "Reunión por Zoom")}
      ${labelValueRow("ASESOR", appointment.advisorName)}
    </table>
    <a href="${appointment.zoomLink}" style="display:inline-block;margin-top:14px;margin-right:10px;padding:12px 22px;background:#1F2547;color:#FFFFFF;text-decoration:none;border-radius:6px;font-size:14px;">
      Entrar a la reunión
    </a>
    <a href="${icsUrl}" style="display:inline-block;margin-top:14px;padding:12px 22px;background:#FFFFFF;color:#1F2547;border:1px solid #D8D5CC;text-decoration:none;border-radius:6px;font-size:14px;">
      Agregar a mi calendario
    </a>
  `);

  await transporter.sendMail({
    from: `"JE Aguirre Consultores" <${process.env.GMAIL_USER}>`,
    to: appointment.clientEmail,
    subject: "Tu cita ha sido confirmada — JE Aguirre Consultores",
    html,
  });
}
