import { AlbumSelectionModal } from "@/components/album/selection-modal";
import {
  CatalystAvatar,
  CatalystEmptyState,
  CatalystIconButton,
  CatalystText,
} from "@/components/design-system";
import { EmojiPickerSheet, type EmojiPickerSheetRef } from "@/components/emoji-verse";
import { ReactionBar } from "@/components/reaction-bar";
import { ActionBar } from "@/components/status/action-bar";
import { StatusText } from "@/components/status/text";
import { StatusVisibilityBadge } from "@/components/status/visibility-badge";
import { MediaCarousel } from "@/components/ui/media-carousel";
import { ProfileEmoji } from "@/components/user/profile-emoji";
import { abs, rel } from "@/lib/dayjs";
import { getCdnUrl } from "@/lib/media";
import { getReactionKey } from "@/lib/reactions";
import { cn } from "@/lib/utils";
import { accountAtom } from "@/models/atoms/account";
import { clientAtom } from "@/models/atoms/credential";
import { openUrlWithBrowser } from "@/models/browser-settings";
import {
  applyReactionStreamingEvent,
  registerLocalReactionMutation,
  type ReactionStreamingEvent,
  useStreamingReactions,
} from "@/models/streaming";
import type { CatalystReaction, CatalystStatusV1_1 } from "@/models/sdk-types";
import * as Clipboard from "expo-clipboard";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import {
  ArrowLeft,
  Bookmark,
  BookmarkMinus,
  Check,
  Clipboard as ClipboardIcon,
  ExternalLink,
  FileQuestion,
  Flag,
  MoreHorizontal,
  Pencil,
  Send,
  Trash2,
} from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

import { BottomSheetItem } from "@/components/bottom-sheet/item";
import { BottomSheetModal, BottomSheetModalHandle } from "@/components/bottom-sheet/sheet";
import "@/global.css";
import { buildShareText } from "@/lib/share";

type EpicleseWorld = {
  name: string;
  platformIdentifier: string;
};

type EpicleseUser = {
  id: string;
  screenName: string;
  displayName: string;
};

type EpicleseAdditionalData2 = {
  [key: string]: {
    ref?: string;
  };
};

type EpicleseMediaMetadata = {
  platform: string | null;
  world: EpicleseWorld | null;
  users: EpicleseUser[];
  reference: unknown[];
  additionalData?: Record<string, string>;
  additionalData2?: EpicleseAdditionalData2;
};

type EpicleseMetadata = Record<string, EpicleseMediaMetadata>;

type MenuAction =
  | "addToAlbum"
  | "removeFromAlbum"
  | "edit"
  | "delete"
  | "report"
  | "openInBrowser"
  | "copyUrl"
  | "copyPost"
  | "share";

const UniArrowLeft = withUniwind(ArrowLeft);
const UniBookmark = withUniwind(Bookmark);
const UniBookmarkMinus = withUniwind(BookmarkMinus);
const UniCheck = withUniwind(Check);
const UniClipboardIcon = withUniwind(ClipboardIcon);
const UniExternalLink = withUniwind(ExternalLink);
const UniFileQuestion = withUniwind(FileQuestion);
const UniFlag = withUniwind(Flag);
const UniMoreHorizontal = withUniwind(MoreHorizontal);
const UniPencil = withUniwind(Pencil);
const UniSafeAreaView = withUniwind(SafeAreaView);
const UniSend = withUniwind(Send);
const UniTrash2 = withUniwind(Trash2);

const METADATA_LABELS: Record<string, string> = {
  Author: "撮影者",
  LocationName: "撮影場所",
  TakenBy: "撮影者",
  TakenAt: "撮影日時",
  Platform: "撮影プラットフォーム",
  World: "撮影ワールド",
};

