import type React from "react";
import { prisma } from "@/lib/prisma";
import ConfirmClient, { type PublicAppointment } from "./ConfirmClient";
import Image from "next/image";

// Siempre se consulta la cita en el momento (nunca se cachea una respuesta
// vieja), porque el estado puede cambiar entre visitas.
export const dynamic = "force-dynamic";

export default async function ConfirmarPage({
  params,
}: {
  params: { token: string };
}) {
  const appointment = await prisma.appointment.findUnique({
    where: { token: params.token },
  });

  if (!appointment) {
    return <NotFoundState />;
  }

  // No exponemos el enlace de Zoom hasta que la cita esté confirmada.
  const publicAppointment: PublicAppointment = {
    clientName: appointment.clientName,
    advisorName: appointment.advisorName,
    displayDate: appointment.displayDate,
    displayTime: appointment.displayTime,
    timezone: appointment.timezone,
    status: appointment.status,
    zoomLink: appointment.status === "CONFIRMED" ? appointment.zoomLink : null,
    token: appointment.token,
  };

  return (
    <main style={pageStyle}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <Header />
        <ConfirmClient initial={publicAppointment} />
      </div>
    </main>
  );
}

function NotFoundState() {
  return (
    <main style={pageStyle}>
      <div style={{ width: "100%", maxWidth: 420, textAlign: "center" }}>
        <Header />
        <div style={cardStyle}>
          <p className="serif" style={{ fontSize: 21, margin: "0 0 10px 0" }}>
            Este enlace ya no está disponible
          </p>
          <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.6, margin: 0 }}>
            No pudimos encontrar una cita asociada a este link. Si crees que esto es un error,
            contáctanos y con gusto te ayudamos.
          </p>
        </div>
      </div>
    </main>
  );
}

function Header() {
  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
      <Image
        src="/logo-vertical.png"
        alt="JE Aguirre Consultores"
        width={120}
        height={140}
        priority
        style={{ height: 92, width: "auto" }}
      />
    </div>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "48px 20px",
  background:
    "radial-gradient(120% 90% at 50% -10%, #eef4f1 0%, var(--bg) 55%)",
};

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 20,
  padding: "32px 28px",
  boxShadow: "var(--shadow-card)",
};
