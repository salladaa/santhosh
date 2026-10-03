import Link from "next/link";
export default function NotFound() {
  return (
    <main className="standalone-message">
      <div className="eyebrow">404 · NOT FOUND</div>
      <h1>This page isn’t here.</h1>
      <p>The record may have been removed, or the link may be incorrect.</p>
      <Link className="button primary" href="/">
        Return to workspace
      </Link>
    </main>
  );
}
