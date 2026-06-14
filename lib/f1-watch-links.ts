export interface F1WatchLink {
  label: string;
  href: string;
  hint: string;
  logoSrc: string;
}

export function getSessionWatchLinks(gpName: string, circuit: string): F1WatchLink[] {
  const query = `Formula 1 ${gpName} ${circuit}`;

  return [
    {
      label: "ESPN",
      hint: "ABC · ESPN app",
      logoSrc: "/watch/espn.svg",
      href: `https://www.espn.com/search/_/q/${encodeURIComponent(query)}`,
    },
    {
      label: "F1 TV",
      hint: "Official",
      logoSrc: "/watch/f1-tv.svg",
      href: `https://f1tv.formula1.com/en/event/${encodeURIComponent(gpName.toLowerCase().replace(/\s+/g, "-"))}`,
    },
    {
      label: "YouTube TV",
      hint: "ESPN",
      logoSrc: "/watch/youtube-tv.svg",
      href: `https://tv.youtube.com/search?q=${encodeURIComponent(query)}`,
    },
  ];
}
