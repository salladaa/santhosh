"use client";
import type { Staff } from "@/lib/types";
import { WorkflowForm, Field, value } from "./workflow-form";
import { T } from "./language";
export function StaffWorkspace({ staff }: { staff: Staff[] }) {
  return (
    <div className="workflow-stack">
      <details className="panel workflow-panel">
        <summary>
          <T>Create staff account</T>
        </summary>
        <WorkflowForm
          url="/api/staff"
          label="Create staff account"
          payload={(d) => ({
            name: value(d, "name"),
            email: value(d, "email"),
            password: value(d, "password"),
            registration: value(d, "registration"),
            role: value(d, "role"),
          })}
        >
          <div className="form-grid">
            <Field label="Full name" name="name" maxLength={100} />
            <Field
              label="Email address"
              name="email"
              type="email"
              maxLength={254}
            />
            <Field
              label="Password"
              name="password"
              type="password"
              maxLength={128}
            />
            <label>
              <T>Role</T>
              <select name="role">
                <option value="doctor">Doctor / వైద్యుడు</option>
                <option value="nurse">Nurse / నర్సు</option>
                <option value="reception">Reception / రిసెప్షన్</option>
                <option value="lab">Lab technician / ల్యాబ్ టెక్నీషియన్</option>
                <option value="pharmacy">Pharmacy / ఫార్మసీ</option>
              </select>
            </label>
            <Field
              label="Registration number"
              required={false}
              name="registration"
              maxLength={100}
            />
          </div>
          <p className="muted">
            Use 12+ characters. Share credentials privately. Staff can change
            their password from Account.
          </p>
        </WorkflowForm>
      </details>
      <section className="panel workflow-panel">
        <h2>
          <T>Staff</T>
        </h2>
        {staff.map((s) => (
          <div className="workflow-card" key={s.id}>
            <h3>
              {s.name} · {s.role}
            </h3>
            <p>{s.email}</p>
            <p className="muted">
              {s.registration} · <T>{s.active ? "Active" : "Inactive"}</T>
            </p>
            {s.role !== "admin" && (
              <WorkflowForm
                url={`/api/staff/${s.id}`}
                method="PUT"
                payload={() => ({ active: !s.active })}
                label={s.active ? "Disable" : "Enable"}
              >
                <span className="muted">
                  Disabling an account immediately signs out its sessions.
                </span>
              </WorkflowForm>
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
