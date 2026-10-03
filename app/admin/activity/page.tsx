import { requirePage } from "@/lib/auth";
import { auditEvents } from "@/lib/system";
import { activity } from "@/lib/db";
import { PageHeading, Empty } from "@/components/ui";
import { dateTimeLabel } from "@/lib/format";
export default async function ActivityPage() {
  await requirePage("admin");
  const events = auditEvents(),
    previous = activity();
  return (
    <>
      <PageHeading
        eyebrow="AUDIT / కార్యాచరణ"
        title="Activity log"
        description="Recent clinical record access, report downloads and operational changes. Staff identities and times are recorded on the server."
      />
      <section className="panel">
        {events.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Resource</th>
                  <th>Staff / patient</th>
                  <th>Time (IST)</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id}>
                    <td>{e.action}</td>
                    <td>
                      {e.resourceType} · {e.resourceId.slice(0, 8)}
                    </td>
                    <td>{e.actor}</td>
                    <td>{dateTimeLabel(e.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No records yet"
            text="Clinical access and changes will appear here."
          />
        )}
      </section>
      <section className="panel workflow-panel" style={{ marginTop: 24 }}>
        <h2>Patient registration changes</h2>
        {previous.map((e) => (
          <div className="status-row" key={e.id}>
            <span>
              {e.action} · {e.subject}
            </span>
            <span>
              {e.actor} · {dateTimeLabel(e.createdAt)}
            </span>
          </div>
        ))}
      </section>
    </>
  );
}
