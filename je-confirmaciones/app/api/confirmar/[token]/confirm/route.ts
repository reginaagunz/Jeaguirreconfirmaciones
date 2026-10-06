import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendTeamConfirmedEmail, sendClientConfirmedEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

// El cliente NUNCA envía datos de la cita en esta petición: solo el token va
// en la URL. Todo lo demás (nombre, fecha, zoom, etc.) se lee del servidor,
// así que no hay forma de que alguien "confirme" una cita distinta o
// modifique sus datos cambiando parámetros del navegador.
export async function POST(_req: NextRequest, { params }: { params: { token: string } }) {
  const appointment = await prisma.appointment.findUnique({
    where: { token: params.token },
  });

  if (!appointment) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Si ya estaba confirmada (doble clic, recarga), respondemos con éxito de
  // forma idempotente en vez de fallar.
  if (appointment.status === "DECLINED") {
    return NextResponse.json({ error: "already_declined" }, { status: 409 });
  }

  const updated =
    appointment.status === "CONFIRMED"
      ? appointment
      : await prisma.appointment.update({
          where: { token: params.token },
          data: { status: "CONFIRMED", confirmedAt: new Date() },
        });

  // El correo nunca debe tumbar la confirmación: si Gmail falla, igual
  // dejamos la cita confirmada y solo lo registramos en el servidor.
  try {
    await Promise.all([
      sendTeamConfirmedEmail(updated),
      sendClientConfirmedEmail(updated),
    ]);
  } catch (err) {
    console.error("[confirm] error enviando correos:", err);
  }

  return NextResponse.json({ status: updated.status, zoomLink: updated.zoomLink });
}
