import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";

import { env, reportEnvStatus } from "@/lib/env";

import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
});

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});

reportEnvStatus();

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: {
    default: "Missed No More Pro — AI Receptionist for Local Service Businesses",
    template: "%s · Missed No More Pro",
  },
  description:
    "Every call answered. Every lead captured. Missed No More Pro answers your phones 24/7, qualifies callers, books jobs, follows up by text, and shows the revenue it saved.",
};

export const viewport: Viewport = {
  themeColor: "#020817",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${display.variable} ${sans.variable} ${mono.variable} min-h-dvh bg-background font-sans text-foreground`}
      >
        {children}
      </body>
    </html>
  );
}
