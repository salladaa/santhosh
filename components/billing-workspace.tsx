"use client";
import { useState } from "react";
import type { Invoice } from "@/lib/types";
import type { Choice } from "./appointments";
import { WorkflowForm, Field, value } from "./workflow-form";
import { money, dateTimeLabel } from "@/lib/format";
import { T } from "./language";
export function BillingWorkspace({
  invoices,
  patients,
}: {
  invoices: Invoice[];
  patients: Choice[];
}) {
  const [items, setItems] = useState([{ description: "", amount: "" }]);
  return (
    <div className="workflow-stack">
      <details className="panel workflow-panel">
        <summary>
          <T>Create invoice</T>
        </summary>
        <WorkflowForm
          url="/api/invoices"
          label="Create invoice"
          payload={(d) => ({
            patientId: value(d, "patientId"),
            items: items.map((i) => ({ ...i, amount: Number(i.amount) })),
          })}
        >
          <label>
            <T>Patient</T>
            <select name="patientId" required>
              <option value="">Select patient</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          {items.map((item, index) => (
            <div className="form-grid" key={index}>
              <label>
                <T>Description</T>
                <input
                  required
                  maxLength={200}
                  value={item.description}
                  onChange={(e) =>
                    setItems(
                      items.map((i, j) =>
                        j === index ? { ...i, description: e.target.value } : i,
                      ),
                    )
                  }
                />
              </label>
              <label>
                <T>Amount (INR)</T>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="10000000"
                  value={item.amount}
                  onChange={(e) =>
                    setItems(
                      items.map((i, j) =>
                        j === index ? { ...i, amount: e.target.value } : i,
                      ),
                    )
                  }
                />
              </label>
              {items.length > 1 && (
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setItems(items.filter((_, j) => j !== index))}
                >
                  <T>Remove</T>
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="button secondary"
            disabled={items.length >= 50}
            onClick={() =>
              setItems([...items, { description: "", amount: "" }])
            }
          >
            <T>Add item</T>
          </button>
        </WorkflowForm>
      </details>
      <section className="panel workflow-panel">
        <div className="panel-heading">
          <h2>
            <T>Invoices</T>
          </h2>
          <button
            className="button secondary no-print"
            onClick={() => window.print()}
          >
            <T>Print</T>
          </button>
        </div>
        {invoices.map((i) => (
          <article className="workflow-card" key={i.id}>
            <h3>
              SAH-{String(i.number).padStart(6, "0")} · {i.patientName}
            </h3>
            <p className="muted">{dateTimeLabel(i.createdAt)} IST</p>
            {i.items.map((item, index) => (
              <p key={index}>
                {item.description} — {money(item.amount)}
              </p>
            ))}
            <p>
              <T>Paid</T>: {money(i.paidPaise / 100)} · <T>Outstanding</T>:{" "}
              <strong>{money((i.totalPaise - i.paidPaise) / 100)}</strong>
            </p>
            {i.paidPaise < i.totalPaise && (
              <details className="compact-details">
                <summary>
                  <T>Record payment</T>
                </summary>
                <WorkflowForm
                  url={`/api/invoices/${i.id}/payments`}
                  label="Record payment"
                  payload={(d) => ({
                    amount: Number(value(d, "amount")),
                    method: value(d, "method"),
                    reference: value(d, "reference"),
                  })}
                >
                  <div className="form-grid">
                    <Field label="Amount (INR)" name="amount" type="number" />
                    <label>
                      <T>Payment method</T>
                      <select name="method">
                        <option>Cash</option>
                        <option>UPI</option>
                        <option>Card</option>
                        <option>Bank transfer</option>
                      </select>
                    </label>
                    <Field
                      label="Transaction reference"
                      name="reference"
                      required={false}
                      maxLength={100}
                    />
                  </div>
                  <p className="muted">
                    Record money already received. This does not collect an
                    online payment.
                  </p>
                </WorkflowForm>
              </details>
            )}
          </article>
        ))}
        {!invoices.length && (
          <p className="muted">
            <T>No records yet</T>
          </p>
        )}
      </section>
    </div>
  );
}
