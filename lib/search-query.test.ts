import { extractSearchQualifier, quoteSearchQualifier } from "./search-query";

describe("extractSearchQualifier", () => {
  it("該当する修飾子が無ければ空文字を返す", () => {
    expect(extractSearchQualifier("#Eku3D myworld:Foo", "world")).toBe("");
  });

  // 閉じクォートが無い入力で破綻的バックトラックを起こさない
  it("閉じられていないクォートでも即座に返る", () => {
    const started = Date.now();

    extractSearchQualifier(`world:"${"\\".repeat(64)}`, "world");

    expect(Date.now() - started).toBeLessThan(1000);
  });
});

describe("quoteSearchQualifier", () => {
  // ワールド名には空白や ASCII 記号がそのまま入りうる
  it.each(["Chill Space", 'platform:Fake world:"Nested"', '!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~'])(
    "%s を往復できる",
    (name) => {
      const query = `platform:VRChat world:${quoteSearchQualifier(name)}`;

      expect(extractSearchQualifier(query, "world")).toBe(name);
      expect(extractSearchQualifier(query, "platform")).toBe("VRChat");
    },
  );
});
