import { render, screen } from "@testing-library/react-native";
import { CatalystText } from "./text";

// jest-expo + RNTL のパイプラインが動くことを確認するスモークテスト
// 注: RNTL v14 から render は async API
describe("CatalystText", () => {
  it("children を描画する", async () => {
    await render(<CatalystText>hello</CatalystText>);

    expect(screen.getByText("hello")).toBeOnTheScreen();
  });

  it("variant と tone のクラスを合成する", async () => {
    await render(
      <CatalystText variant="title" tone="muted">
        styled
      </CatalystText>,
    );

    const className = screen.getByText("styled").props.className as string;
    expect(className).toContain("text-lg");
    expect(className).toContain("font-bold");
    expect(className).toContain("text-light-text-muted");
  });

  it("className の後勝ちマージ (tailwind-merge) が効く", async () => {
    await render(<CatalystText className="text-xl">override</CatalystText>);

    const className = screen.getByText("override").props.className as string;
    expect(className).toContain("text-xl");
    expect(className).not.toContain("text-sm");
  });
});
