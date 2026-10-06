"use client";

import type React from "react";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import AppointmentFormModal, { type AppointmentFormValues } from "./AppointmentFormModal";

type Status = "PENDING" | "CONFIRMED" | "DECLINED";

type Appointment = {
  id: string;
  token: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  advisorName: string;
  appointmentDate: string;
  displayDate: string;
  displayTime: string;
  timezone: string;
  zoomLink: string;
  status: Status;
};

const statusLabel: Record<Status, string> = {
  PENDING: "Pendiente",
  CONFIRMED: "Confirmada",
  DECLINED: "No podrá asistir",
};

const statusColor: Record<Status, { bg: string; fg: string }> = {
  PENDING: { bg: "#F2EFE6", fg: "#7A7360" },
  CONFIRMED: { bg: "#E5F1EF", fg: "#146B64" },
  DECLINED: { bg: "#F4E9E3", fg: "#8A5A44" },
};

export default function DashboardClient() {
  const router = useRouter();
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState("");

  useEffect(() => {
    setBaseUrl(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/appointments");
    if (res.status === 401) {
      router.push("/admin");
      return;
    }
    const data = await res.json();
    setAppointments(data.appointments);
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin");
  }

  async function handleCreate(values: AppointmentFormValues) {
    const res = await fetch("/api/admin/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.details ?? ["No se pudo crear la cita. Intenta de nuevo."];
    }
    setShowCreate(false);
    load();
  }

  async function handleEdit(values: AppointmentFormValues) {
    if (!editing) return;
    const res = await fetch(`/api/admin/appointments/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return data.details ?? ["No se pudo guardar. Intenta de nuevo."];
    }
    setEditing(null);
    load();
  }

  function toDateTimeInputs(isoDate: string, timezone: string) {
    const date = new Date(isoDate);
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
    return {
      date: `${get("year")}-${get("month")}-${get("day")}`,
      time: `${get("hour")}:${get("minute")}`,
    };
  }

  function confirmationLink(a: Appointment) {
    return `${baseUrl}/confirmar/${a.token}`;
  }

  function copyLink(a: Appointment) {
    navigator.clipboard.writeText(confirmationLink(a));
    setCopiedId(a.id);
    setTimeout(() => setCopiedId(null), 1800);
  }

  function copyWhatsappMessage(a: Appointment) {
    const message = `Hola ${a.clientName}, te compartimos el enlace para confirmar tu asistencia a tu próxima reunión con JE Aguirre Consultores:\n\n${confirmationLink(
      a
    )}\n\nTe tomará menos de un minuto. ¡Gracias!`;
    navigator.clipboard.writeText(message);
    setCopiedId(`${a.id}-wa`);
    setTimeout(() => setCopiedId(null), 1800);
  }

  return (
    <main style={{ minHeight: "100dvh", background: "var(--bg)", paddingBottom: 60 }}>
      <header style={headerStyle}>
        <Image
          src="/logo-horizontal.jpeg"
          alt="JE Aguirre Consultores"
          width={180}
          height={54}
          style={{ height: 36, width: "auto" }}
        />
        <button onClick={handleLogout} style={logoutBtnStyle}>
          Cerrar sesión
        </button>
      </header>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "0 20px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            margin: "28px 0 20px 0",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <p className="serif" style={{ fontSize: 22, margin: 0 }}>
            Citas
          </p>
          <button onClick={() => setShowCreate(true)} style={primaryBtnStyle}>
            + Nueva cita
          </button>
        </div>

        {appointments === null && <p style={{ color: "var(--ink-soft)" }}>Cargando…</p>}

        {appointments && appointments.length === 0 && (
          <div style={emptyStateStyle}>
            <p style={{ margin: 0, color: "var(--ink-soft)" }}>
              Todavía no hay citas registradas. Crea la primera con el botón de arriba.
            </p>
          </div>
        )}

        {appointments && appointments.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {["Cliente", "Fecha", "Hora", "Asesor", "Estado", "Acciones"].map((h) => (
                    <th key={h} style={thStyle}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {appointments.map((a) => (
                  <tr key={a.id} style={{ borderTop: "1px solid var(--line)" }}>
                    <td style={tdStyle}>
                      <div style={{ fontWeight: 600 }}>{a.clientName}</div>
                      <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>{a.clientEmail}</div>
                    </td>
                    <td style={tdStyle}>{a.displayDate}</td>
                    <td style={tdStyle}>{a.displayTime}</td>
                    <td style={tdStyle}>{a.advisorName}</td>
                    <td style={tdStyle}>
                      <span
                        style={{
                          background: statusColor[a.status].bg,
                          color: statusColor[a.status].fg,
                          padding: "4px 10px",
                          borderRadius: 999,
                          fontSize: 12.5,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {statusLabel[a.status]}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, minWidth: 220 }}>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <button onClick={() => copyLink(a)} style={smallBtnStyle}>
                          {copiedId === a.id ? "¡Copiado!" : "Copiar link"}
                        </button>
                        <button onClick={() => copyWhatsappMessage(a)} style={smallBtnStyle}>
                          {copiedId === `${a.id}-wa` ? "¡Copiado!" : "Mensaje WhatsApp"}
                        </button>
                        <button onClick={() => setEditing(a)} style={smallBtnStyle}>
                          Editar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <AppointmentFormModal
          title="Nueva cita"
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}

      {editing && (
        <AppointmentFormModal
          title={`Editar cita — ${editing.clientName}`}
          initial={{
            clientName: editing.clientName,
            clientEmail: editing.clientEmail,
            clientPhone: editing.clientPhone ?? "",
            advisorName: editing.advisorName,
            ...toDateTimeInputs(editing.appointmentDate, editing.timezone),
            timezone: editing.timezone,
            zoomLink: editing.zoomLink,
          }}
          onClose={() => setEditing(null)}
          onSubmit={handleEdit}
        />
      )}
    </main>
  );
}

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "16px 20px",
  background: "var(--surface)",
  borderBottom: "1px solid var(--line)",
};

const logoutBtnStyle: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--line)",
  borderRadius: 8,
  padding: "8px 14px",
  fontSize: 13,
  color: "var(--ink-soft)",
  cursor: "pointer",
};

const primaryBtnStyle: React.CSSProperties = {
  background: "linear-gradient(135deg, var(--teal-deep), var(--indigo-deep))",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  padding: "11px 18px",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
};

const smallBtnStyle: React.CSSProperties = {
  background: "var(--bg)",
  border: "1px solid var(--line)",
  borderRadius: 7,
  padding: "6px 10px",
  fontSize: 12.5,
  color: "var(--ink)",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 14,
  overflow: "hidden",
  fontSize: 14,
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  fontSize: 12,
  letterSpacing: "0.04em",
  color: "var(--ink-faint)",
  background: "var(--bg)",
};

const tdStyle: React.CSSProperties = {
  padding: "12px 14px",
  verticalAlign: "top",
};

const emptyStateStyle: React.CSSProperties = {
  background: "var(--surface)",
  border: "1px dashed var(--line)",
  borderRadius: 14,
  padding: "40px 20px",
  textAlign: "center",
};
