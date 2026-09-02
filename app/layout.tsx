import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Fragment_Mono } from "next/font/google";
import "./globals.css";

const sans = Instrument_Sans({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-sans",
  display: "swap",
});

const mono = Fragment_Mono({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://colin.place"),
  title: {
    default: "Colin Johnson — builds in the open",
    template: "%s · colin.place",
  },
  description:
    "Open-source maintainer, community builder, CRM architect by day. A playground site his agents build and deploy, with a town where described ideas become buildings.",
  openGraph: {
    type: "website",
    siteName: "colin.place",
    url: "https://colin.place",
  },
  twitter: { card: "summary_large_image", creator: "@colinsolvely" },
};

export const viewport: Viewport = {
  themeColor: "#f6f6f3",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${sans.variable} ${mono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
