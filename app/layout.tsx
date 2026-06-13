import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://sports.motempo.com"),
  title: "Motempo Sports — FIFA World Cup 2026",
  description:
    "Track the FIFA World Cup 2026 knockout bracket, latest news, and fun facts. An experiment by Motempo.",
  openGraph: {
    title: "Motempo Sports — FIFA World Cup 2026",
    description: "Knockout bracket, news, and fun facts for World Cup 2026.",
    url: "https://sports.motempo.com",
    siteName: "Motempo Sports",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Motempo Sports — FIFA World Cup 2026",
    description: "Knockout bracket, news, and fun facts for World Cup 2026.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
