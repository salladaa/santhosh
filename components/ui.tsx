import Link from "next/link";
import { T } from "./language";
import { Icon, type IconName } from "./icon";
import { initials } from "@/lib/format";
export function PageHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1>
          <T>{title}</T>
        </h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
export function AddPatient() {
  return (
    <Link className="button primary" href="/admin/patients/new">
      <Icon name="plus" size={18} />
      <T>Add patient</T>
    </Link>
  );
}
export function Stat({
  label,
  value,
  note,
  icon,
  tone = "mint",
}: {
  label: string;
  value: string | number;
  note: string;
  icon: IconName;
  tone?: string;
}) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span>
          <T>{label}</T>
        </span>
        <span className={`stat-icon ${tone}`}>
          <Icon name={icon} />
        </span>
      </div>
      <div className="stat-value">{value}</div>
      <p>{note}</p>
    </article>
  );
}
export function Badge({ value }: { value: string }) {
  return (
    <span className={`badge ${value.toLowerCase().replaceAll(" ", "-")}`}>
      <span />
      <T>{value}</T>
    </span>
  );
}
export function Person({ name, detail }: { name: string; detail?: string }) {
  return (
    <div className="person">
      <span className="avatar">{initials(name)}</span>
      <div>
        <strong>{name}</strong>
        {detail && <span>{detail}</span>}
      </div>
    </div>
  );
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name="file" size={26} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </div>
  );
}
