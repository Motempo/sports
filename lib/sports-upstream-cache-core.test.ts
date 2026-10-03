import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  SPORTS_UPSTREAM_TTL_MS,
  UpstreamHttpError,
  readThroughUpstream,
  upstreamCacheKey,
  upstreamWindow,
  type MemoryRecord,
  type UpstreamResult,
  type UpstreamSuccess,
} from "./sports-upstream-cache-core.ts";

const PL_MATCHES = "https://api.football-data.org/v4/competitions/PL/matches";
const ESPN_2026 =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?limit=1000&dates=2026";
const ESPN_2027 =
  "https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard?limit=1000&dates=2027";

function success(body: string): UpstreamSuccess {
  return { ok: true, status: 200, body, contentType: "application/json" };
}

/**
 * Stand-in for `unstable_cache`: stores only values returned by `load`,
 * never thrown non-200s, keyed like the production time bucket.
 */
function createSharedCache(fetcher: (url: string) => Promise<Response>) {
  const store = new Map<string, UpstreamSuccess>();
  const calls: string[] = [];

  async function load(url: string, window: number): Promise<UpstreamSuccess> {
    const key = upstreamCacheKey(url, "", window);
    const hit = store.get(key);
    if (hit) return hit;

    calls.push(url);
    const res = await fetcher(url);
    const body = await res.text();
    if (res.status !== 200) throw new UpstreamHttpError(res.status, body);
    const value = success(body);
    store.set(key, value);
    return value;
  }

  return { load, calls, store };
}

function createMemory() {
  return {
    memory: new Map<string, MemoryRecord>(),
    inflight: new Map<string, Promise<UpstreamResult>>(),
  };
}

async function read(
  url: string,
  window: number,
  shared: ReturnType<typeof createSharedCache>,
  bags: ReturnType<typeof createMemory>
): Promise<UpstreamResult> {
  return readThroughUpstream({
    memoryKey: upstreamCacheKey(url, "", window),
    window,
    memory: bags.memory,
    inflight: bags.inflight,
    load: () => shared.load(url, window),
  });
}

describe("upstream sports cache", () => {
  it("serves two Premier League reads inside the TTL from one football-data call and one ESPN pair", async () => {
    const payloads = new Map<string, string>([
      [PL_MATCHES, JSON.stringify({ matches: [{ utcDate: "2026-08-15T14:00:00Z", score: "0-0" }] })],
      [ESPN_2026, JSON.stringify({ events: [{ id: "a" }] })],
      [ESPN_2027, JSON.stringify({ events: [{ id: "b" }] })],
    ]);
    const shared = createSharedCache(async (url) => {
      return new Response(payloads.get(url) ?? "", { status: 200 });
    });
    const bags = createMemory();
    const window = upstreamWindow(1_000_000);

    const first = await Promise.all([
      read(PL_MATCHES, window, shared, bags),
      read(ESPN_2026, window, shared, bags),
      read(ESPN_2027, window, shared, bags),
    ]);
    const second = await Promise.all([
      read(PL_MATCHES, window, shared, bags),
      read(ESPN_2026, window, shared, bags),
      read(ESPN_2027, window, shared, bags),
    ]);

    assert.deepEqual(shared.calls, [PL_MATCHES, ESPN_2026, ESPN_2027]);
    assert.equal(first[0].ok && first[0].body, payloads.get(PL_MATCHES));
    assert.equal(second[0].ok && second[0].body, payloads.get(PL_MATCHES));
    assert.equal(second[1].ok && second[1].body, payloads.get(ESPN_2026));
    assert.equal(second[2].ok && second[2].body, payloads.get(ESPN_2027));
  });

  it("does not cache a football-data 429, and the next read can succeed", async () => {
    let status = 429;
    const shared = createSharedCache(async () => {
      if (status !== 200) return new Response("rate limited", { status });
      return new Response(JSON.stringify({ matches: [{ score: "2-1" }] }), { status: 200 });
    });
    const bags = createMemory();
    const window = upstreamWindow(0);

    const rateLimited = await read(PL_MATCHES, window, shared, bags);
    assert.equal(rateLimited.ok, false);
    if (!rateLimited.ok) assert.equal(rateLimited.status, 429);
    assert.equal(shared.store.size, 0);
    assert.equal(bags.memory.size, 0);

    status = 200;
    const recovered = await read(PL_MATCHES, window, shared, bags);
    assert.equal(recovered.ok, true);
    if (recovered.ok) assert.match(recovered.body, /2-1/);

    const cached = await read(PL_MATCHES, window, shared, bags);
    assert.equal(cached.ok && cached.body, recovered.ok && recovered.body);
    assert.equal(shared.calls.length, 2);
  });

  it("picks up a full-time score on the first read of the next TTL window", async () => {
    let body = JSON.stringify({ score: "0-0", status: "IN_PLAY" });
    const shared = createSharedCache(async () => new Response(body, { status: 200 }));
    const bags = createMemory();
    const start = 10_000;
    const firstWindow = upstreamWindow(start);
    const nextWindow = upstreamWindow(start + SPORTS_UPSTREAM_TTL_MS);

    assert.notEqual(firstWindow, nextWindow);

    const live = await read(PL_MATCHES, firstWindow, shared, bags);
    assert.match(live.ok ? live.body : "", /0-0/);

    body = JSON.stringify({ score: "1-0", status: "FINISHED" });
    const stillCached = await read(PL_MATCHES, firstWindow, shared, bags);
    assert.match(stillCached.ok ? stillCached.body : "", /0-0/);

    const afterFullTime = await read(PL_MATCHES, nextWindow, shared, bags);
    assert.match(afterFullTime.ok ? afterFullTime.body : "", /1-0/);
    assert.equal(shared.calls.length, 2);
  });

  it("coalesces concurrent misses into one upstream call", async () => {
    let calls = 0;
    const bags = createMemory();
    const window = 4;
    const key = upstreamCacheKey(PL_MATCHES, "fp", window);
    const load = async (): Promise<UpstreamSuccess> => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 15));
      return success("{\"ok\":true}");
    };

    const [a, b] = await Promise.all([
      readThroughUpstream({
        memoryKey: key,
        window,
        memory: bags.memory,
        inflight: bags.inflight,
        load,
      }),
      readThroughUpstream({
        memoryKey: key,
        window,
        memory: bags.memory,
        inflight: bags.inflight,
        load,
      }),
    ]);

    assert.equal(calls, 1);
    assert.equal(a.ok && a.body, b.ok && b.body);
  });
});
