import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildIcsForAppointment } from "@/lib/ics";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const appointment = await prisma.appointment.findUnique({
    where: { token: params.token },
  });

  if (!appointment || appointment.status !== "CONFIRMED") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const ics = buildIcsForAppointment(appointment);

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="cita-je-aguirre.ics"`,
    },
  });
}
