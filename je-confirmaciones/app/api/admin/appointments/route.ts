import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateAppointmentToken } from "@/lib/token";
import { formatDisplayDate, formatDisplayTime } from "@/lib/format";
import { zonedTimeToUtc } from "@/lib/timezone";

export const dynamic = "force-dynamic";

// La autenticación de admin ya se validó en middleware.ts para todo lo que
// cuelga de /api/admin/appointments — aquí solo validamos la forma de los
// datos.

export async function GET() {
  const appointments = await prisma.appointment.findMany({
    orderBy: { appointmentDate: "desc" },
  });
  return NextResponse.json({ appointments });
}

type CreateBody = {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  advisorName?: string;
  date?: string; // "YYYY-MM-DD"
  time?: string; // "HH:MM" (24h)
  timezone?: string;
  zoomLink?: string;
};

export async function POST(req: NextRequest) {
  let body: CreateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const errors = validate(body);
  if (errors.length > 0) {
    return NextResponse.json({ error: "validation_error", details: errors }, { status: 422 });
  }

  const timezone = body.timezone?.trim() || "America/Mexico_City";
  const appointmentDate = zonedTimeToUtc(body.date!, body.time!, timezone);

  if (Number.isNaN(appointmentDate.getTime())) {
    return NextResponse.json(
      { error: "validation_error", details: ["Fecha u hora inválida."] },
      { status: 422 }
    );
  }

  const token = await uniqueToken();

  const appointment = await prisma.appointment.create({
    data: {
      token,
      clientName: body.clientName!.trim(),
      clientEmail: body.clientEmail!.trim().toLowerCase(),
      clientPhone: body.clientPhone?.trim() || null,
      advisorName: body.advisorName!.trim(),
      appointmentDate,
      displayDate: formatDisplayDate(appointmentDate, timezone),
      displayTime: formatDisplayTime(appointmentDate, timezone),
      timezone,
      zoomLink: body.zoomLink!.trim(),
    },
  });

  return NextResponse.json({ appointment }, { status: 201 });
}

function validate(body: CreateBody): string[] {
  const errors: string[] = [];
  if (!body.clientName?.trim()) errors.push("El nombre del cliente es obligatorio.");
  if (!body.clientEmail?.trim() || !/^\S+@\S+\.\S+$/.test(body.clientEmail)) {
    errors.push("El email del cliente no es válido.");
  }
  if (!body.advisorName?.trim()) errors.push("El nombre del asesor es obligatorio.");
  if (!body.date) errors.push("La fecha es obligatoria.");
  if (!body.time) errors.push("La hora es obligatoria.");
  if (!body.zoomLink?.trim() || !/^https?:\/\//i.test(body.zoomLink.trim())) {
    errors.push("El enlace de Zoom debe ser una URL válida.");
  }
  return errors;
}

async function uniqueToken(): Promise<string> {
  for (let i = 0; i < 5; i++) {
    const token = generateAppointmentToken();
    const existing = await prisma.appointment.findUnique({ where: { token } });
    if (!existing) return token;
  }
  throw new Error("No se pudo generar un token único, intenta de nuevo.");
}
