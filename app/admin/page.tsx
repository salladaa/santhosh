import Link from "next/link";
import { requirePage } from "@/lib/auth";
import { listPatients } from "@/lib/db";
import { appointments, invoices, doctors } from "@/lib/care";
import { admissions, beds } from "@/lib/inpatient";
import { money, dateTimeLabel } from "@/lib/format";
import { PageHeading, AddPatient, Stat, Badge, Empty } from "@/components/ui";
import { T } from "@/components/language";
export default async function Dashboard() {
  const user = await requirePage("staff"),
    patients = listPatients(),
    schedule = appointments(),
    ipd = admissions().filter((a) => !a.dischargedAt),
    bedList = beds();
  const upcoming = schedule
    .filter((a) => ["Requested", "Scheduled", "Checked in"].includes(a.status))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const bills = user.role === "admin" ? invoices() : [];
  return (
    <>
      <PageHeading
        eyebrow="SRI ALLADA HOSPITALS · శ్రీ అల్లాడ హాస్పిటల్స్"
        title="Hospital workspace"
        description="Outpatient visits, inpatient care and patient access in one place. All times are Indian Standard Time."
        action={user.role === "admin" ? <AddPatient /> : undefined}
      />
      <section className="welcome-banner">
        <div>
          <span className="banner-kicker">
            CONNECTED HOSPITAL CARE / అనుసంధాన వైద్య సేవలు
          </span>
          <h2>
            Every visit recorded.
            <br />
            Every patient connected.
          </h2>
          <p>Use the sidebar to manage your hospital’s daily work.</p>
        </div>
        <div className="banner-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="art-cross">+</div>
        </div>
      </section>
      <section className="stats-grid">
        <Stat
          label="Patients"
          value={patients.length}
          note="Registered patient accounts"
          icon="users"
        />
        <Stat
          label="Appointments"
          value={upcoming.length}
          note="Requested, scheduled or checked in"
          icon="calendar"
        />
        <Stat
          label="Inpatient care"
          value={ipd.length}
          note={`${bedList.length - ipd.length} beds available`}
          icon="heart"
        />
        <Stat
          label={user.role === "admin" ? "Outstanding" : "Doctor"}
          value={
            user.role === "admin"
              ? money(
                  bills.reduce((s, i) => s + i.totalPaise - i.paidPaise, 0) /
                    100,
                )
              : doctors().length
          }
          note={
            user.role === "admin"
              ? "Invoice balances · INR"
              : "Active doctor accounts"
          }
          icon="wallet"
        />
      </section>
      {user.role === "admin" && !doctors().length && (
        <div className="attention-bar">
          <strong>Start by adding your doctors and nurses.</strong>
          <Link href="/admin/staff">Set up staff →</Link>
        </div>
      )}
      <section className="panel">
        <div className="panel-heading">
          <h2>
            <T>Appointments</T>
          </h2>
          <Link className="text-link" href="/admin/appointments">
            View all →
          </Link>
        </div>
        {upcoming.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>
                    <T>Patient</T>
                  </th>
                  <th>
                    <T>Doctor</T>
                  </th>
                  <th>
                    <T>Date and time (IST)</T>
                  </th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.slice(0, 8).map((a) => (
                  <tr key={a.id}>
                    <td>
                      <Link href={`/admin/patients/${a.patientId}`}>
                        {a.patientName}
                      </Link>
                    </td>
                    <td>{a.doctorName}</td>
                    <td>{dateTimeLabel(a.startsAt)}</td>
                    <td>
                      <Badge value={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Empty
            title="No records yet"
            text="Add a doctor, then book your first appointment."
          />
        )}
      </section>
      {user.role === "admin" && (
        <Link href="/admin/system" className="patient-help system-link">
          <strong>See the backend and database status →</strong>
          <p>
            Live record counts, database health, encryption configuration and
            deployment checks.
          </p>
        </Link>
      )}
    </>
  );
}
