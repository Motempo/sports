import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { isBlockedIpAddress, isSafeHttpUrl } from "./safe-url.ts";

describe("isSafeHttpUrl", () => {
  test("allows ordinary publisher URLs and canonical public addresses", () => {
    const allowed = [
      "https://www.bbc.com/sport/football",
      "https://feeds.bbci.co.uk/sport/rss.xml",
      "http://example.com:8080/story",
      "http://8.8.8.8/",
      "http://1.2.3.4/article",
      "http://11.0.0.1/",
      "http://172.15.255.255/",
      "http://172.32.0.1/",
      "http://192.169.0.1/",
      "http://169.255.1.1/",
      "http://223.0.0.1/",
      "http://[2001:4860:4860::8888]/",
      "http://[2606:4700:4700::1111]/",
      "http://[fe7f::1]/",
      "http://[fb00::1]/",
      "http://[64:ff9b::808:808]/",
      "http://[2002:808:808::]/",
      "https://user:pass@example.com/story",
    ];
    for (const url of allowed) {
      assert.equal(isSafeHttpUrl(url), true, url);
    }
  });

  test("rejects non-http schemes, empty input, and blocked names", () => {
    const blocked = [
      "",
      "not a url",
      "ftp://example.com/",
      "file:///etc/passwd",
      "javascript:alert(1)",
      "http://localhost/",
      "http://localhost./",
      "http://LOCALHOST/admin",
      "http://foo.local/",
      "http://foo.LOCAL/x",
      "http://foo.internal/",
      "http://metadata/",
      "http://metadata.google.internal/",
      "http://instance-data.ec2.internal/latest",
      "http://printer.localdomain/",
    ];
    for (const url of blocked) {
      assert.equal(isSafeHttpUrl(url), false, url);
    }
  });

  test("rejects loopback, private, link-local, and metadata IPv4 literals", () => {
    const blocked = [
      "http://127.0.0.1/",
      "http://127.0.0.1:80/",
      "http://127.255.255.255/",
      "http://0.0.0.0/",
      "http://0.1.2.3/",
      "http://10.0.0.1/",
      "http://10.255.255.255/",
      "http://172.16.0.1/",
      "http://172.31.255.255/",
      "http://192.168.1.20/",
      "http://169.254.0.1/",
      "http://169.254.169.254/latest/meta-data/",
      "http://224.0.0.1/",
      "http://240.0.0.1/",
      "http://255.255.255.255/",
      "http://user:pass@127.0.0.1/",
      "http://example.com@127.0.0.1/",
      "http://127.0.0.1./",
      "http://127。0。0。1/",
      "http://127.0.0.1\\.example.com/",
    ];
    for (const url of blocked) {
      assert.equal(isSafeHttpUrl(url), false, url);
    }
  });

  test("rejects decimal, octal, hex, and shortened IPv4 encodings", () => {
    const blocked = [
      "http://2130706433/",
      "http://0x7f000001/",
      "http://0177.0.0.1/",
      "http://0x7f.0.0.1/",
      "http://0x7f.0x0.0x0.0x1/",
      "http://127.1/",
      "http://127.0.1/",
      "http://0xA9FEA9FE/",
      "http://025177524776/",
      "http://0xA9.0xFE.0xA9.0xFE/",
      "http://0300.0250.0.1/",
      "http://017700000001/",
      "http://134744072/",
      "http://0127.0.0.1/",
      "http://127.0.0.01/",
    ];
    for (const url of blocked) {
      assert.equal(isSafeHttpUrl(url), false, url);
    }
  });

  test("rejects loopback, link-local, unique-local, and IPv4-mapped IPv6", () => {
    const blocked = [
      "http://[::1]/",
      "http://[::]/",
      "http://[0::1]/",
      "http://[::ffff:127.0.0.1]/",
      "http://[::ffff:7f00:1]/",
      "http://[0:0:0:0:0:ffff:127.0.0.1]/",
      "http://[::ffff:169.254.169.254]/",
      "http://[::ffff:a9fe:a9fe]/",
      "http://[::ffff:8.8.8.8]/",
      "http://[::ffff:0:169.254.169.254]/",
      "http://[::ffff:0:7f00:1]/",
      "http://[fe80::1]/",
      "http://[fe80::]/",
      "http://[febf::1]/",
      "http://[fc00::1]/",
      "http://[fd00::1]/",
      "http://[fd00:ec2::254]/",
      "http://[fec0::1]/",
      "http://[ff02::1]/",
      "http://[::7f00:1]/",
      "http://[64:ff9b::7f00:1]/",
      "http://[64:ff9b::127.0.0.1]/",
      "http://[2002:7f00:1::]/",
      "http://[2002:a9fe:a9fe::]/",
    ];
    for (const url of blocked) {
      assert.equal(isSafeHttpUrl(url), false, url);
    }
  });
});

describe("isBlockedIpAddress", () => {
  test("classifies canonical and alternate addresses the way DNS or a redirect would present them", () => {
    assert.equal(isBlockedIpAddress("127.0.0.1"), true);
    assert.equal(isBlockedIpAddress("10.1.2.3"), true);
    assert.equal(isBlockedIpAddress("169.254.169.254"), true);
    assert.equal(isBlockedIpAddress("8.8.8.8"), false);
    assert.equal(isBlockedIpAddress("2130706433"), true);
    assert.equal(isBlockedIpAddress("0x7f000001"), true);
    assert.equal(isBlockedIpAddress("::1"), true);
    assert.equal(isBlockedIpAddress("fe80::1"), true);
    assert.equal(isBlockedIpAddress("fc00::1"), true);
    assert.equal(isBlockedIpAddress("fd12:3456::1"), true);
    assert.equal(isBlockedIpAddress("::ffff:127.0.0.1"), true);
    assert.equal(isBlockedIpAddress("::ffff:7f00:1"), true);
    assert.equal(isBlockedIpAddress("::ffff:a9fe:a9fe"), true);
    assert.equal(isBlockedIpAddress("::ffff:808:808"), true);
    assert.equal(isBlockedIpAddress("2001:4860:4860::8888"), false);
    assert.equal(isBlockedIpAddress("not-an-ip"), false);
  });
});
