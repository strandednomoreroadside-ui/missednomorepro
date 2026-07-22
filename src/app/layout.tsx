import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { env, reportEnvStatus } from "@/lib/env";

import "./globals.css";

const display = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "optional",
});

const sans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "optional",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
  display: "optional",
});

reportEnvStatus();

const SITE_NAME = "Missed No More Pro";
const SITE_TITLE = "Missed No More Pro — AI Receptionist for Local Service Businesses";
const SITE_DESCRIPTION =
  "Every call answered. Every lead captured. Missed No More Pro answers your phones 24/7, qualifies callers, books jobs, follows up by text, and shows the revenue it saved.";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  applicationName: SITE_NAME,
  title: {
    default: SITE_TITLE,
    template: "%s · Missed No More Pro",
  },
  description: SITE_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/app-icon.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/icons/icon-180.png", sizes: "180x180", type: "image/png" }],
  },
  keywords: [
    "AI receptionist",
    "AI phone answering service",
    "missed call text back",
    "24/7 answering service",
    "appointment booking software",
    "field service software",
    "small business CRM",
    "roadside assistance software",
    "HVAC plumber electrician answering service",
    "AI virtual receptionist",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
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
        <ServiceWorkerRegistration />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
