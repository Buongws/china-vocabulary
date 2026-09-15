import { describe, expect, it } from "vitest";
import { addStudyDays, blankExample, calculateStreak, computeSrs, isCorrectAnswer, normalizeAnswer, studyDate, suggestPace } from "./learning";

describe("answer checking", () => {
  it("accepts case, spacing, curly apostrophes and explicit alternatives", () => {
    expect(normalizeAnswer("  DON’T   know ")).toBe("don't know");
    expect(isCorrectAnswer(" GOOD   morning ", "good morning")).toBe(true);
    expect(isCorrectAnswer("colour", "color", ["colour"])).toBe(true);
    expect(isCorrectAnswer("", "")).toBe(false);
    expect(isCorrectAnswer("coffe", "coffee")).toBe(false);
  });
  it("only blanks full terms and safely handles regular expression symbols", () => {
    expect(blankExample("The teacher drinks tea. Tea is warm.", "tea")).toBe("The teacher drinks ________. ________ is warm.");
    expect(blankExample("I study C++ today.", "C++")).toBe("I study ________ today.");
    expect(blankExample("He is running.", "run")).toBeNull();
  });
});

describe("SRS scheduling", () => {
  const now = new Date("2026-09-14T16:30:00Z");
  it("uses 1, 3 and previous interval × adjusted ease for successful recall", () => {
    const first = computeSrs(null, "good", true, now);
    const second = computeSrs(first, "good", true, now);
    const third = computeSrs(second, "good", true, now);
    expect(first).toEqual({ ease: 2.5, intervalDays: 1, repetitions: 1, dueDate: "2026-09-15" });
    expect(second.intervalDays).toBe(3);
    expect(third.intervalDays).toBe(8);
    expect(computeSrs({ ease: 2.5, intervalDays: 10, repetitions: 3 }, "easy", true, now).intervalDays).toBe(26);
  });
  it("a wrong first writing attempt resets recall even when rated easy", () => {
    expect(computeSrs({ ease: 2.5, intervalDays: 30, repetitions: 8 }, "easy", false, now))
      .toEqual({ ease: 1.96, intervalDays: 1, repetitions: 0, dueDate: "2026-09-15" });
  });
  it("keeps ease above 1.3 and differentiates hard/easy", () => {
    expect(computeSrs({ ease: 1.3, intervalDays: 1, repetitions: 0 }, "forgot", true, now).ease).toBe(1.3);
    expect(computeSrs(null, "hard", true, now).ease).toBe(2.36);
    expect(computeSrs(null, "easy", true, now).ease).toBe(2.6);
  });
  it("rolls over at midnight UTC+7, including month/year boundaries", () => {
    expect(studyDate(new Date("2026-12-31T17:00:00Z"))).toBe("2027-01-01");
    expect(addStudyDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(computeSrs(null, "good", true, new Date("2026-09-14T17:00:00Z")).dueDate).toBe("2026-09-16");
  });
});

describe("streaks and pace", () => {
  const now = new Date("2026-09-14T09:00:00Z");
  it("retains yesterday’s streak until today ends and ignores duplicate/future dates", () => {
    expect(calculateStreak(["2026-09-12", "2026-09-13", "2026-09-13", "2026-09-15"], now)).toBe(2);
    expect(calculateStreak(["2026-09-11", "2026-09-12"], now)).toBe(0);
    expect(calculateStreak(["2026-09-12", "2026-09-13", "2026-09-14"], now, "2026-09-13")).toBe(2);
  });
  it("suggests a higher pace only after sustained accurate practice", () => {
    const base = { startedAt: "2026-08-31", streak: 7, accuracy: 0.8, currentTarget: 5, now };
    expect(suggestPace(base)).toBe(8);
    expect(suggestPace({ ...base, streak: 6 })).toBeNull();
    expect(suggestPace({ ...base, accuracy: 0.79 })).toBeNull();
    expect(suggestPace({ ...base, currentTarget: 10 })).toBeNull();
    expect(suggestPace({ ...base, startedAt: "2026-08-03" })).toBe(15);
  });
});
