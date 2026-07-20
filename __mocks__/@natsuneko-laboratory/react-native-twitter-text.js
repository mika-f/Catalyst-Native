// テスト用の手動モック。`jest.mock("@natsuneko-laboratory/react-native-twitter-text")` で
// 明示的に opt-in したテストでのみ使われる。
//
// 実体は TurboModule (ネイティブ実装) なので Jest では動かせない。
// 代わりに、同じ twitter-text アルゴリズムの純 JS 実装である `twitter-text`
// パッケージ (既に依存関係にある) を使ってエンティティを抽出し、
// このパッケージの Entity 形状 ({ type, value, range: { start, end } }) に変換する。
const twtr = require("twitter-text");

function toEntity(raw) {
  const [start, end] = raw.indices;

  if (raw.url !== undefined) {
    return { type: "url", value: raw.url, range: { start, end } };
  }
  if (raw.hashtag !== undefined) {
    return { type: "hashtag", value: `#${raw.hashtag}`, range: { start, end } };
  }
  if (raw.screenName !== undefined) {
    return { type: "mention", value: `@${raw.screenName}`, range: { start, end }, listSlug: raw.listSlug || undefined };
  }
  if (raw.cashtag !== undefined) {
    return { type: "cashtag", value: `$${raw.cashtag}`, range: { start, end } };
  }

  throw new Error(`Unknown entity shape: ${JSON.stringify(raw)}`);
}

module.exports = {
  extractEntities: (text) => twtr.extractEntitiesWithIndices(text).map(toEntity),
  extractURLs: (text) => twtr.extractUrlsWithIndices(text).map(toEntity),
  extractHashtags: (text) => twtr.extractHashtagsWithIndices(text).map(toEntity),
  extractMentions: (text) => twtr.extractMentionsWithIndices(text).map(toEntity),
  extractMentionsOrLists: (text) => twtr.extractMentionsOrListsWithIndices(text).map(toEntity),
  extractCashtags: (text) => twtr.extractCashtagsWithIndices(text).map(toEntity),
};
