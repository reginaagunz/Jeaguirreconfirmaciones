"use client";

import type React from "react";

import { useState } from "react";

export type AppointmentFormValues = {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  advisorName: string;
  date: string;
  time: string;
  timezone: string;
  zoomLink: string;
};

const emptyValues: AppointmentFormValues = {
  clientName: "",
  clientEmail: "",
  clientPhone: "",
  advisorName: "",
  date: "",
  time: "",
  timezone: "America/Mexico_City",
  zoomLink: "",
};

export default function AppointmentFormModal({
  initial,
  title,
  onClose,
  onSubmit,
}: {
  initial?: Partial<AppointmentFormValues>;
  title: string;
  onClose: () => void;
  onSubmit: (values: AppointmentFormValues) => Promise<string[] | void>;
}) {
  const [values, setValues] = useState<AppointmentFormValues>({
    ...emptyValues,
    ...initial,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  function update<K extends keyof AppointmentFormValues>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrors([]);
    const result = await onSubmit(values);
    setSaving(false);
    if (result && result.length > 0) {
      setErrors(result);
    }
  }

  return (
    <div style={overlayStyle} onClick={onClose}>
      <form
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <p className="serif" style={{ fontSize: 19, margin: "0 0 18px 0" }}>
          {title}
        </p>

        <Field label="Nombre del cliente">
          <input
            required
            value={values.clientName}
            onChange={(e) => update("clientName", e.target.value)}
            style={inputStyle}
          />
        </Field>

        <Field label="Email del cliente">
          <input
            required
            type="email"
            value={values.clientEmail}
            onChange={(e) => update("clientEmail", e.target.value)}
            style={inputStyle}
          />
        </Field>

        <Field label="Teléfono (opcional)">
          <input
            value={values.clientPhone}
            onChange={(e) => update("clientPhone", e.target.value)}
            style={inputStyle}
          />
        </Field>

        <Field label="Asesor">
          <input
            required
            value={values.advisorName}
            onChange={(e) => update("advisorName", e.target.value)}
            style={inputStyle}
          />
        </Field>

        <div style={{ display: "flex", gap: 10 }}>
          <Field label="Fecha" style={{ flex: 1 }}>
            <input
              required
              type="date"
              value={values.date}
              onChange={(e) => update("date", e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="Hora" style={{ flex: 1 }}>
            <input
              required
              type="time"
              value={values.time}
              onChange={(e) => update("time", e.target.value)}
              style={inputStyle}
            />
          </Field>
        </div>

        <Field label="Zona horaria">
          <select
            value={values.timezone}
            onChange={(e) => update("timezone", e.target.value)}
            style={inputStyle}
          >
            <option value="America/Mexico_City">Ciudad de México</option>
            <option value="America/Tijuana">Tijuana</option>
            <option value="America/Monterrey">Monterrey</option>
            <option value="America/Cancun">Cancún</option>
            <option value="America/Bogota">Bogotá</option>
            <option value="America/New_York">Nueva York</option>
            <option value="America/Los_Angeles">Los Ángeles</option>
          </select>
        </Field>

        <Field label="Enlace de Zoom">
          <input
            required
            type="url"
            placeholder="https://zoom.us/j/..."
            value={values.zoomLink}
            onChange={(e) => update("zoomLink", e.target.value)}
            style={inputStyle}
          />
        </Field>

        {errors.length > 0 && (
          <ul style={{ color: "var(--decline-ink)", fontSize: 13, margin: "4px 0 14px 0", paddingLeft: 18 }}>
            {errors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button type="button" onClick={onClose} style={secondaryBtn}>
            Cancelar
          </button>
          <button type="submit" disabled={saving} style={primaryBtn}>
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  children,
  style,
}: {
  label: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={{ marginBottom: 14, ...style }}>
      <label style={{ display: "block", fontSize: 12.5, color: "var(--ink-soft)", marginBottom: 5 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(32,36,43,0.45)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  padding: 0,
  zIndex: 50,
};

const modalStyle: React.CSSProperties = {
  background: "var(--surface)",
  borderRadius: "18px 18px 0 0",
  padding: "26px 22px 22px 22px",
  width: "100%",
  maxWidth: 480,
  maxHeight: "88dvh",
  overflowY: "auto",
  boxShadow: "var(--shadow-card)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "11px 12px",
  borderRadius: 9,
  border: "1px solid var(--line)",
  fontSize: 14.5,
  background: "#fff",
};

const primaryBtn: React.CSSProperties = {
  flex: 1,
  padding: "13px 16px",
  background: "linear-gradient(135deg, var(--teal-deep), var(--indigo-deep))",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  fontSize: 14.5,
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryBtn: React.CSSProperties = {
  flex: 1,
  padding: "13px 16px",
  background: "transparent",
  color: "var(--ink-soft)",
  border: "1px solid var(--line)",
  borderRadius: 10,
  fontSize: 14.5,
  cursor: "pointer",
};
