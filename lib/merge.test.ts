import { merge } from "./merge";

type Item = { id: string; value: string };

const makeSet = (...ids: string[]) => ({ current: new Set<string>(ids) });

describe("merge", () => {
  it("重複していないアイテムを末尾に追加する", () => {
    const source1: Item[] = [{ id: "1", value: "a" }];
    const source2: Item[] = [{ id: "2", value: "b" }];
    const sets = makeSet("1");

    const result = merge(source1, source2, sets, (item) => item.id);

    expect(result.map((i) => i.id)).toEqual(["1", "2"]);
  });

  it('into: "first" で先頭に追加する (pull-to-refresh)', () => {
    const source1: Item[] = [{ id: "1", value: "a" }];
    const source2: Item[] = [{ id: "2", value: "b" }];
    const sets = makeSet("1");

    const result = merge(source1, source2, sets, (item) => item.id, "first");

    expect(result.map((i) => i.id)).toEqual(["2", "1"]);
  });

  it("既知の ID を持つアイテムは除外する (ページネーションの重複排除)", () => {
    const source1: Item[] = [
      { id: "1", value: "a" },
      { id: "2", value: "b" },
    ];
    const source2: Item[] = [
      { id: "2", value: "duplicated" },
      { id: "3", value: "c" },
    ];
    const sets = makeSet("1", "2");

    const result = merge(source1, source2, sets, (item) => item.id);

    expect(result.map((i) => i.id)).toEqual(["1", "2", "3"]);
    expect(result.find((i) => i.id === "2")?.value).toBe("b");
  });

  it("追加したアイテムの ID を Set に記録する", () => {
    const sets = makeSet();

    merge<Item, "id">([], [{ id: "1", value: "a" }], sets, (item) => item.id);

    expect(sets.current.has("1")).toBe(true);
  });

  // 現状の実装は filter が先に走るため、source2 の 1 回の呼び出し内での重複は
  // 排除されない (API レスポンスの 1 ページ内に重複が無い前提)。挙動の記録。
  it("source2 内の重複は排除されない (現状の仕様)", () => {
    const source2: Item[] = [
      { id: "1", value: "first" },
      { id: "1", value: "second" },
    ];
    const sets = makeSet();

    const result = merge([], source2, sets, (item) => item.id);

    expect(result).toHaveLength(2);
  });

  it("空配列同士でも壊れない", () => {
    const sets = makeSet();

    expect(merge<Item, "id">([], [], sets, (item) => item.id)).toEqual([]);
  });
});
