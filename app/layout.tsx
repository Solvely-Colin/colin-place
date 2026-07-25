import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://colin.place"),
  title: {
    default: "Colin Johnson — live from colin.place",
    template: "%s · colin.place",
  },
  description:
    "A personal site that broadcasts itself: live telemetry, an agent-written changelog, and builds shipped in the open.",
  twitter: { card: "summary_large_image" },
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
