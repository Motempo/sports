import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import type { F1SessionInfo, F1SessionType } from "./f1-types.ts";
import {
  inferSessionStatus,
  mergeOpenF1Sessions,
  resolveSessionStatus,
} from "./f1-session-status.ts";

const originalFetch = globalThis.fetch;
const START = "2026-10-03T12:00:00.000Z";

beforeEach(() => {
  globalThis.fetch = (() => {
    throw new Error("unit tests must not hit the network");
  }) as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

function at(minutes: number): Date {
  return new Date(Date.parse(START) + minutes * 60_000);
}

function status(sessionType: F1SessionType, minutes: number, utcEnd?: string, reportedStatus?: F1SessionInfo["status"]) {
  return inferSessionStatus(START, at(minutes), { sessionType, utcEnd, reportedStatus });
}

function endAfter(minutes: number): string {
  return new Date(Date.parse(START) + minutes * 60_000).toISOString();
}

function session(overrides: Partial<F1SessionInfo> & Pick<F1SessionInfo, "sessionType" | "sessionLabel">): F1SessionInfo {
  return {
    id: overrides.sessionLabel,
    round: 1,
    gpName: "Test Grand Prix",
    circuit: "Test Circuit",
    country: "Testland",
    utcDate: START,
    status: "scheduled",
    isSprintWeekend: false,
    ...overrides,
  };
}

describe("inferSessionStatus type windows", () => {
  test("stays scheduled until the start", () => {
    for (const sessionType of ["practice", "sprint_qualifying", "qualifying", "sprint", "race"] as const) {
      assert.equal(status(sessionType, -1), "scheduled");
      assert.equal(status(sessionType, 0), "live");
    }
  });

  test("practice is live for the 60 minute session plus a 15 minute buffer", () => {
    assert.equal(status("practice", 30), "live");
    assert.equal(status("practice", 60), "live");
    assert.equal(status("practice", 75), "live");
    assert.equal(status("practice", 76), "finished");
  });

  test("a practice session that ended an hour ago is finished, including the old two-hour mark", () => {
    assert.equal(status("practice", 90), "finished");
    assert.equal(status("practice", 120), "finished");
    assert.equal(status("practice", 60 + 60), "finished");
  });

  test("sprint qualifying is live for about 45 minutes plus a 15 minute buffer", () => {
    assert.equal(status("sprint_qualifying", 20), "live");
    assert.equal(status("sprint_qualifying", 45), "live");
    assert.equal(status("sprint_qualifying", 60), "live");
    assert.equal(status("sprint_qualifying", 61), "finished");
    assert.equal(status("sprint_qualifying", 45 + 60), "finished");
  });

  test("qualifying is live for the 60 minute session plus a 15 minute buffer", () => {
    assert.equal(status("qualifying", 40), "live");
    assert.equal(status("qualifying", 60), "live");
    assert.equal(status("qualifying", 75), "live");
    assert.equal(status("qualifying", 76), "finished");
    assert.equal(status("qualifying", 90), "finished");
    assert.equal(status("qualifying", 60 + 60), "finished");
  });

  test("a sprint is live for about 45 minutes plus a 15 minute buffer", () => {
    assert.equal(status("sprint", 30), "live");
    assert.equal(status("sprint", 45), "live");
    assert.equal(status("sprint", 60), "live");
    assert.equal(status("sprint", 61), "finished");
    assert.equal(status("sprint", 45 + 60), "finished");
  });

  test("a race stays live up to about two hours plus a 15 minute buffer", () => {
    assert.equal(status("race", 90), "live");
    assert.equal(status("race", 120), "live");
    assert.equal(status("race", 135), "live");
    assert.equal(status("race", 136), "finished");
    assert.equal(status("race", 120 + 60), "finished");
  });
});

describe("inferSessionStatus prefers a fetched end or status", () => {
  test("a real end time finishes a race the type window would still call live", () => {
    assert.equal(status("race", 90, endAfter(60)), "finished");
    assert.equal(status("race", 90), "live");
  });

  test("a session whose fetched end was an hour ago is finished", () => {
    assert.equal(status("practice", 60 + 60, endAfter(60)), "finished");
    assert.equal(status("race", 180, endAfter(120)), "finished");
  });

  test("keeps a short grace after a fetched end, then finishes", () => {
    assert.equal(status("practice", 62, endAfter(60)), "live");
    assert.equal(status("practice", 65, endAfter(60)), "live");
    assert.equal(status("practice", 66, endAfter(60)), "finished");
  });

  test("ignores a missing or unusable end and uses the session type", () => {
    assert.equal(status("practice", 90, ""), "finished");
    assert.equal(status("practice", 90, "not-a-date"), "finished");
    assert.equal(status("practice", 30, endAfter(-10)), "live");
    assert.equal(status("race", 90, "not-a-date"), "live");
  });

  test("cancelled wins before the start and during the window", () => {
    assert.equal(status("race", -30, undefined, "cancelled"), "cancelled");
    assert.equal(status("qualifying", 20, undefined, "cancelled"), "cancelled");
  });

  test("an explicit finished status ends a race early", () => {
    assert.equal(status("race", 20, undefined, "finished"), "finished");
    assert.equal(status("race", 20, endAfter(120), "finished"), "finished");
  });

  test("does not treat a session as finished before it starts", () => {
    assert.equal(status("race", -5, undefined, "finished"), "scheduled");
    assert.equal(status("race", -5, undefined, "live"), "scheduled");
  });

  test("a stale live or scheduled flag does not stretch the badge", () => {
    assert.equal(status("practice", 180, undefined, "live"), "finished");
    assert.equal(status("practice", 20, undefined, "scheduled"), "live");
    assert.equal(status("qualifying", 180, undefined, "live"), "finished");
  });

  test("an unparseable start keeps an explicit finished flag and otherwise stays scheduled", () => {
    assert.equal(
      inferSessionStatus("not-a-date", at(0), { sessionType: "race", reportedStatus: "finished" }),
      "finished",
    );
    assert.equal(inferSessionStatus("not-a-date", at(0), { sessionType: "race" }), "scheduled");
  });
});

describe("resolveSessionStatus", () => {
  test("a stored live practice that ended an hour ago is finished", () => {
    const practice = session({
      sessionType: "practice",
      sessionLabel: "Practice 1",
      status: "live",
    });
    assert.equal(resolveSessionStatus(practice, at(120)), "finished");
  });

  test("keeps a fetched finish even while the race estimate would still be live", () => {
    const race = session({
      sessionType: "race",
      sessionLabel: "Race",
      status: "finished",
      utcEnd: endAfter(120),
    });
    assert.equal(resolveSessionStatus(race, at(30)), "finished");
  });

  test("prefers a fetched end that is already an hour in the past over a stored live flag", () => {
    const race = session({
      sessionType: "race",
      sessionLabel: "Race",
      status: "live",
      utcEnd: endAfter(60),
    });
    assert.equal(resolveSessionStatus(race, at(120)), "finished");
  });

  test("keeps cancelled", () => {
    const qualifying = session({
      sessionType: "qualifying",
      sessionLabel: "Qualifying",
      status: "cancelled",
    });
    assert.equal(resolveSessionStatus(qualifying, at(10)), "cancelled");
  });
});

describe("mergeOpenF1Sessions", () => {
  test("copies the fetched end and finished status onto the matching session", () => {
    const jolpica = [
      session({ sessionType: "practice", sessionLabel: "Practice 1", status: "live" }),
    ];
    const openf1 = [
      session({
        sessionType: "practice",
        sessionLabel: "Practice 1",
        utcDate: endAfter(5),
        utcEnd: endAfter(65),
        status: "finished",
      }),
    ];

    const [merged] = mergeOpenF1Sessions(jolpica, openf1);
    assert.equal(merged?.utcDate, endAfter(5));
    assert.equal(merged?.utcEnd, endAfter(65));
    assert.equal(merged?.status, "finished");
  });

  test("does not apply Practice 1's end to Practice 2", () => {
    const jolpica = [
      session({ sessionType: "practice", sessionLabel: "Practice 1", status: "scheduled" }),
      session({ sessionType: "practice", sessionLabel: "Practice 2", status: "live" }),
    ];
    const openf1 = [
      session({
        sessionType: "practice",
        sessionLabel: "Practice 1",
        utcEnd: endAfter(60),
        status: "finished",
      }),
      session({
        sessionType: "practice",
        sessionLabel: "Practice 2",
        utcEnd: endAfter(180),
        status: "live",
      }),
    ];

    const merged = mergeOpenF1Sessions(jolpica, openf1);
    assert.equal(merged[0]?.status, "finished");
    assert.equal(merged[0]?.utcEnd, endAfter(60));
    assert.equal(merged[1]?.status, "live");
    assert.equal(merged[1]?.utcEnd, endAfter(180));
  });

  test("falls back to session type when that type appears once", () => {
    const jolpica = [session({ sessionType: "sprint", sessionLabel: "Sprint", status: "live" })];
    const openf1 = [
      session({
        sessionType: "sprint",
        sessionLabel: "Sprint Shootout Race",
        utcEnd: endAfter(40),
        status: "finished",
      }),
    ];

    const [merged] = mergeOpenF1Sessions(jolpica, openf1);
    assert.equal(merged?.status, "finished");
    assert.equal(merged?.utcEnd, endAfter(40));
  });

  test("keeps the Jolpica session when OpenF1 has nothing to add", () => {
    const jolpica = [session({ sessionType: "race", sessionLabel: "Race", status: "scheduled" })];
    assert.equal(mergeOpenF1Sessions(jolpica, []), jolpica);
    const [unchanged] = mergeOpenF1Sessions(jolpica, [
      session({ sessionType: "practice", sessionLabel: "Practice 1", status: "finished" }),
      session({ sessionType: "practice", sessionLabel: "Practice 2", status: "live" }),
    ]);
    assert.equal(unchanged?.status, "scheduled");
    assert.equal(unchanged?.utcEnd, undefined);
  });

  test("prefers a cancelled flag from the fetched session", () => {
    const jolpica = [session({ sessionType: "qualifying", sessionLabel: "Qualifying", status: "live" })];
    const openf1 = [
      session({
        sessionType: "qualifying",
        sessionLabel: "Qualifying",
        status: "cancelled",
        utcEnd: endAfter(60),
      }),
    ];
    assert.equal(mergeOpenF1Sessions(jolpica, openf1)[0]?.status, "cancelled");
  });
});
