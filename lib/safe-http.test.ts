import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isPublicHttpUrl, readPublicArticleMedia, type HostResolver } from "./safe-http.ts";

/**
 * Offline stand-in for DNS. These tests must not call `dns.lookup` or open a socket.
 * A throw here means a code path resolved a name it should not have, or failed closed.
 */
const dnsForbidden: HostResolver = async () => {
  throw new Error("DNS lookup is not allowed in this test");
};

function publicResolver(address = "93.184.216.34"): HostResolver {
  return async () => [address];
}

function mockFetch(routes: Record<string, { status: number; location?: string; body?: string }>) {
  const calls: string[] = [];
  const redirectModes: Array<RequestInit["redirect"]> = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    calls.push(url);
    redirectModes.push(init?.redirect);
    const route = routes[url];
    if (!route) throw new Error(`unexpected fetch ${url}`);
    const headers = new Headers();
    if (route.location) headers.set("location", route.location);
    return new Response(route.body ?? "", { status: route.status, headers });
  };
  return { fetchImpl, calls, redirectModes };
}

const ARTICLE_HTML = `<!doctype html><meta property="og:image" content="https://cdn.example/photo.jpg">`;

describe("isPublicHttpUrl", () => {
  test("does not resolve IP literals", async () => {
    assert.equal(await isPublicHttpUrl("http://8.8.8.8/path", dnsForbidden), true);
    assert.equal(await isPublicHttpUrl("http://127.0.0.1/", dnsForbidden), false);
    assert.equal(await isPublicHttpUrl("http://169.254.169.254/", dnsForbidden), false);
    assert.equal(await isPublicHttpUrl("http://[fe80::1]/", dnsForbidden), false);
    assert.equal(await isPublicHttpUrl("http://2130706433/", dnsForbidden), false);
  });

  test("refuses hostnames that resolve to loopback, private, link-local, metadata, or mapped addresses", async () => {
    const blocked = [
      "127.0.0.1",
      "10.0.0.8",
      "192.168.1.9",
      "172.16.5.5",
      "169.254.169.254",
      "::1",
      "fe80::1",
      "fc00::1",
      "fd00::254",
      "::ffff:127.0.0.1",
      "::ffff:a9fe:a9fe",
    ];
    for (const address of blocked) {
      const ok = await isPublicHttpUrl("https://publisher.example/story", async () => [address]);
      assert.equal(ok, false, address);
    }
  });

  test("refuses a hostname when any resolved address is non-public, and fails closed", async () => {
    assert.equal(
      await isPublicHttpUrl("https://publisher.example/story", async () => ["8.8.8.8", "127.0.0.1"]),
      false
    );
    assert.equal(await isPublicHttpUrl("https://publisher.example/story", async () => []), false);
    assert.equal(await isPublicHttpUrl("https://publisher.example/story", dnsForbidden), false);
    assert.equal(
      await isPublicHttpUrl("https://publisher.example/story", publicResolver("93.184.216.34")),
      true
    );
  });
});

describe("readPublicArticleMedia", () => {
  test("does not fetch a literal private or link-local URL", async () => {
    const targets = [
      "http://127.0.0.1/",
      "http://169.254.169.254/latest/meta-data/",
      "http://[fe80::1]/",
      "http://2130706433/",
      "http://[::ffff:169.254.169.254]/",
    ];
    for (const url of targets) {
      const { fetchImpl, calls } = mockFetch({});
      const media = await readPublicArticleMedia(url, {}, { fetchImpl, resolveHost: dnsForbidden });
      assert.equal(media, null, url);
      assert.deepEqual(calls, [], url);
    }
  });

  test("does not fetch a redirect to loopback, metadata, or link-local IPv6", async () => {
    const locations = [
      "http://127.0.0.1/",
      "http://127.0.0.1/latest",
      "http://169.254.169.254/latest/meta-data/",
      "http://[fe80::1]/",
      "http://2130706433/",
      "http://[::ffff:7f00:1]/",
      "http://[fd00::1]/",
      "//169.254.169.254/latest/meta-data/",
      "\\\\127.0.0.1",
      "file:///etc/passwd",
      "http://example.com@127.0.0.1/",
    ];
    for (const location of locations) {
      const start = "http://1.2.3.4/article";
      const { fetchImpl, calls } = mockFetch({
        [start]: { status: 302, location },
      });
      const media = await readPublicArticleMedia(start, { redirect: "follow" }, {
        fetchImpl,
        resolveHost: dnsForbidden,
      });
      assert.equal(media, null, location);
      assert.deepEqual(calls, [start], location);
    }
  });

  test("does not fetch a redirect whose hostname resolves to an internal address", async () => {
    const start = "https://publisher.example/go";
    const { fetchImpl, calls } = mockFetch({
      [start]: { status: 302, location: "https://rebind.example/secret" },
    });
    const media = await readPublicArticleMedia(start, {}, {
      fetchImpl,
      resolveHost: async (hostname) => {
        if (hostname === "publisher.example") return ["93.184.216.34"];
        if (hostname === "rebind.example") return ["169.254.169.254"];
        throw new Error(`unexpected lookup ${hostname}`);
      },
    });
    assert.equal(media, null);
    assert.deepEqual(calls, [start]);
  });

  test("follows a normal publisher redirect and returns the image", async () => {
    const start = "http://publisher.example/go";
    const next = "https://www.publisher.example/story";
    const { fetchImpl, calls, redirectModes } = mockFetch({
      [start]: { status: 302, location: "/story" },
      // Relative Location is resolved against the request URL, then upgraded by the next hop.
      "http://publisher.example/story": { status: 301, location: next },
      [next]: { status: 200, body: ARTICLE_HTML },
    });
    const media = await readPublicArticleMedia(start, { redirect: "follow" }, {
      fetchImpl,
      resolveHost: publicResolver(),
    });
    assert.equal(media?.imageUrl, "https://cdn.example/photo.jpg");
    assert.deepEqual(calls, [start, "http://publisher.example/story", next]);
    assert.deepEqual(redirectModes, ["manual", "manual", "manual"]);
  });

  test("stops after the redirect cap and does not request the next hop", async () => {
    const urls = Array.from({ length: 8 }, (_, index) => `http://1.1.1.1/hop-${index}`);
    const routes: Record<string, { status: number; location?: string; body?: string }> = {};
    for (let index = 0; index < urls.length - 1; index++) {
      routes[urls[index]!] = { status: 302, location: urls[index + 1]! };
    }
    routes[urls[urls.length - 1]!] = { status: 200, body: ARTICLE_HTML };
    const { fetchImpl, calls } = mockFetch(routes);
    const media = await readPublicArticleMedia(urls[0]!, {}, { fetchImpl, resolveHost: dnsForbidden });
    assert.equal(media, null);
    assert.deepEqual(calls, urls.slice(0, 6));
  });
});
