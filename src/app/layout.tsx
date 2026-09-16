import type { Metadata, Viewport } from "next";
import { Fraunces, IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { env, reportEnvStatus } from "@/lib/env";

import "./globals.css";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
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
const SITE_TITLE = "Missed No More Pro | AI Receptionist for Small Business";
const SITE_DESCRIPTION =
  "AI receptionist and answering service for small service businesses. Answers calls 24/7, quotes exact prices, books jobs, texts back, and logs every lead.";

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  applicationName: SITE_NAME,
  title: {
    default: SITE_TITLE,
    template: "%s | Missed No More Pro",
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
    "AI receptionist for small business",
    "AI answering service",
    "AI phone answering service",
    "AI phone assistant",
    "AI virtual receptionist",
    "virtual receptionist for small business",
    "24/7 answering service",
    "after-hours answering service",
    "AI receptionist with CRM",
    "AI receptionist with price quoting",
    "AI receptionist for HVAC",
    "AI receptionist for plumbers",
    "AI receptionist for towing",
    "missed call text back",
  ],
  // No site-wide canonical: a canonical here is inherited by every page that
  // doesn't set its own, pointing auth/app pages at the homepage.
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