export default function StatusDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const account = useAtomValue(accountAtom);
  const client = useAtomValue(clientAtom);
  const { subscribe, unsubscribe } = useStreamingReactions();

  const [status, setStatus] = useState<CatalystStatusV1_1 | null>(null);
  const [metadata, setMetadata] = useState<EpicleseMetadata>({});
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const [reactions, setReactions] = useState<Record<string, CatalystReaction>>({});
  const [editingCaption, setEditingCaption] = useState("");
  const [isEditSheetVisible, setIsEditSheetVisible] = useState(false);
  const [isAlbumSelectionVisible, setIsAlbumSelectionVisible] = useState(false);
  const [albumSelectionMode, setAlbumSelectionMode] = useState<"add" | "remove">("add");
  const [isEditingSaving, setIsEditingSaving] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isNotFound, setIsNotFound] = useState(false);
  const emojiPickerRef = useRef<EmojiPickerSheetRef>(null);
  const menuSheetRef = useRef<BottomSheetModalHandle>(null);

  const isMyself = account?.user?.id === status?.user?.id;
  const isLoggedIn = account !== null;
  const privacy = status?.privacy;
  const statusUrl = `https://catalyst.natsuneko.com/status/${id}`;

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [statusRes, metadataRes, reactionsRes] = await Promise.all([
          client.catalyst.v11.status.id.get({ path: { id }, throwOnError: true }).then(({ data }) => data.status),
          fetch(`https://api.natsuneko.com/epiclese/v1/tag/by/status/${id}`)
            .then((r) => r.json() as Promise<EpicleseMetadata>)
            .catch(() => ({})),
          client.catalyst.v1.status.id.reactions
            .get({ path: { id }, throwOnError: true })
            .then(({ data }) => data.reactions)
            .catch(() => ({})),
        ]);
        setStatus(statusRes);
        setMetadata(metadataRes ?? {});
        setReactions(reactionsRes);

        if (account?.credential.client) {
          const [favRes] = await Promise.all([
            account.credential.client.catalyst.v1.status.id.favorite
              .get({ path: { id }, throwOnError: true })
              .then(({ data }) => data)
              .catch(() => false),
          ]);
          setIsFavorited(favRes as boolean);
        }
      } catch {
        setIsNotFound(true);
      }
    };

    fetchData();
  }, [id, account, client]);

  const handleStreamingReaction = useCallback(
    (event: ReactionStreamingEvent) => {
      setReactions((prev) => applyReactionStreamingEvent(prev, event, `status-detail:${id}`));
    },
    [id],
  );

  useEffect(() => {
    if (!id) return;

    subscribe(id, handleStreamingReaction);
    return () => {
      unsubscribe(id, handleStreamingReaction);
    };
  }, [handleStreamingReaction, id, subscribe, unsubscribe]);

  const handleReact = useCallback(
    async (symbol: string, url?: string, customReactionId?: string) => {
      if (!account?.credential.client || !id) return;
      const snapshot = reactions;
      const key = getReactionKey(symbol, customReactionId);
      setReactions((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          symbol,
          url: url ?? prev[key]?.url,
          customReactionId: customReactionId ?? prev[key]?.customReactionId,
          count: (prev[key]?.count ?? 0) + 1,
          hasSelfReaction: true,
        },
      }));
      const rollbackLocalMutation = registerLocalReactionMutation(id, "reaction:increment", symbol, customReactionId);
      try {
        if (customReactionId) {
          await account.credential.client.catalyst.v1.status.id.reactions.custom.customReactionId.create({
            path: { id, customReactionId },
            throwOnError: true,
          });
        } else {
          await account.credential.client.catalyst.v1.status.id.reactions.symbol.create({
            path: { id, symbol },
            throwOnError: true,
          });
        }
      } catch {
        rollbackLocalMutation();
        setReactions(snapshot);
        Alert.alert("エラー", "リアクションに失敗しました");
      }
    },
    [account, id, reactions],
  );

  const handleUnreact = useCallback(
    async (symbol: string, customReactionId?: string) => {
      if (!account?.credential.client || !id) return;
      const snapshot = reactions;
      const key = getReactionKey(symbol, customReactionId);
      setReactions((prev) => ({
        ...prev,
        [key]: { ...prev[key], count: Math.max(0, (prev[key]?.count ?? 0) - 1), hasSelfReaction: false },
      }));
      const rollbackLocalMutation = registerLocalReactionMutation(id, "reaction:decrement", symbol, customReactionId);
      try {
        if (customReactionId) {
          await account.credential.client.catalyst.v1.status.id.reactions.custom.customReactionId.delete({
            path: { id, customReactionId },
            throwOnError: true,
          });
        } else {
          await account.credential.client.catalyst.v1.status.id.reactions.symbol.delete({
            path: { id, symbol },
            throwOnError: true,
          });
        }
      } catch {
        rollbackLocalMutation();
        setReactions(snapshot);
        Alert.alert("エラー", "リアクションの取り消しに失敗しました");
      }
    },
    [account, id, reactions],
  );

  const handleDeleteStatus = useCallback(async () => {
    if (!account?.credential.client || !id) return;
    try {
      await account.credential.client.catalyst.v1.status.id.delete({ path: { id }, throwOnError: true });
      router.back();
    } catch {
      Alert.alert("エラー", "削除に失敗しました");
    }
  }, [account, id, router]);

  const handleEditSave = useCallback(async () => {
    if (!account?.credential.client || !id || !editingCaption) return;
    setIsEditingSaving(true);
    try {
      await account.credential.client.catalyst.v1.status.id.patch({
        path: { id },
        body: { description: editingCaption },
        throwOnError: true,
      });
      setStatus((prev) => (prev ? { ...prev, body: editingCaption } : prev));
      setIsEditSheetVisible(false);
    } catch {
      Alert.alert("エラー", "更新に失敗しました");
    } finally {
      setIsEditingSaving(false);
    }
  }, [account, id, editingCaption]);

  const handleMenuAction = useCallback(
    (action: MenuAction) => {
      switch (action) {
        case "addToAlbum":
          setAlbumSelectionMode("add");
          setIsAlbumSelectionVisible(true);
          break;
        case "removeFromAlbum":
          setAlbumSelectionMode("remove");
          setIsAlbumSelectionVisible(true);
          break;
        case "edit":
          setEditingCaption(status?.body ?? "");
          setIsEditSheetVisible(true);
          break;
        case "delete":
          Alert.alert("この投稿を削除しますか？", "この操作は取り消せません", [
            { text: "キャンセル", style: "cancel" },
            { text: "削除", style: "destructive", onPress: handleDeleteStatus },
          ]);
          break;
        case "report":
          router.push(`/report/${id}`);
          break;
        case "openInBrowser":
          openUrlWithBrowser(statusUrl);
          break;
        case "copyUrl":
          Clipboard.setStringAsync(statusUrl);
          break;
        case "copyPost":
          Clipboard.setStringAsync(
            `${buildShareText(status?.body ?? "", status?.user?.displayName ?? "", "")}\n\n${statusUrl}`,
          );
          break;
        case "share":
          if (Platform.OS === "ios") {
            Share.share({
              message: buildShareText(status?.body ?? "", status?.user?.displayName ?? "", ""),
              url: statusUrl,
            });
          } else {
            Share.share({
              message: buildShareText(status?.body ?? "", status?.user?.displayName ?? "", statusUrl),
            });
          }
          break;
      }
    },
    [status, statusUrl, handleDeleteStatus, id, router],
  );

  const showMenu = useCallback(() => {
    menuSheetRef.current?.present();
  }, []);

  const handleMenuItemPress = useCallback(
    (action: MenuAction) => {
      menuSheetRef.current?.dismiss();
      handleMenuAction(action);
    },
    [handleMenuAction],
  );

  const user = status?.user;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <CatalystIconButton label="メニュー" size="sm" tone="ghost" onPress={showMenu}>
              <UniMoreHorizontal className="text-light-tint dark:text-dark-tint" />
            </CatalystIconButton>
          ),
        }}
      />

      {!status && isNotFound ? (
        <View className="flex-1 bg-light-background dark:bg-dark-background">
          <CatalystEmptyState
            title="投稿が見つかりません"
            description="削除されたか、アクセスできないコンテンツです"
            icon={<UniFileQuestion />}
          />
        </View>
      ) : !status ? (
        <View className="flex-1 bg-light-background dark:bg-dark-background items-center justify-center">
          <ActivityIndicator size="large" colorClassName="accent-light-tint dark:accent-dark-tint" />
        </View>
      ) : (
        <ScrollView
          className="flex-1 bg-light-surface-muted dark:bg-dark-background"
          contentContainerClassName="pb-6"
        >
          <View className="bg-light-background dark:bg-dark-surface">
            <View className="px-5 pb-4 pt-4">
              <View className="flex-row items-center">
                <Pressable
                  accessibilityRole="button"
                  className="active:opacity-75"
                  onPress={() => user && router.push(`/user/${user.screenName}`)}
                >
                  <CatalystAvatar
                    source={
                      user?.profile?.iconUrl
                        ? getCdnUrl({ src: user.profile.iconUrl, variant: "icon", width: 96 })
                        : null
                    }
                    fallback={user?.displayName}
                    size="lg"
                  />
                </Pressable>

                <Pressable
                  accessibilityRole="button"
                  className="ml-3 min-w-0 flex-1 active:opacity-75"
                  onPress={() => user && router.push(`/user/${user.screenName}`)}
                >
                  <View className="flex-row items-center gap-1">
                    <CatalystText variant="subtitle" className="min-w-0 shrink" numberOfLines={1}>
                      {user?.displayName ?? ""}
                    </CatalystText>
                    <ProfileEmoji emoji={user?.profileEmoji} size={16} />
                  </View>
                  <CatalystText variant="body" tone="muted" numberOfLines={1}>
                    @{user?.screenName ?? ""}
                  </CatalystText>
                </Pressable>

                <StatusVisibilityBadge className="ml-2 self-center" privacy={privacy} />
              </View>
            </View>

            {status.medias.length > 0 ? (
              <MediaCarousel medias={status.medias} onIndexChange={setCurrentMediaIndex} />
            ) : null}

            <View className="px-5 py-4">
              {status.body.length > 0 ? (
                <View>
                  <StatusText
                    status={status.body}
                    textClassName="text-[17px] leading-6 text-light-text dark:text-dark-text"
                    linkClassName="text-[17px] leading-6 text-light-tint dark:text-dark-tint"
                  />
                </View>
              ) : null}

              <View className={status.body.length > 0 ? "mt-4 flex-row items-center" : "flex-row items-center"}>
                <CatalystText variant="caption" tone="muted">
                  {abs(status.createdAt)}
                </CatalystText>
                <CatalystText variant="caption" tone="muted">
                  {" · "}
                  {rel(status.createdAt)}
                </CatalystText>
              </View>

              <View className="my-3 h-px bg-light-divider dark:bg-dark-divider" />

              <ActionBar isDefaultFavorited={isFavorited} status={status} />

              <View className="my-3 h-px bg-light-divider dark:bg-dark-divider" />

              <ReactionBar
                reactions={reactions}
                onReact={handleReact}
                onUnreact={handleUnreact}
                onAddReaction={isLoggedIn ? () => emojiPickerRef.current?.open() : undefined}
              />
            </View>
          </View>

          {(() => {
            const currentMedia = status.medias[currentMediaIndex];
            const meta = currentMedia ? metadata[currentMedia.id] : undefined;
            if (!meta) return null;
            const hasContent =
              meta.platform ||
              meta.world ||
              meta.users.length > 0 ||
              Object.keys(meta.additionalData ?? {}).length > 0;
            if (!hasContent) return null;

            return (
              <View className="mt-3 bg-light-background px-5 py-4 dark:bg-dark-surface">
                <CatalystText variant="subtitle" className="mb-2 text-[15px]">
                  メタデータ
                </CatalystText>
                {meta.platform ? (
                  <View className="flex-row border-b border-light-divider py-2 dark:border-dark-divider">
                    <CatalystText variant="caption" tone="muted" className="w-32">
                      撮影プラットフォーム
                    </CatalystText>
                    <CatalystText variant="caption" className="flex-1">
                      {meta.platform}
                    </CatalystText>
                  </View>
                ) : null}
                {meta.world ? (
                  <View className="flex-row border-b border-light-divider py-2 dark:border-dark-divider">
                    <CatalystText variant="caption" tone="muted" className="w-32">
                      撮影ワールド
                    </CatalystText>
                    <Pressable
                      className="flex-1 active:opacity-75"
                      onPress={() =>
                        router.push(
                          `/search/${encodeURIComponent(`platform:${meta.platform} world:"${meta.world!.name}"`)}`,
                        )
                      }
                    >
                      <CatalystText variant="caption" tone="tint">
                        {meta.world.name}
                      </CatalystText>
                    </Pressable>
                  </View>
                ) : null}
                {meta.users.length > 0 ? (
                  <View className="flex-row border-b border-light-divider py-2 dark:border-dark-divider">
                    <CatalystText variant="caption" tone="muted" className="w-32">
                      写っているユーザー
                    </CatalystText>
                    <CatalystText variant="caption" className="flex-1">
                      {meta.users.map((u) => u.displayName).join(", ")}
                    </CatalystText>
                  </View>
                ) : null}
                {Object.entries(meta.additionalData ?? {}).map(([key, value]) => {
                  const ref = meta.additionalData2?.[key]?.ref ?? "";
                  const isWorldLink = key === "World" && ref.startsWith("wrld_");
                  const isAuthorLink = ref.startsWith("usr_");
                  const searchQuery = isWorldLink
                    ? `platform:VRChat world:"${value}"`
                    : isAuthorLink
                      ? `takenBy:${ref}`
                      : null;
                  const displayValue = key === "TakenAt" ? abs(value) : value;

                  return (
                    <View key={key} className="flex-row border-b border-light-divider py-2 dark:border-dark-divider">
                      <CatalystText variant="caption" tone="muted" className="w-32">
                        {METADATA_LABELS[key] ?? key}
                      </CatalystText>
                      {searchQuery ? (
                        <Pressable
                          className="flex-1 active:opacity-75"
                          onPress={() => router.push(`/search/${encodeURIComponent(searchQuery)}`)}
                        >
                          <CatalystText variant="caption" tone="tint">
                            {displayValue}
                          </CatalystText>
                        </Pressable>
                      ) : (
                        <CatalystText variant="caption" className="flex-1">
                          {displayValue}
                        </CatalystText>
                      )}
                    </View>
                  );
                })}
              </View>
            );
          })()}
        </ScrollView>
      )}

      {/* Edit caption sheet */}
      {Platform.OS === "ios" ? (
        <Modal visible={isEditSheetVisible} animationType="slide" presentationStyle="pageSheet">
          <View className="flex-1 bg-light-background dark:bg-dark-background">
            <View className="flex-row justify-between items-center px-4 py-3 border-b border-light-border dark:border-dark-border">
              <Pressable className="active:opacity-70" onPress={() => setIsEditSheetVisible(false)}>
                <Text className="text-[17px] text-light-tint dark:text-dark-tint">キャンセル</Text>
              </Pressable>
              <Text className="text-[17px] font-semibold text-light-text dark:text-dark-text">キャプションを編集</Text>
              <Pressable
                className="active:opacity-70 disabled:opacity-40"
                onPress={handleEditSave}
                disabled={isEditingSaving || editingCaption.length === 0}
              >
                <Text
                  className={cn(
                    "text-[17px] font-semibold text-light-tint dark:text-dark-tint",
                    (isEditingSaving || editingCaption.length === 0) && "opacity-40",
                  )}
                >
                  保存
                </Text>
              </Pressable>
            </View>
            <TextInput
              className="flex-1 p-4 text-base text-light-text dark:text-dark-text"
              value={editingCaption}
              onChangeText={setEditingCaption}
              multiline
              autoFocus
              textAlignVertical="top"
            />
          </View>
        </Modal>
      ) : (
        <Modal visible={isEditSheetVisible} animationType="fade">
          <UniSafeAreaView className="flex-1 bg-light-background dark:bg-dark-background">
            <View
              className="flex-row items-center px-1 py-2 bg-light-background dark:bg-dark-background"
              style={{ elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 2 }}
            >
              <Pressable onPress={() => setIsEditSheetVisible(false)} className="p-3 active:opacity-70">
                <UniArrowLeft size={24} className="text-light-text dark:text-dark-text" />
              </Pressable>
              <Text className="flex-1 text-lg font-medium ml-2 text-light-text dark:text-dark-text">
                キャプションを編集
              </Text>
              <Pressable
                onPress={handleEditSave}
                disabled={isEditingSaving || editingCaption.length === 0}
                className={cn(
                  "m-2 rounded-full bg-light-tint px-4 py-2 active:opacity-80 dark:bg-dark-tint",
                  (isEditingSaving || editingCaption.length === 0) && "opacity-40",
                )}
              >
                <UniCheck size={22} className="text-light-tint-foreground dark:text-dark-tint-foreground" />
              </Pressable>
            </View>
            <TextInput
              className="flex-1 p-4 text-base text-light-text dark:text-dark-text"
              value={editingCaption}
              onChangeText={setEditingCaption}
              multiline
              autoFocus
              textAlignVertical="top"
            />
          </UniSafeAreaView>
        </Modal>
      )}

      {/* Album selection modal */}
      <AlbumSelectionModal
        visible={isAlbumSelectionVisible}
        statusId={id}
        mode={albumSelectionMode}
        onClose={() => setIsAlbumSelectionVisible(false)}
      />

      {/* Reaction picker sheet */}
      <EmojiPickerSheet ref={emojiPickerRef} onReact={handleReact} />

      {/* Action menu */}
      <BottomSheetModal ref={menuSheetRef}>
        {isLoggedIn && (
          <View>
            <BottomSheetItem
              prefixIcon={UniBookmark}
              title="アルバムへ追加"
              onPress={() => handleMenuItemPress("addToAlbum")}
              highlight
            />
            <BottomSheetItem
              prefixIcon={UniBookmarkMinus}
              title="アルバムから削除"
              onPress={() => handleMenuItemPress("removeFromAlbum")}
              highlight
            />

            <View className="border-b my-2 border-light-divider dark:border-dark-divider" />
          </View>
        )}
        {isMyself && (
          <View>
            <BottomSheetItem prefixIcon={UniPencil} title="編集する" onPress={() => handleMenuItemPress("edit")} />
            <BottomSheetItem
              prefixIcon={UniTrash2}
              title="削除する"
              onPress={() => handleMenuItemPress("delete")}
              destructive
            />
          </View>
        )}
        {!isMyself && isLoggedIn && (
          <View>
            <BottomSheetItem
              prefixIcon={UniFlag}
              title="報告する"
              onPress={() => handleMenuItemPress("report")}
              destructive
            />
          </View>
        )}
        <View>
          {(isLoggedIn || isMyself) && <View className="border-b my-2 border-light-divider dark:border-dark-divider" />}
          <BottomSheetItem
            prefixIcon={UniExternalLink}
            title="ブラウザで開く"
            onPress={() => handleMenuItemPress("openInBrowser")}
            highlight
          />
          <BottomSheetItem
            prefixIcon={UniClipboardIcon}
            title="URL をコピー"
            onPress={() => handleMenuItemPress("copyUrl")}
            highlight
          />
          <BottomSheetItem
            prefixIcon={UniClipboardIcon}
            title="投稿をコピー"
            onPress={() => handleMenuItemPress("copyPost")}
            highlight
          />
          <BottomSheetItem
            prefixIcon={UniSend}
            title="共有する"
            onPress={() => handleMenuItemPress("share")}
            highlight
          />
        </View>
      </BottomSheetModal>
    </>
  );
}
