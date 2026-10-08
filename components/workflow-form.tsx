"use client";
import { useState } from "react";
import { request } from "@/lib/client";
import { T } from "./language";
export function WorkflowForm({
  url,
  method = "POST",
  payload,
  children,
  label = "Save",
  onSuccess,
  beforeSubmit,
}: {
  url: string;
  method?: string;
  payload: (data: FormData) => unknown;
  children: React.ReactNode;
  label?: string;
  onSuccess?: () => void;
  beforeSubmit?: (data: FormData) => boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="workflow-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        if (beforeSubmit && !beforeSubmit(data)) return;
        setBusy(true);
        setError("");
        try {
          await request(url, method, payload(data));
          if (onSuccess) {
            onSuccess();
            setBusy(false);
          } else window.location.reload();
        } catch (e) {
          setError(
            e instanceof Error &&
              (e.name === "TimeoutError" || e.name === "AbortError")
              ? "Save not confirmed. Check the latest queue status before retrying."
              : e instanceof Error
                ? e.message
                : "Unable to save.",
          );
          setBusy(false);
        }
      }}
    >
      <fieldset disabled={busy}>{children}</fieldset>
      {error && (
        <p className="error-box" role="alert">
          {error}
        </p>
      )}
      <button className="button primary" disabled={busy}>
        <T>{busy ? "Saving…" : label}</T>
      </button>
    </form>
  );
}
export const value = (data: FormData, key: string) =>
  String(data.get(key) || "");
export function Field({
  label,
  name,
  type = "text",
  required = true,
  placeholder,
  maxLength = 500,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  return (
    <label>
      <T>{label}</T>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        maxLength={maxLength}
        step={type === "number" ? "0.01" : undefined}
        min={type === "number" ? "0.01" : undefined}
      />
    </label>
  );
}
export function TextArea({
  label,
  name,
  required = true,
}: {
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <label>
      <T>{label}</T>
      <textarea name={name} required={required} maxLength={5000} rows={3} />
    </label>
  );
}
