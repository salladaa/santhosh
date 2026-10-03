import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/language";
export const metadata: Metadata = {
  title: {
    default: "Sri Allada Hospitals | Patient Portal",
    template: "%s | Sri Allada Hospitals",
  },
  description:
    "A connected workspace for patient records, appointments, and billing.",
  robots: { index: false, follow: false },
  icons: { icon: "/carewell.svg" },
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
