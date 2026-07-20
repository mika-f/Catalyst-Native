import twtr from "twitter-text";
import { buildShareText } from "./share";

const URL = "https://catalyst.natsuneko.com/status/123";

describe("buildShareText", () => {
  it("短いテキストはそのまま連結される", () => {
    const result = buildShareText("hello world", "natsuneko", URL);

    expect(result).toBe(`hello world by natsuneko | Catalyst ${URL}`);
  });

  it("280 文字 (twitter-text 換算) を超えない場合は省略しない", () => {
    const text = "a".repeat(50);
    const result = buildShareText(text, "user", URL);

    expect(result).not.toContain("...");
    expect(result).toBe(`${text} by user | Catalyst ${URL}`);
  });

  it("収まらない長さのテキストは省略記号付きで切り詰める", () => {
    const text = "a".repeat(400);
    const result = buildShareText(text, "natsuneko", URL);

    expect(result).toContain("...");
    expect(result).toContain("by natsuneko | Catalyst");
    expect(result.endsWith(URL)).toBe(true);
    expect(twtr.getTweetLength(result)).toBeLessThanOrEqual(280);
  });

  it("全角文字を含む長いテキストでも重み付き文字数で切り詰める (raw index ではない)", () => {
    const text = "あ".repeat(200);
    const result = buildShareText(text, "user", URL);

    expect(result).toContain("...");
    expect(twtr.getTweetLength(result)).toBeLessThanOrEqual(280);
  });

  it("ユーザー名が長い場合でも破綻しない", () => {
    const text = "a".repeat(300);
    const result = buildShareText(text, "a".repeat(50), URL);

    expect(twtr.getTweetLength(result)).toBeLessThanOrEqual(280);
  });
});
