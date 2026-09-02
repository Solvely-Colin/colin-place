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
    default: "Colin Johnson — ships in the open, keeps the receipts",
    template: "%s · colin.place",
  },
  description:
    "Open-source maintainer, developer-community builder, and agent-tooling person. A personal site built by his own agents, live from GitHub, with every claim linked to a public page.",
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
