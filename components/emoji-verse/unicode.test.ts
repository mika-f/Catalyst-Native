import { emojiToCodepoints, emojiToTwemojiKey } from "./unicode";

describe("emojiToCodepoints", () => {
  it("単一コードポイントの絵文字を16進数に変換する", () => {
    expect(emojiToCodepoints("😀")).toBe("1f600");
  });

  it("複合絵文字 (ZWJ シーケンス) は - 区切りで連結する", () => {
    // 👨‍👩‍👧‍👦 = MAN, ZWJ, WOMAN, ZWJ, GIRL, ZWJ, BOY
    expect(emojiToCodepoints("👨‍👩‍👧‍👦")).toBe(
      "1f468-200d-1f469-200d-1f467-200d-1f466",
    );
  });

  it("4桁未満のコードポイントは0埋めする", () => {
    // U+0041 'A' -> "0041"
    expect(emojiToCodepoints("A")).toBe("0041");
  });
});

describe("emojiToTwemojiKey", () => {
  it("単純な絵文字はそのままキー化する", () => {
    expect(emojiToTwemojiKey("😀")).toBe("1f600");
  });

  it("ZWJ の直前の variation selector-16 (FE0F) は保持する", () => {
    // ❤️‍🔥 = HEAVY BLACK HEART (2764), FE0F, ZWJ (200D), FIRE (1F525)
    expect(emojiToTwemojiKey("❤️‍🔥")).toBe("2764-fe0f-200d-1f525");
  });

  it("ZWJ が続かない位置の FE0F は除去する", () => {
    // ❤️ (単体) = HEAVY BLACK HEART (2764), FE0F -- 次に ZWJ が無いので FE0F は除去される
    expect(emojiToTwemojiKey("❤️")).toBe("2764");
  });

  it("skin tone modifier を含む絵文字も変換できる", () => {
    // 👍🏽 = THUMBS UP SIGN (1f44d), EMOJI MODIFIER FITZPATRICK TYPE-4 (1f3fd)
    expect(emojiToTwemojiKey("👍🏽")).toBe("1f44d-1f3fd");
  });
});
