import { describe, expect, it } from "vitest";
import {
  getColumnCount,
  getItemAspect,
  getRatioWeight,
  getYouTubeEmbedUrl,
  getYouTubeThumbCandidates
} from "../../src/utils/media";

describe("media utils", () => {
  it("calculates ratio weights accurately", () => {
    expect(getRatioWeight({ ratio: "ratio-9-16" })).toBeCloseTo(16 / 9);
    expect(getRatioWeight({ ratio: "ratio-16-9" })).toBeCloseTo(9 / 16);
    expect(getRatioWeight({ ratio: "ratio-4-3" })).toBeCloseTo(3 / 4);
    expect(getRatioWeight({ ratio: "ratio-3-2" })).toBeCloseTo(2 / 3);
    expect(getRatioWeight({ aspect: "16:9" })).toBeCloseTo(9 / 16);
  });

  it("resolves aspect from item.aspect or item.ratio", () => {
    expect(getItemAspect({ aspect: "3:2" })).toBe("3:2");
    expect(getItemAspect({ ratio: "ratio-4-3" })).toBe("4:3");
    expect(getItemAspect({})).toBe("9:16");
  });

  it("returns responsive column counts", () => {
    expect(getColumnCount(375)).toBe(2);
    expect(getColumnCount(768)).toBe(2);
    expect(getColumnCount(850)).toBe(3);
    expect(getColumnCount(1440)).toBe(4);
  });

  it("builds privacy-enhanced YouTube embed URL with controls=0", () => {
    const url = getYouTubeEmbedUrl("aNsA0iwBbqc");
    expect(url).toContain("https://www.youtube-nocookie.com/embed/aNsA0iwBbqc");
    expect(url).toContain("controls=0");
    expect(url).toContain("enablejsapi=1");
  });

  it("returns YouTube thumbnail fallback order", () => {
    expect(getYouTubeThumbCandidates("abc12345678")).toEqual([
      "https://i.ytimg.com/vi/abc12345678/maxresdefault.jpg",
      "https://i.ytimg.com/vi/abc12345678/sddefault.jpg",
      "https://i.ytimg.com/vi/abc12345678/hqdefault.jpg"
    ]);
  });
});
