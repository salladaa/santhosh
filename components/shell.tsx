"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon, type IconName } from "./icon";
import { request } from "@/lib/client";
import { T, LanguageToggle } from "./language";
import type { Session } from "@/lib/types";
const links: { href: string; label: string; icon: IconName }[] = [
  { href: "/admin", label: "Overview", icon: "grid" },
  { href: "/admin/patients", label: "Patients", icon: "users" },
  { href: "/admin/appointments", label: "Appointments", icon: "calendar" },
  { href: "/admin/billing", label: "Billing", icon: "wallet" },
  { href: "/admin/inpatient", label: "Inpatient care", icon: "heart" },
  { href: "/admin/staff", label: "Staff", icon: "users" },
  { href: "/admin/system", label: "System status", icon: "grid" },
  { href: "/admin/activity", label: "Activity log", icon: "activity" },
  { href: "/account", label: "Account", icon: "users" },
];
export function Brand() {
  return (
    <span className="brand">
      <Image
        src="/sri-allada-hospitals.jpeg"
        alt=""
        width={44}
        height={44}
        className="hospital-brand-photo"
      />
      <span>
        Sri Allada<span className="brand-sub">HOSPITALS</span>
      </span>
    </span>
  );
}
export function Shell({
  children,
  patient = false,
  name = "Administrator",
  demo = false,
  role = "admin",
}: {
  children: React.ReactNode;
  patient?: boolean;
  name?: string;
  demo?: boolean;
  role?: Session["role"];
}) {
  const path = usePathname();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const navigation = patient
    ? [
        { href: "/patient", label: "My health", icon: "heart" as IconName },
        { href: "/account", label: "Account", icon: "users" as IconName },
      ]
    : links.filter(
        (item) =>
          role === "admin" ||
          ![
            "/admin/billing",
            "/admin/staff",
            "/admin/system",
            "/admin/activity",
          ].includes(item.href),
      );
  async function logout() {
    setBusy(true);
    setError("");
    try {
      await request("/api/auth/logout", "POST", {});
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- Drop cached patient pages after revoking the session.
      window.location.assign("/login");
    } catch {
      setError("Sign-out failed. Try again.");
      setBusy(false);
    }
  }
  return (
    <div className="app-shell">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <aside className="sidebar">
        <Link
          href={patient ? "/patient" : "/admin"}
          className="brand-link"
          aria-label="Sri Allada Hospitals home"
        >
          <Brand />
        </Link>
        <div className="workspace-label">
          {patient ? "PATIENT WORKSPACE" : "HOSPITAL WORKSPACE"}
        </div>
        <nav aria-label="Main navigation">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${path === item.href || (item.href === "/admin/patients" && path.startsWith(item.href)) ? "active" : ""}`}
              aria-current={path === item.href ? "page" : undefined}
            >
              <Icon name={item.icon} />
              <T>{item.label}</T>
              {item.href === "/admin" && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="care-note">
            <span className="small-icon">
              <Icon name="heart" />
            </span>
            <strong>Better care, together.</strong>
            <p>A clearer view of every patient’s journey.</p>
          </div>
          <button className="nav-item logout" onClick={logout} disabled={busy}>
            <Icon name="logout" />
            <T>{busy ? "Signing out…" : "Sign out"}</T>
          </button>
          {error && (
            <p role="alert" className="error-text">
              {error}
            </p>
          )}
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>{" "}
            <strong>
              {navigation.find((item) => item.href === path)?.label ||
                "Patient records"}
            </strong>
          </div>
          <div className="topbar-right">
            <LanguageToggle />
            {demo && <span className="demo-chip">Demo workspace</span>}
            {patient ? (
              <span className="avatar small">{name[0]}</span>
            ) : (
              <Image
                src="/sri-allada-hospitals.jpeg"
                alt="Sri Allada Hospitals profile picture"
                width={40}
                height={40}
                className="hospital-profile-photo"
              />
            )}
            <div className="user-label">
              <strong>{name.split(" ")[0]}</strong>
              <span>
                {patient
                  ? "Patient account"
                  : role === "admin"
                    ? "Administrator"
                    : role === "doctor"
                      ? "Doctor"
                      : "Nurse"}
              </span>
            </div>
          </div>
        </header>
        <main id="main" className="main-content">
          {children}
        </main>
        <footer className="workspace-footer">
          Sri Allada Hospitals{" "}
          <span>
            {demo ? "Sample data · For demonstration" : "Care team workspace"}
          </span>
        </footer>
      </div>
    </div>
  );
}
