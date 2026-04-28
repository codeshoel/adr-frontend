import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "National ADR Platform — NAMA",
  description: "National Digital Aerodrome Data Repository Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
