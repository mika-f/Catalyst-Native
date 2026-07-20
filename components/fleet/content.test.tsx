import { render } from "@testing-library/react-native";
import type { FleetContentData, FleetMediaEntity, FleetStickerLike } from "@natsuneko-laboratory/fleet-renderer-react-native";
import { FleetContent } from "./content";

type CapturedProps = {
  resolveMediaUri: (media: FleetMediaEntity, containerWidthPx: number) => string;
  resolveStickerImageUrl: (sticker: FleetStickerLike) => string | undefined;
};

let captured: CapturedProps | null = null;

jest.mock("@natsuneko-laboratory/fleet-renderer-react-native", () => ({
  FleetCanvas: (props: CapturedProps) => {
    captured = props;
    return null;
  },
}));

jest.mock("expo-image", () => ({ Image: () => null }));

const FLEET: FleetContentData = {
  backgroundColor: "#000000",
  media: null,
  texts: [],
  stickers: [],
};

describe("FleetContent", () => {
  beforeEach(() => {
    captured = null;
  });

  it("FleetCanvas に resolveMediaUri / resolveStickerImageUrl を渡す", async () => {
    await render(<FleetContent fleet={FLEET} />);

    expect(captured?.resolveMediaUri).toBeInstanceOf(Function);
    expect(captured?.resolveStickerImageUrl).toBeInstanceOf(Function);
  });

  describe("resolveMediaUri", () => {
    it("getCdnUrl 経由で medium variant の URL を解決する", async () => {
      await render(<FleetContent fleet={FLEET} />);

      const media = { url: "https://cdn.natsuneko.com/image-id" } as FleetMediaEntity;
      const result = captured?.resolveMediaUri(media, 500);

      expect(result).toBe("https://cdn.natsuneko.com/image-id/medium");
    });
  });

  describe("resolveStickerImageUrl", () => {
    it("imageUrl があればそれをそのまま使う", async () => {
      await render(<FleetContent fleet={FLEET} />);

      const sticker: FleetStickerLike = { emoji: "smile", imageUrl: "https://example.com/custom.png" };
      expect(captured?.resolveStickerImageUrl(sticker)).toBe("https://example.com/custom.png");
    });

    it("imageUrl が無ければ絵文字シンボルから CDN の規約 URL を組み立てる", async () => {
      await render(<FleetContent fleet={FLEET} />);

      const sticker: FleetStickerLike = { emoji: "heart" };
      expect(captured?.resolveStickerImageUrl(sticker)).toBe(
        "https://static.natsuneko.com/images/reactions/heart.png",
      );
    });

    it("imageUrl も emoji も無ければ undefined を返す", async () => {
      await render(<FleetContent fleet={FLEET} />);

      const sticker = {} as FleetStickerLike;
      expect(captured?.resolveStickerImageUrl(sticker)).toBeUndefined();
    });
  });
});
