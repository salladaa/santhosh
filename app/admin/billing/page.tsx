import { requirePage } from "@/lib/auth";
import { listPatients } from "@/lib/db";
import { invoices } from "@/lib/care";
import { money } from "@/lib/format";
import { PageHeading, Stat } from "@/components/ui";
import { BillingWorkspace } from "@/components/billing-workspace";
export default async function BillingPage() {
  await requirePage("admin");
  const records = invoices(),
    total = records.reduce((s, i) => s + i.totalPaise, 0),
    paid = records.reduce((s, i) => s + i.paidPaise, 0);
  return (
    <>
      <PageHeading
        eyebrow="ACCOUNTS / బిల్లులు"
        title="Billing"
        description="Itemised invoices and recorded payments in Indian rupees. Original patient balance fields remain historical and are not counted here."
      />
      <section className="stats-grid three">
        <Stat
          label="Invoices"
          value={records.length}
          note="Numbered hospital invoices"
          icon="file"
        />
        <Stat
          label="Payments received"
          value={money(paid / 100)}
          note="Recorded receipts · INR"
          icon="wallet"
        />
        <Stat
          label="Outstanding"
          value={money((total - paid) / 100)}
          note="Remaining invoice balances · INR"
          icon="clock"
        />
      </section>
      <BillingWorkspace
        invoices={records}
        patients={listPatients().map((p) => ({ id: p.id, name: p.name }))}
      />
    </>
  );
}
