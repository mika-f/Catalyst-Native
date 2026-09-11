/**
 * 検索クエリ内の `key:value` を 1 つずつ切り出すパターン。
 * 値はダブルクォートで囲むことができ、クォート内では `\"` と `\\` のエスケープを解釈する。
 *
 * クォート内の「エスケープ以外の文字」からバックスラッシュを除いているのは、
 * `\\.` と選択肢が重複すると閉じクォートの無い入力で破綻的バックトラックが起きるため。
 */
const QUALIFIER_PATTERN = /(?:^|\s)([^\s:]+):(?:"((?:\\.|[^"\\])*)"|(\S+))/g;

/** 検索クエリから `key:value` 形式の修飾子を取り出す。見つからない場合は空文字を返す。 */
export const extractSearchQualifier = (query: string, key: string): string => {
  for (const [, name, quoted, bare] of query.matchAll(QUALIFIER_PATTERN)) {
    if (name === key) {
      return quoted === undefined ? (bare ?? "") : quoted.replace(/\\(["\\])/g, "$1");
    }
  }

  return "";
};

/** `extractSearchQualifier` で元の値に戻せるよう、エスケープしてダブルクォートで囲む */
export const quoteSearchQualifier = (value: string): string => `"${value.replace(/["\\]/g, "\\$&")}"`;
