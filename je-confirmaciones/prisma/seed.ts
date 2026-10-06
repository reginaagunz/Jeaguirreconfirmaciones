/**
 * Crea una cita de prueba para poder probar el flujo de confirmación
 * de inmediato, sin tener que usar el panel admin.
 *
 * Uso:  npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

function generateAppointmentToken(): string {
  const ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  const bytes = crypto.randomBytes(24);
  let value = BigInt("0x" + bytes.toString("hex"));
  let out = "";
  const base = BigInt(ALPHABET.length);
  while (value > 0n) {
    out = ALPHABET[Number(value % base)] + out;
    value = value / base;
  }
  return out;
}

async function main() {
  const timezone = "America/Mexico_City";
  const appointmentDate = new Date();
  appointmentDate.setDate(appointmentDate.getDate() + 3);
  appointmentDate.setHours(11, 0, 0, 0);

  const displayDate = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: timezone,
  }).format(appointmentDate);

  const displayTime = new Intl.DateTimeFormat("es-MX", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: timezone,
  }).format(appointmentDate);

  const token = generateAppointmentToken();

  const appointment = await prisma.appointment.create({
    data: {
      token,
      clientName: "Cliente de Prueba",
      clientEmail: "cliente.prueba@example.com",
      clientPhone: "+52 55 0000 0000",
      advisorName: "José Eduardo Aguirre",
      appointmentDate,
      displayDate: displayDate.charAt(0).toUpperCase() + displayDate.slice(1),
      displayTime,
      timezone,
      zoomLink: "https://zoom.us/j/1234567890",
    },
  });

  console.log("\n✅ Cita de prueba creada.\n");
  console.log("Link de confirmación:");
  console.log(`${process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"}/confirmar/${appointment.token}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
