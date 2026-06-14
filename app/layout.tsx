import type { Metadata, Viewport } from "next";
import { AdProvider } from "@/components/ads/AdProvider";
import { CookieNotice } from "@/components/legal/CookieNotice";
import { Toaster } from "@/components/ui/toaster";
import { themeInitScript } from "@/lib/theme";
import { getCurrentSport, SITE_NAME, SITE_URL } from "@/lib/sports";
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

const currentSport = getCurrentSport();

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${currentSport.title} | ${SITE_NAME}`,
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Live sports trackers by Motempo — World Cup brackets, standings, news, and more.",
  applicationName: SITE_NAME,
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_US",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    site: "@motempo",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('consent', 'default', {
                ad_storage: 'denied',
                ad_user_data: 'denied',
                ad_personalization: 'denied',
                analytics_storage: 'denied',
                wait_for_update: 500
              });
            `,
          }}
        />
      </head>
      <body className="min-h-dvh antialiased">
        <AdProvider>
          {children}
          <CookieNotice />
        </AdProvider>
        <Toaster />
      </body>
    </html>
  );
}
