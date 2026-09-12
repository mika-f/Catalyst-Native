/**
 * Store screenshot content.
 *
 * This is the only file you normally need to edit. Keep `headline` to two
 * short lines so the app screen remains the hero of every image.
 */
export interface StoreFormat {
  label: string;
  width: number;
  height: number;
}

export interface StoreSlide {
  slug: string;
  number: string;
  eyebrow: string;
  headline: [string, string];
  note: string;
  screenshot: { [key in FormatKey]: string };
  accent: string;
  accentSoft: string;
}

export const formats = {
  "app-store": {
    label: "App Store · 6.5-inch",
    width: 1284,
    height: 2778,
  },
  "app-store-ipad": {
    label: "App Store · iPad",
    width: 2048,
    height: 2732,
  },
  "google-play": {
    label: "Google Play · phone",
    width: 1080,
    height: 1920,
  },
} satisfies Record<string, StoreFormat>;

export type FormatKey = keyof typeof formats;

export const slides: StoreSlide[] = [
  {
    slug: "timeline",
    number: "01",
    eyebrow: "タイムライン",
    headline: ["好きな世界が、", "今日も流れてくる。"],
    note: "フォロー中もグローバルも、ひとつのアプリで。",
    screenshot: {
      "app-store": "IMG_1675.PNG",
      "app-store-ipad": "IMG_0072.PNG",
      "google-play": "IMG_1675.PNG",
    },
    accent: "#f28bb2",
    accentSoft: "#fde8f0",
  },
  {
    slug: "profile",
    number: "02",
    eyebrow: "プロフィール",
    headline: ["あなたらしさを、", "ひとつの場所に。"],
    note: "投稿もギャラリーもアルバムも。大切な記録をプロフィールに。",
    screenshot: {
      "app-store": "IMG_1679.PNG",
      "app-store-ipad": "IMG_0073.PNG",
      "google-play": "IMG_1679.PNG",
    },
    accent: "#608bcf",
    accentSoft: "#e5edfa",
  },
  {
    slug: "gallery",
    number: "03",
    eyebrow: "ギャラリー",
    headline: ["思い出を並べる。", "また、好きになる。"],
    note: "VRで見つけた景色や作品を、美しいグリッドで振り返れます。",
    screenshot: {
      "app-store": "IMG_1676.PNG",
      "app-store-ipad": "IMG_0074.PNG",
      "google-play": "IMG_1676.PNG",
    },
    accent: "#8b71cf",
    accentSoft: "#eee9fb",
  },
  {
    slug: "contest",
    number: "04",
    eyebrow: "コンテスト",
    headline: ["作品を持ち寄れば、", "世界はもっと面白い。"],
    note: "コンテストを見つけて、投稿して、みんなで楽しもう。",
    screenshot: {
      "app-store": "IMG_1677.PNG",
      "app-store-ipad": "IMG_0075.PNG",
      "google-play": "IMG_1677.PNG",
    },
    accent: "#db854d",
    accentSoft: "#faeadf",
  },
  {
    slug: "metadata",
    number: "05",
    eyebrow: "メタデータ",
    headline: ["どんなコーディネートも", "もっとわかりやすく。"],
    note: "作品にメタデータを追加して、みんなで共有しよう。",
    screenshot: {
      "app-store": "IMG_1680.PNG",
      "app-store-ipad": "IMG_0076.PNG",
      "google-play": "IMG_1680.PNG",
    },
    accent: "#258ea8",
    accentSoft: "#e2f3f6",
  },
];
