import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { DialogProvider } from "@/components/ui/DialogProvider";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "National ADR Platform — NAMA",
  description: "National Digital Aerodrome Data Repository Platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <body>
        <DialogProvider>{children}</DialogProvider>
      </body>
    </html>
  );
}
