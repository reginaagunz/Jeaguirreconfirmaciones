"use client";

import type React from "react";

import { useState } from "react";

export type PublicAppointment = {
  token: string;
  clientName: string;
  advisorName: string;
  displayDate: string;
  displayTime: string;
  timezone: string;
  status: "PENDING" | "CONFIRMED" | "DECLINED";
  zoomLink: string | null;
};

type ViewState = "pending" | "working" | "confirmed" | "declined" | "error";

export default function ConfirmClient({ initial }: { initial: PublicAppointment }) {
  const [appointment, setAppointment] = useState(initial);
  const [view, setView] = useState<ViewState>(
    initial.status === "CONFIRMED"
      ? "confirmed"
      : initial.status === "DECLINED"
      ? "declined"
      : "pending"
  );
  const [pendingAction, setPendingAction] = useState<"confirm" | "decline" | null>(null);

  async function handleConfirm() {
    setPendingAction("confirm");
    setView("working");
    try {
      const res = await fetch(`/api/confirmar/${appointment.token}/confirm`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("request-failed");
      const data = await res.json();
      setAppointment((prev) => ({ ...prev, status: "CONFIRMED", zoomLink: data.zoomLink }));
      // Pequeña pausa para que la transición se sienta intencional, no abrupta.
      setTimeout(() => setView("confirmed"), 300);
    } catch {
      setView("error");
    } finally {
      setPendingAction(null);
    }
  }

  async function handleDecline() {
    setPendingAction("decline");
    setView("working");
    try {
      const res = await fetch(`/api/confirmar/${appointment.token}/decline`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("request-failed");
      setAppointment((prev) => ({ ...prev, status: "DECLINED" }));
      setTimeout(() => setView("declined"), 300);
    } catch {
      setView("error");
    } finally {
      setPendingAction(null);
    }
  }

  if (view === "confirmed") return <ConfirmedScreen appointment={appointment} />;
  if (view === "declined") return <DeclinedScreen appointment={appointment} />;
  if (view === "error") return <ErrorScreen onRetry={() => setView("pending")} />;

  return (
    <PendingScreen
      appointment={appointment}
      working={view === "working"}
      pendingAction={pendingAction}
      onConfirm={handleConfirm}
      onDecline={handleDecline}
    />
  );
}

function PendingScreen({
  appointment,
  working,
  pendingAction,
  onConfirm,
  onDecline,
}: {
  appointment: PublicAppointment;
  working: boolean;
  pendingAction: "confirm" | "decline" | null;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  return (
    <div className="fade-in" style={cardStyle}>
      <p className="serif" style={{ fontSize: 22, margin: "0 0 6px 0" }}>
        Tu cita está reservada
      </p>
      <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.6, margin: "0 0 24px 0" }}>
        Hola, {appointment.clientName}. Tenemos reservado este espacio para ti. Confirma tu
        asistencia para mantener tu cita agendada.
      </p>

      <dl style={detailsGridStyle}>
        <Detail label="Fecha" value={appointment.displayDate} />
        <Detail label="Hora" value={`${appointment.displayTime} (${appointment.timezone})`} />
        <Detail label="Modalidad" value="Reunión por Zoom" />
        <Detail label="Asesor" value={appointment.advisorName} />
      </dl>

      <button
        onClick={onConfirm}
        disabled={working}
        style={primaryButtonStyle}
        aria-busy={pendingAction === "confirm"}
      >
        {pendingAction === "confirm" ? "Confirmando…" : "Confirmar mi asistencia"}
      </button>
      <button
        onClick={onDecline}
        disabled={working}
        style={secondaryButtonStyle}
        aria-busy={pendingAction === "decline"}
      >
        {pendingAction === "decline" ? "Un momento…" : "No podré asistir"}
      </button>
    </div>
  );
}

function ConfirmedScreen({ appointment }: { appointment: PublicAppointment }) {
  const icsUrl = `/api/ics/${appointment.token}`;
  return (
    <div className="fade-in-up" style={cardStyle}>
      <div style={checkBadgeStyle}>✓</div>
      <p className="serif" style={{ fontSize: 22, margin: "0 0 6px 0" }}>
        Asistencia confirmada
      </p>
      <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.6, margin: "0 0 24px 0" }}>
        Gracias por confirmar tu cita con JE Aguirre Consultores.
      </p>

      <dl style={detailsGridStyle}>
        <Detail label="Fecha" value={appointment.displayDate} />
        <Detail label="Hora" value={`${appointment.displayTime} (${appointment.timezone})`} />
        <Detail label="Modalidad" value="Reunión por Zoom" />
      </dl>

      {appointment.zoomLink && (
        <a href={appointment.zoomLink} style={{ ...primaryButtonStyle, ...linkButtonStyle }}>
          Entrar a la reunión
        </a>
      )}
      <a href={icsUrl} style={{ ...secondaryButtonStyle, ...linkButtonStyle }} download>
        Agregar a mi calendario
      </a>
    </div>
  );
}

