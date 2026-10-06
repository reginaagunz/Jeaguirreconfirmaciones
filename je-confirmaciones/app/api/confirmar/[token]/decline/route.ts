import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTeamDeclinedEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: { token: string } }) {
  const appointment = await prisma.appointment.findUnique({
    where: { token: params.token },
  });

  if (!appointment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (appointment.status === "CONFIRMED") {
    return NextResponse.json({ error: "already_confirmed" }, { status: 409 });
  }

  const updated =
    appointment.status === "DECLINED"
      ? appointment
      : await prisma.appointment.update({
          where: { token: params.token },
          data: { status: "DECLINED" },
        });

  try {
    await sendTeamDeclinedEmail(updated);
  } catch (err) {
    console.error("[decline] error enviando correo:", err);
  }

  return NextResponse.json({ status: updated.status });
}
