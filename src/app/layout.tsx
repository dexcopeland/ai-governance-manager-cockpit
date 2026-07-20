import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Governance Cockpit",
  description:
    "Open-source operational cockpit for AI Governance Managers — inventory, intake, policies, and audit-ready workflows.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
