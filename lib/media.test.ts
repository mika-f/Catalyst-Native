import { getCdnUrl, getIdenticonUrl } from "./media";

describe("getIdenticonUrl", () => {
  it("id から identicon URL を組み立てる", () => {
    expect(getIdenticonUrl("abc")).toBe("https://api.natsuneko.com/egeria/v0/identicon/abc.svg");
  });

  it("id 未指定時は lumine にフォールバックする", () => {
    expect(getIdenticonUrl()).toBe("https://api.natsuneko.com/egeria/v0/identicon/lumine.svg");
  });
});

describe("getCdnUrl", () => {
  it("src が空文字なら空文字を返す", () => {
    expect(getCdnUrl({ src: "", width: 512 })).toBe("");
  });

  describe("variant ベースの CDN (imagedelivery.net / cdn / citlali)", () => {
    it("variant を付与する", () => {
      expect(
        getCdnUrl({ src: "https://imagedelivery.net/hash/image-id", variant: "timeline", width: 512 }),
      ).toBe("https://imagedelivery.net/hash/image-id/xsmall");
    });

    it("variant 未指定時は original を使う", () => {
      expect(getCdnUrl({ src: "https://cdn.natsuneko.com/image-id", width: 512 })).toBe(
        "https://cdn.natsuneko.com/image-id/original",
      );
    });

    it("互換 variant (user-icon など) を実体にマッピングする", () => {
      expect(
        getCdnUrl({ src: "https://cdn.natsuneko.com/image-id", variant: "user-icon", width: 96 }),
      ).toBe("https://cdn.natsuneko.com/image-id/tiny");
    });

    it("citlali には format=auto を付与する", () => {
      expect(
        getCdnUrl({ src: "https://citlali.natsuneko.com/image-id", variant: "thumbnail", width: 512 }),
      ).toBe("https://citlali.natsuneko.com/image-id/thumbnail?format=auto");
    });
  });

  it("api.natsuneko.com はそのまま返す", () => {
    const src = "https://api.natsuneko.com/egeria/v0/identicon/abc.svg";
    expect(getCdnUrl({ src, width: 512 })).toBe(src);
  });

  describe("クエリパラメータベースの CDN (その他のホスト)", () => {
    it("quality と width を付与し、aspect 未指定なら crop=1:1 にする", () => {
      const url = new URL(getCdnUrl({ src: "https://example.com/image.png", width: 512 }));

      expect(url.searchParams.get("quality")).toBe("85");
      expect(url.searchParams.get("width")).toBe("512");
      expect(url.searchParams.get("crop")).toBe("1:1");
    });

    it("縦長 (h > w) は fit=crop", () => {
      const url = new URL(
        getCdnUrl({ src: "https://example.com/image.png", width: 512, aspect: { w: 3, h: 4 } }),
      );

      expect(url.searchParams.get("fit")).toBe("crop");
    });

    it("横長 (w > h) は fit=fill", () => {
      const url = new URL(
        getCdnUrl({ src: "https://example.com/image.png", width: 512, aspect: { w: 16, h: 9 } }),
      );

      expect(url.searchParams.get("fit")).toBe("fill");
    });

    it("mode 指定は fit を上書きする", () => {
      const url = new URL(
        getCdnUrl({
          src: "https://example.com/image.png",
          width: 512,
          aspect: { w: 16, h: 9 },
          mode: "crop",
        }),
      );

      expect(url.searchParams.get("fit")).toBe("crop");
    });

    it("正方形 (w === h) は crop=w:h", () => {
      const url = new URL(
        getCdnUrl({ src: "https://example.com/image.png", width: 512, aspect: { w: 2, h: 2 } }),
      );

      expect(url.searchParams.get("crop")).toBe("2:2");
      expect(url.searchParams.get("fit")).toBeNull();
    });

    it("images.natsuneko.com は既存のクエリパラメータを破棄して組み立て直す", () => {
      const url = new URL(
        getCdnUrl({ src: "https://images.natsuneko.com/foo.png?token=stale", width: 512 }),
      );

      expect(url.origin).toBe("https://images.natsuneko.com");
      expect(url.pathname).toBe("/foo.png");
      expect(url.searchParams.get("token")).toBeNull();
      expect(url.searchParams.get("width")).toBe("512");
    });
  });
});
