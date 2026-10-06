import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { formatDisplayDate, formatDisplayTime } from "@/lib/format";
import { zonedTimeToUtc } from "@/lib/timezone";

export const dynamic = "force-dynamic";

type UpdateBody = {
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  advisorName?: string;
  date?: string;
  time?: string;
  timezone?: string;
  zoomLink?: string;
  status?: "PENDING" | "CONFIRMED" | "DECLINED";
};

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.appointment.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  let body: UpdateBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};

  if (body.clientName !== undefined) data.clientName = body.clientName.trim();
  if (body.clientEmail !== undefined) data.clientEmail = body.clientEmail.trim().toLowerCase();
  if (body.clientPhone !== undefined) data.clientPhone = body.clientPhone.trim() || null;
  if (body.advisorName !== undefined) data.advisorName = body.advisorName.trim();
  if (body.zoomLink !== undefined) data.zoomLink = body.zoomLink.trim();
  if (body.status !== undefined) data.status = body.status;

  const timezone = body.timezone?.trim() || existing.timezone;
  if (body.date || body.time || body.timezone) {
    const existingParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: existing.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    }).formatToParts(existing.appointmentDate);
    const getExisting = (type: string) => existingParts.find((p) => p.type === type)?.value ?? "";
    const datePart =
      body.date ?? `${getExisting("year")}-${getExisting("month")}-${getExisting("day")}`;
    const timePart = body.time ?? `${getExisting("hour")}:${getExisting("minute")}`;

    const newDate = zonedTimeToUtc(datePart, timePart, timezone);
    if (Number.isNaN(newDate.getTime())) {
      return NextResponse.json(
        { error: "validation_error", details: ["Fecha u hora inválida."] },
        { status: 422 }
      );
    }
    data.appointmentDate = newDate;
    data.displayDate = formatDisplayDate(newDate, timezone);
    data.displayTime = formatDisplayTime(newDate, timezone);
    data.timezone = timezone;
  }

  const updated = await prisma.appointment.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json({ appointment: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const existing = await prisma.appointment.findUnique({ where: { id: params.id } });
  if (!existing) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  await prisma.appointment.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
