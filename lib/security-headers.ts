/**
 * Baseline browser security headers for Motempo Sports.
 *
 * The CSP is report-only. Google AdSense (loaded on every page from
 * `app/layout.tsx`) does not support a frozen host allowlist — ad and consent
 * hosts change — and the strict policy they do support requires `'unsafe-eval'`.
 * Enforcing this policy could break ads the next time a host appears.
 * Clickjacking, sniffing, referrer, and powerful-feature restrictions below
 * are enforcing. `frame-ancestors 'none'` is in the report-only policy;
 * `X-Frame-Options: DENY` enforces the same control until the CSP is promoted.
 *
 * Image and media sources use `https:` because crests, flags, Wikimedia,
 * and the hosts in `next.config.ts` `images.remotePatterns` are only part of
 * what the browser loads. News, fun-fact, and X media URLs are publisher CDNs
 * chosen at request time (BBC, Sky, Guardian, YouTube thumbs, unavatar, etc.).
 */

const GOOGLE_AD_HOSTS = [
  "https://*.googlesyndication.com",
  "https://*.googleadservices.com",
  "https://*.googletagservices.com",
  "https://*.googletagmanager.com",
  "https://*.googleapis.com",
  "https://*.gstatic.com",
  "https://*.google.com",
  "https://google.com",
  "https://*.doubleclick.net",
  "https://*.g.doubleclick.net",
  "https://*.adtrafficquality.google",
  "https://*.2mdn.net",
];

/** NitroPay loader (`s.nitropay.com`) when NEXT_PUBLIC_ADS_PROVIDER=nitro. */
const NITRO_HOSTS = ["https://*.nitropay.com", "https://nitropay.com"];

/**
 * Hosts the app references directly. `https:` on img-src/media-src also covers
 * these; they are listed so the policy documents the inventory:
 * flagcdn, crests.football-data.org, upload/thumb.wikimedia.org, i.guim.co.uk,
 * *.bbc.co.uk, *.bbci.co.uk, unavatar.io, *.skyassets.com, i.ytimg.com,
 * pbs.twimg.com / video.twimg.com (X media), and Google ad creatives.
 */
const KNOWN_MEDIA_HOSTS = [
  "https://flagcdn.com",
  "https://crests.football-data.org",
  "https://upload.wikimedia.org",
  "https://thumb.wikimedia.org",
  "https://i.guim.co.uk",
  "https://*.bbc.co.uk",
  "https://*.bbci.co.uk",
  "https://unavatar.io",
  "https://*.skyassets.com",
  "https://*.365dm.com",
  "https://i.ytimg.com",
  "https://*.ytimg.com",
  "https://pbs.twimg.com",
  "https://video.twimg.com",
  "https://*.googleusercontent.com",
  ...GOOGLE_AD_HOSTS,
];

const SCRIPT_SRC = [
  "'self'",
  // Next.js hydration inline scripts, theme init, and consent default/update.
  "'unsafe-inline'",
  ...GOOGLE_AD_HOSTS,
  ...NITRO_HOSTS,
];

const FRAME_SRC = [
  "'self'",
  "https://www.youtube-nocookie.com",
  "https://www.youtube.com",
  "https://player.vimeo.com",
  ...GOOGLE_AD_HOSTS,
  ...NITRO_HOSTS,
];

function directive(name: string, sources: string[]): string {
  return `${name} ${sources.join(" ")}`;
}

export function contentSecurityPolicy(): string {
  const scriptSrc = [...SCRIPT_SRC];
  const connectSrc = ["'self'", ...GOOGLE_AD_HOSTS, ...NITRO_HOSTS];

  // Turbopack dev uses eval and a websocket. Report-only either way; keep the
  // production policy free of 'unsafe-eval' so AdSense eval still shows up.
  if (process.env.NODE_ENV === "development") {
    scriptSrc.push("'unsafe-eval'");
    connectSrc.push("ws:", "wss:");
  }

  return [
    directive("default-src", ["'self'"]),
    directive("script-src", scriptSrc),
    directive("style-src", ["'self'", "'unsafe-inline'"]),
    directive("img-src", ["'self'", "data:", "blob:", "https:", ...KNOWN_MEDIA_HOSTS]),
    directive("font-src", ["'self'", "data:"]),
    directive("connect-src", connectSrc),
    directive("frame-src", FRAME_SRC),
    directive("media-src", ["'self'", "blob:", "data:", "https:", ...KNOWN_MEDIA_HOSTS]),
    directive("worker-src", ["'self'", "blob:"]),
    directive("object-src", ["'none'"]),
    directive("base-uri", ["'self'"]),
    directive("form-action", ["'self'"]),
    directive("frame-ancestors", ["'none'"]),
    directive("manifest-src", ["'self'"]),
  ].join("; ");
}

/**
 * Powerful features the sports pages do not use.
 * Fullscreen, picture-in-picture, and encrypted-media stay available for the
 * same-origin page and the YouTube/Vimeo embeds news can open.
 */
export const PERMISSIONS_POLICY = [
  "accelerometer=()",
  "autoplay=()",
  "camera=()",
  "display-capture=()",
  "encrypted-media=(self \"https://www.youtube-nocookie.com\" \"https://player.vimeo.com\")",
  "fullscreen=(self \"https://www.youtube-nocookie.com\" \"https://player.vimeo.com\")",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "picture-in-picture=(self \"https://www.youtube-nocookie.com\" \"https://player.vimeo.com\")",
  "publickey-credentials-get=()",
  "screen-wake-lock=()",
  "usb=()",
  "xr-spatial-tracking=()",
  "interest-cohort=()",
  "browsing-topics=()",
].join(", ");

export function securityHeaders(): { key: string; value: string }[] {
  return [
    { key: "Content-Security-Policy-Report-Only", value: contentSecurityPolicy() },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
  ];
}
