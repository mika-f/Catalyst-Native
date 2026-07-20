import { cn } from "./utils";

describe("cn", () => {
  it("複数のクラス名を結合する", () => {
    expect(cn("text-sm", "font-bold")).toBe("text-sm font-bold");
  });

  it("falsy な値を無視する (条件付きクラス)", () => {
    expect(cn("text-sm", false && "hidden", undefined, null, "font-bold")).toBe("text-sm font-bold");
  });

  it("競合する tailwind クラスは後勝ちでマージする", () => {
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("配列やオブジェクト形式のクラス指定も扱える", () => {
    expect(cn(["text-sm", { "font-bold": true, italic: false }])).toBe("text-sm font-bold");
  });
});
