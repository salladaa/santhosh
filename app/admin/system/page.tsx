import { requirePage } from "@/lib/auth";
import { systemStatus } from "@/lib/system";
import { PageHeading, Stat } from "@/components/ui";
import { dateTimeLabel } from "@/lib/format";
export default async function SystemPage() {
  await requirePage("admin");
  const status = systemStatus();
  return (
    <>
      <PageHeading
        eyebrow="BACKEND & DATABASE / డేటాబేస్"
        title="System status"
        description="Live information read directly from the server database. Refresh this page after creating a record to see the counts change."
      />
      <div className="stats-grid three">
        <Stat
          label="Database"
          value={status.healthy ? "Healthy" : "Needs attention"}
          note={`SQLite · Schema ${status.schemaVersion}`}
          icon="activity"
        />
        <Stat
          label="Report files"
          value={status.counts.reports}
          note="Private, authenticated downloads"
          icon="file"
        />
        <Stat
          label="Audit events"
          value={status.counts.audit_events}
          note="Clinical access and operational changes"
          icon="clock"
        />
      </div>
      <section className="panel workflow-panel">
        <h2>Deployment checks</h2>
        <div className="status-row">
          <span>Environment</span>
          <strong>
            {status.demo
              ? "DEMO — sample data only"
              : "Configured hospital instance"}
          </strong>
        </div>
        <div className="status-row">
          <span>Production report encryption key</span>
          <strong>
            {status.reportEncryptionConfigured
              ? "Configured"
              : "Not configured (demo uses a local key)"}
          </strong>
        </div>
        <div className="status-row">
          <span>Public origin</span>
          <strong>
            {status.originConfigured
              ? "Configured"
              : "Not configured — local development"}
          </strong>
        </div>
        <div className="status-row">
          <span>Encrypted backup key</span>
          <strong>
            {status.backupKeyConfigured ? "Configured" : "Not configured"}
          </strong>
        </div>
        <div className="status-row">
          <span>Latest successful backup</span>
          <strong>
            {status.lastBackup
              ? dateTimeLabel(status.lastBackup)
              : "No backup recorded"}
          </strong>
        </div>
        <div className="status-row">
          <span>Currency / time zone</span>
          <strong>INR / Asia/Kolkata</strong>
        </div>
        <p className="patient-help">
          These checks show software configuration, not hospital certification.
          Cloud deployment, backup scheduling, restore verification, access
          review and staff acceptance testing are required before live use.
        </p>
      </section>
      <section className="panel workflow-panel" style={{ marginTop: 24 }}>
        <h2>Stored records</h2>
        {Object.entries(status.counts).map(([name, count]) => (
          <div className="status-row" key={name}>
            <span>{name.replaceAll("_", " ")}</span>
            <strong>{count}</strong>
          </div>
        ))}
        <p className="muted">Checked {dateTimeLabel(status.checkedAt)} IST</p>
      </section>
    </>
  );
}
