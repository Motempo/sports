import type { Metadata, Viewport } from "next";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://sports.motempo.com"),
  title: "Sports by Motempo — FIFA World Cup 2026",
  description:
    "Track the FIFA World Cup 2026 knockout bracket, news from trusted X sources, and fun facts. An experiment by Motempo.",
  openGraph: {
    title: "Sports by Motempo — FIFA World Cup 2026",
    description: "Knockout bracket, news, and fun facts for World Cup 2026.",
    url: "https://sports.motempo.com",
    siteName: "Sports by Motempo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Sports by Motempo — FIFA World Cup 2026",
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
      <body className="min-h-dvh antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
