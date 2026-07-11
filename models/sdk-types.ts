import type { CatalystTS } from "@natsuneko-laboratory/catalyst-sdk";

/**
 * CatalystSDK 1.0.0-alpha.5 は OpenAPI から生成されたクライアントのみを公開しており、
 * レスポンス/リクエストの型そのものはエクスポートされていない。
 * そのため、実際のクライアントメソッドのシグネチャから型を逆算して再エクスポートする。
 */
type Client = InstanceType<typeof CatalystTS>;
// biome-ignore lint: needs to accept any client method signature to infer its response type
type ApiData<Fn extends (...args: any[]) => any> = Awaited<ReturnType<Fn>> extends { data?: infer D }
  ? NonNullable<D>
  : never;

// --- catalyst ---

export type CatalystStatusV1_1 = ApiData<Client["catalyst"]["v11"]["status"]["id"]["get"]>["status"];
export type CatalystStatus = ApiData<Client["catalyst"]["v1"]["timeline"]["home"]["get"]>["statuses"][number];
export type CatalystStatusPrivacy = NonNullable<CatalystStatusV1_1["privacy"]>;
export type Media = CatalystStatusV1_1["medias"][number];

export type CatalystAlbum = ApiData<Client["catalyst"]["v1"]["album"]["by"]["id"]["id"]["get"]>;
export type CatalystSmartAlbum = ApiData<Client["catalyst"]["v1"]["smartAlbum"]["by"]["id"]["id"]["get"]>;
export type CatalystAlbumOrSmartAlbum = ApiData<Client["catalyst"]["v1"]["album"]["search"]["get"]>["albums"][number];
export type CatalystAlbumDisplayMode = CatalystAlbum["mode"];

export type CatalystContest = ApiData<Client["catalyst"]["v1"]["contest"]["by"]["slug"]["slug"]["get"]>["contest"];

export type CatalystCustomReactionList = ApiData<Client["catalyst"]["v1"]["customReactions"]["get"]>;
export type CatalystUserCustomReaction = CatalystCustomReactionList["items"][number];
// GET /catalyst/v1/reactions — Catalyst 標準搭載のオリジナルリアクション一覧 (ユーザーがアップロードしたカスタムリアクションとは別物)
export type CatalystCustomReaction = ApiData<Client["catalyst"]["v1"]["reactions"]["get"]>[number];

export type CatalystReaction = ApiData<
  Client["catalyst"]["v1"]["status"]["id"]["reactions"]["get"]
>["reactions"][string];

export type CatalystRelationships = ApiData<Client["catalyst"]["v1"]["relationships"]["id"]["get"]>;

export type CatalystFollowListItem = ApiData<
  Client["catalyst"]["v1"]["relationships"]["by"]["username"]["username"]["followers"]["get"]
>["items"][number];

export type CatalystFleet = ApiData<Client["catalyst"]["v1"]["fleet"]["id"]["get"]>;
export type CatalystFleetRing = ApiData<Client["catalyst"]["v1"]["fleet"]["ring"]["get"]>[number];
// GET /catalyst/v1/fleet/{id}/reactions — Fleet に付与されたリアクションの一覧（投稿者本人のみ取得可能）
export type CatalystFleetReaction = ApiData<Client["catalyst"]["v1"]["fleet"]["id"]["reactions"]["get"]>[number];

export type ProfileTag = ApiData<Client["catalyst"]["v1"]["profileTags"]["by"]["user"]["id"]["get"]>["tags"][number];
export type ProfileTagSuggestion = ApiData<Client["catalyst"]["v1"]["profileTags"]["suggestions"]["get"]>["tags"][number];

export type ReportRequest = NonNullable<
  Parameters<Client["catalyst"]["v1"]["status"]["id"]["report"]["create"]>[0]["body"]
>;
export type ReportTargetType = "status" | "fleet" | "album" | "smartAlbum" | "user";

// --- egeria ---

export type EgeriaUser = ApiData<Client["egeria"]["v1"]["me"]["get"]>["user"];
export type EgeriaUserProfile = NonNullable<EgeriaUser["profile"]>;
export type ProfileEmoji = NonNullable<EgeriaUser["profileEmoji"]>;
export type ProfileEmojiRequest = NonNullable<
  NonNullable<Parameters<Client["egeria"]["v1"]["me"]["patch"]>[0]>["body"]
>["profileEmoji"];

// --- steambird ---

export type Notification = ApiData<Client["steambird"]["v1"]["notifications"]["get"]>["notifications"][number];
export type NotificationGroup = Notification["entities"][number];
