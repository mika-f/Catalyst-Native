// Epiclese メタデータ API (`GET /epiclese/v1/tag/by/status/:id`) のレスポンス型。
// サーバー側の定義は teyvat の packages/foreign-model/src/entities.ts (EpicleseMetadataEntity) を参照。

export type EpicleseItemType = "avatar" | "cloth" | "accessory" | "hair" | "gimmick" | "other";

// Web 版 (catalyst.natsuneko.com) の i18n `edit_metadata.item_type_*` と同じ文言
export const EPICLESE_ITEM_TYPE_LABELS: Record<string, string> = {
  avatar: "アバター",
  cloth: "衣装",
  accessory: "アクセサリー",
  hair: "ヘアー",
  gimmick: "ギミック",
  other: "その他",
};

export type EpicleseAuthor = {
  id: string;
  name: string;
  platformIdentifier: string;
};

// 写真上のピン。x, y は元画像に対する正規化座標 (0-10000, 万分率)
export type EpicleseReference = {
  x: number;
  y: number;
  order: number;
  reference: string; // EpicleseItem.id
  type: EpicleseItemType;
  name: string;
  description: string;
  externalUrl: string | null;
  imageUrl: string | null;
  author: EpicleseAuthor;
};

export type EpicleseWorld = {
  name: string;
  platformIdentifier: string;
};

export type EpicleseUser = {
  id: string;
  screenName: string;
  displayName: string;
};

export type EpicleseAdditionalData2 = {
  [key: string]: {
    ref?: string;
  };
};

export type EpicleseMediaMetadata = {
  platform: string | null;
  world: EpicleseWorld | null;
  users: EpicleseUser[];
  reference: EpicleseReference[];
  additionalData?: Record<string, string>;
  additionalData2?: EpicleseAdditionalData2;
};

export type EpicleseMetadata = Record<string, EpicleseMediaMetadata>;

export const getEpicleseItemUrl = (id: string) => `https://epiclese.natsuneko.com/item/${id}`;
