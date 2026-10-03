"use client";
import { useState } from "react";
import { WorkflowForm, Field, value } from "./workflow-form";
export function AccountForm() {
  const [done, setDone] = useState(false);
  return (
    <section className="panel workflow-panel">
      {done ? (
        <p role="status" className="success-box">
          Password changed. Other sessions have been signed out. / పాస్‌వర్డ్
          మార్చబడింది.
        </p>
      ) : (
        <WorkflowForm
          url="/api/account/password"
          label="Change password"
          onSuccess={() => setDone(true)}
          payload={(d) => {
            if (value(d, "newPassword") !== value(d, "confirmPassword"))
              throw new Error("New passwords do not match.");
            return {
              currentPassword: value(d, "currentPassword"),
              newPassword: value(d, "newPassword"),
            };
          }}
        >
          <Field
            name="currentPassword"
            label="Current password"
            type="password"
            maxLength={128}
          />
          <Field
            name="newPassword"
            label="New password"
            type="password"
            maxLength={128}
          />
          <Field
            name="confirmPassword"
            label="Confirm password"
            type="password"
            maxLength={128}
          />
          <p className="muted">
            At least 12 characters. This will sign out your other devices.
          </p>
        </WorkflowForm>
      )}
    </section>
  );
}
