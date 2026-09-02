import fs from "node:fs";

const UA = "Motempo/1.0";
const DELAY_MS = 1100;

const CIRCUIT_WIKI_PAGES = {
  "albert park grand prix circuit": "Albert Park Circuit",
  "shanghai international circuit": "Shanghai International Circuit",
  "suzuka circuit": "Suzuka International Racing Course",
  "miami international autodrome": "Miami International Autodrome",
  "circuit gilles villeneuve": "Circuit Gilles Villeneuve",
  "circuit de monaco": "Circuit de Monaco",
  "circuit de barcelona-catalunya": "Circuit de Barcelona-Catalunya",
  "red bull ring": "Red Bull Ring",
  "silverstone circuit": "Silverstone Circuit",
  "circuit de spa-francorchamps": "Circuit de Spa-Francorchamps",
  hungaroring: "Hungaroring",
  "circuit park zandvoort": "Circuit Zandvoort",
  "autodromo nazionale di monza": "Monza Circuit",
  madring: "IFEMA Madrid",
  "baku city circuit": "Baku City Circuit",
  "marina bay street circuit": "Marina Bay Street Circuit",
  "circuit of the americas": "Circuit of the Americas",
  "autódromo hermanos rodríguez": "Autódromo Hermanos Rodríguez",
  "autodromo hermanos rodriguez": "Autódromo Hermanos Rodríguez",
  "autódromo josé carlos pace": "Autódromo José Carlos Pace",
  "autodromo jose carlos pace": "Autódromo José Carlos Pace",
  "las vegas strip street circuit": "Las Vegas Strip Circuit",
  "losail international circuit": "Losail International Circuit",
  "yas marina circuit": "Yas Marina Circuit",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function aerialScore(name, kind = "circuit") {
  const n = name.toLowerCase();
  if (/logo|wordmark|coat_of_arms|flag|icon|pictogram|seal/.test(n)) return -100;

  let score = 0;
  const isAerial =
    /aerial|from_air|from.the.air|from_the_air|air_view|airview|drone|satellite|overview|bird.?s.?eye|helicopter|oblique|panorama|skysat|planetlabs|google.?earth/.test(
      n
    );
  const isSchematic =
    /circuit\.(png|svg)$/.test(n) ||
    (/circuit|track|layout|map|diagram|schematic|plan/.test(n) &&
      (n.endsWith(".svg") || n.endsWith(".png")));
  const isGroundLevel =
    /startfinish|start_finish|epingle|salut-gilles|grandstand|pit_lane|paddock|tunnel|tribune|interior/.test(
      n
    );

  if (isAerial) score += 70;
  if (/skysat|satellite/.test(n)) score += 25;
  if (/\.jpe?g/.test(n)) score += 12;
  if (isGroundLevel && !isAerial) score -= 45;
  if (kind === "circuit" && isSchematic) score -= 55;
  if (kind === "stadium" && n.endsWith(".svg")) score -= 80;
  if (/stadium|estadio|arena|ground|circuit|track/.test(n)) score += 8;

  return score;
}

async function wikiJson(url) {
  const r = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!r.ok) return null;
  return r.json();
}

async function fileOriginalUrl(fileTitle) {
  const params = new URLSearchParams({
    action: "query",
    titles: fileTitle,
    prop: "imageinfo",
    iiprop: "url|mime",
    format: "json",
  });
  const data = await wikiJson(`https://en.wikipedia.org/w/api.php?${params}`);
  const page = Object.values(data?.query?.pages || {})[0];
  const url = page?.imageinfo?.[0]?.url?.split("?")[0];
  if (!url || url.endsWith(".svg")) return null;
  return url;
}

async function findAerialForPage(wikiTitle, kind = "circuit") {
  const enc = encodeURIComponent(wikiTitle.replace(/ /g, "_"));
  const media = await wikiJson(`https://en.wikipedia.org/api/rest_v1/page/media-list/${enc}`);
  const images = (media?.items || []).filter((i) => i.type === "image" && i.title);
  const ranked = images
    .map((i) => ({ title: i.title, score: aerialScore(i.title, kind) }))
    .filter((x) => x.score >= 35)
    .sort((a, b) => b.score - a.score);

  for (const { title } of ranked.slice(0, 8)) {
    const url = await fileOriginalUrl(title);
    if (url) return { url, alt: `${wikiTitle} aerial view`, file: title };
  }
  return null;
}

const out = { circuit: {}, stadium: {} };

for (const [key, page] of Object.entries(CIRCUIT_WIKI_PAGES)) {
  await sleep(DELAY_MS);
  const hit = await findAerialForPage(page, "circuit");
  if (hit) out.circuit[key] = { url: hit.url, alt: hit.alt };
  console.log("circuit", key, hit ? hit.file.replace("File:", "") : "MISS");
}

const pl = JSON.parse(fs.readFileSync("data/pl-home-venues.json", "utf8"));
const wc = JSON.parse(fs.readFileSync("data/wc2026-stadiums.json", "utf8"));
const stadiumPages = [...new Set([...pl.map((v) => v.venue), ...wc.map((s) => s.venue)])];

for (const stadium of stadiumPages) {
  await sleep(DELAY_MS);
  const hit = await findAerialForPage(stadium, "stadium");
  const key = stadium.toLowerCase();
  if (hit) out.stadium[key] = { url: hit.url, alt: hit.alt };
  console.log("stadium", stadium, hit ? hit.file.replace("File:", "") : "MISS");
}

fs.writeFileSync("data/venue-aerial-images.json", `${JSON.stringify(out, null, 2)}\n`);
console.log(
  "done",
  Object.keys(out.circuit).length,
  "circuits,",
  Object.keys(out.stadium).length,
  "stadiums"
);
