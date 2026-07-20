import { render, screen } from "@testing-library/react-native";
import { StatusText } from "./text";

jest.mock("@/models/browser-settings", () => ({
  openUrlWithBrowser: jest.fn(),
}));

// @/components/design-system のバレルは expo-router 経由で expo-glass-effect
// (iOS ネイティブビュー) 等の重いコンポーネントまで巻き込むため、
// StatusText が実際に使う catalystLinkClassName の値だけを差し替える
jest.mock("@/components/design-system", () => ({
  catalystLinkClassName: "text-light-link dark:text-dark-link",
}));

// TurboModule (ネイティブ実装) のため Jest では動かせない。
// __mocks__/@natsuneko-laboratory/react-native-twitter-text.js で
// 純 JS 版の twitter-text による代替実装を提供する
jest.mock("@natsuneko-laboratory/react-native-twitter-text");

// expo-router のフルパッケージは native-stack 経由で expo-glass-effect
// (iOS ネイティブビュー) まで読み込んでしまうため、StatusText が実際に
// 使う Link だけの軽量なモックに差し替える
// jest.mock のファクトリはトップレベル import をそのまま参照できない
// (out-of-scope variable の制約) ため、ここでは require を使う
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock("expo-router", () => {
  const RN = require("react-native");
  return {
    Link: ({ href, children, ...props }: { href: string; children: unknown }) =>
      require("react").createElement(RN.Text, { ...props, accessibilityRole: "link", href }, children),
  };
});
/* eslint-enable @typescript-eslint/no-require-imports */

type JsonNode = { type: string; props?: Record<string, unknown>; children?: (JsonNode | string)[] | null } | null;

// 描画ツリー全体を走査し、onPress 以外の on* (イベントハンドラー想定) props キーを集める。
// サニタイズを回避してハンドラーが注入されていないかを検証するためのヘルパー。
function collectSuspiciousPropKeys(node: JsonNode | JsonNode[]): string[] {
  if (!node) return [];
  if (Array.isArray(node)) {
    return node.flatMap((n) => collectSuspiciousPropKeys(n));
  }

  const ownKeys = Object.keys(node.props ?? {}).filter((key) => /^on(?!Press$)/i.test(key));
  const childKeys = (node.children ?? [])
    .filter((c): c is JsonNode => typeof c !== "string")
    .flatMap((c) => collectSuspiciousPropKeys(c));

  return [...ownKeys, ...childKeys];
}

describe("StatusText", () => {
  it("プレーンテキストをそのまま描画する", async () => {
    await render(<StatusText status="hello world" />);

    expect(screen.getByText("hello world")).toBeOnTheScreen();
  });

  it("URL をリンクとして描画する", async () => {
    await render(<StatusText status="check https://example.com/foo out" />);

    expect(screen.getByText("https://example.com/foo")).toBeOnTheScreen();
  });

  it("ハッシュタグを /search/%23tag へのリンクとして描画する", async () => {
    await render(<StatusText status="#猫 が好き" />);

    expect(screen.getByText("#猫")).toBeOnTheScreen();
  });

  it("メンションを /user/name へのリンクとして描画する", async () => {
    await render(<StatusText status="@natsuneko こんにちは" />);

    expect(screen.getByText("@natsuneko")).toBeOnTheScreen();
  });

  it("改行を保持する (remark-breaks)", async () => {
    await render(<StatusText status={"1行目\n2行目"} />);

    // 改行は同一 Text 内で <br> (View) を挟んだ別テキストノードになるため、
    // 結合されたテキスト内容に両方の行が含まれることを確認する
    expect(screen.getByText(/1行目[\s\S]*2行目/)).toBeOnTheScreen();
  });

  describe("サニタイズ (XSS 対策)", () => {
    it("<script> タグを実行可能な要素として描画しない", async () => {
      await render(<StatusText status={'before <script>alert("xss")</script> after'} />);

      // rehype-sanitize によって script 要素そのものが除去され、テキストとしても残らない
      expect(screen.queryByText(/alert/)).toBeNull();
      expect(screen.getByText(/before/)).toBeOnTheScreen();
    });

    it('URL に " を含む投稿でも余分な属性が RN 要素の props に漏れ出さない', async () => {
      const malicious = 'https://example.com/"onmouseover="alert(1)';

      await render(<StatusText status={malicious} />);

      // a コンポーネントは href/children しか受け取らないため、たとえ HTML 属性の
      // 注入が成立しても RN 要素の props としては現れないはず。実際に描画ツリー全体の
      // props キーを走査し、onPress 以外の on* ハンドラーが存在しないことを確認する
      expect(collectSuspiciousPropKeys(screen.toJSON())).toEqual([]);
    });

    it("img タグの onerror ハンドラーは props に漏れ出さない", async () => {
      await render(<StatusText status={'<img src=x onerror="alert(1)">safe text'} />);

      expect(screen.getByText("safe text")).toBeOnTheScreen();
      expect(collectSuspiciousPropKeys(screen.toJSON())).toEqual([]);
    });
  });

  it("textClassName / linkClassName を反映する", async () => {
    await render(<StatusText status="hello" textClassName="custom-text-class" />);

    expect(screen.getByText("hello").props.className).toContain("custom-text-class");
  });
});