function DeclinedScreen({ appointment }: { appointment: PublicAppointment }) {
  const waNumber = process.env.NEXT_PUBLIC_TEAM_WHATSAPP_NUMBER;
  const waMessage = encodeURIComponent(
    `Hola, soy ${appointment.clientName}. Me gustaría reagendar mi cita.`
  );
  return (
    <div className="fade-in-up" style={cardStyle}>
      <p className="serif" style={{ fontSize: 22, margin: "0 0 6px 0" }}>
        Gracias por avisarnos
      </p>
      <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.6, margin: "0 0 4px 0" }}>
        No te preocupes. Hemos registrado que no podrás asistir a esta cita.
      </p>
      <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.6, margin: "0 0 24px 0" }}>
        Nuestro equipo se pondrá en contacto contigo para ayudarte a encontrar un nuevo horario.
      </p>
      {waNumber && (
        <a
          href={`https://wa.me/${waNumber}?text=${waMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...primaryButtonStyle, ...linkButtonStyle }}
        >
          Contactar a JE Aguirre
        </a>
      )}
    </div>
  );
}

function ErrorScreen({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="fade-in" style={cardStyle}>
      <p className="serif" style={{ fontSize: 21, margin: "0 0 10px 0" }}>
        No pudimos procesar tu respuesta
      </p>
      <p style={{ color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.6, margin: "0 0 22px 0" }}>
        Ocurrió un problema inesperado. Por favor intenta de nuevo en unos segundos.
      </p>
      <button onClick={onRetry} style={primaryButtonStyle}>
        Volver a intentar
      </button>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <dt
        style={{
          fontSize: 11,
          letterSpacing: "0.06em",
          color: "var(--ink-faint)",
          marginBottom: 3,
        }}
      >
        {label.toUpperCase()}
      </dt>
      <dd style={{ margin: 0, fontSize: 16, color: "var(--ink)" }}>{value}</dd>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 20,
  padding: "32px 28px",
  boxShadow: "var(--shadow-card)",
};

const detailsGridStyle: React.CSSProperties = {
  margin: "0 0 26px 0",
  padding: "20px 20px 6px 20px",
  background: "var(--bg)",
  borderRadius: 14,
  border: "1px solid var(--line)",
};

const primaryButtonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "center",
  padding: "16px 20px",
  background: "linear-gradient(135deg, var(--teal-deep), var(--indigo-deep))",
  color: "#fff",
  border: "none",
  borderRadius: 12,
  fontSize: 16,
  fontWeight: 600,
  cursor: "pointer",
  marginBottom: 12,
  transition: "transform 0.15s ease, opacity 0.15s ease",
};

const secondaryButtonStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  textAlign: "center",
  padding: "15px 20px",
  background: "transparent",
  color: "var(--ink-soft)",
  border: "1px solid var(--line)",
  borderRadius: 12,
  fontSize: 15,
  fontWeight: 500,
  cursor: "pointer",
  textDecoration: "none",
};

const linkButtonStyle: React.CSSProperties = {
  textDecoration: "none",
  boxSizing: "border-box",
};

const checkBadgeStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: "50%",
  background: "var(--teal)",
  color: "#fff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 20,
  marginBottom: 16,
};
