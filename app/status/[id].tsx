import { AlbumSelectionModal } from "@/components/album/selection-modal";
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
import type { CatalystReaction, CatalystStatus, CatalystStatusPrivacy } from "@natsuneko-laboratory/catalyst-sdk";
import * as Clipboard from "expo-clipboard";
import { Image } from "expo-image";
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
  TouchableOpacity,
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
const UniImage = withUniwind(Image);
const UniMoreHorizontal = withUniwind(MoreHorizontal);
const UniPencil = withUniwind(Pencil);
const UniSafeAreaView = withUniwind(SafeAreaView);
const UniSend = withUniwind(Send);
const UniTrash2 = withUniwind(Trash2);

export default function StatusDetailsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const account = useAtomValue(accountAtom);
  const client = useAtomValue(clientAtom);
  const { subscribe, unsubscribe } = useStreamingReactions();

  const [status, setStatus] = useState<CatalystStatus | null>(null);
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
  const privacy = (status as (CatalystStatus & { privacy?: CatalystStatusPrivacy }) | null)?.privacy;
  const statusUrl = `https://catalyst.natsuneko.com/status/${id}`;

  useEffect(() => {
    if (!id) return;

    const fetchData = async () => {
      try {
        const [statusRes, metadataRes, reactionsRes] = await Promise.all([
          client.catalyst.getStatus(id),
          fetch(`https://api.natsuneko.com/epiclese/v1/tag/by/status/${id}`)
            .then((r) => r.json() as Promise<EpicleseMetadata>)
            .catch(() => ({})),
          client.catalyst.reactions(id).catch(() => ({})),
        ]);
        setStatus(statusRes);
        setMetadata(metadataRes ?? {});
        setReactions(reactionsRes);

        if (account?.credential.client) {
          const [favRes] = await Promise.all([account.credential.client.catalyst.isFavorited(id).catch(() => false)]);
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
          await account.credential.client.catalyst.reactWithCustomReaction(id, customReactionId);
        } else {
          await account.credential.client.catalyst.react(id, symbol);
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
          await account.credential.client.catalyst.unreactWithCustomReaction(id, customReactionId);
        } else {
          await account.credential.client.catalyst.unreact(id, symbol);
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
      await account.credential.client.catalyst.deleteStatus(id);
      router.back();
    } catch {
      Alert.alert("エラー", "削除に失敗しました");
    }
  }, [account, id, router]);

  const handleEditSave = useCallback(async () => {
    if (!account?.credential.client || !id || !editingCaption) return;
    setIsEditingSaving(true);
    try {
      await account.credential.client.catalyst.editStatus(id, editingCaption);
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
            <TouchableOpacity onPress={showMenu} style={{ padding: 8 }}>
              <UniMoreHorizontal size={22} className="text-black dark:text-white" />
            </TouchableOpacity>
          ),
        }}
      />

      {!status && isNotFound ? (
        <View className="flex-1 bg-light-background dark:bg-dark-background items-center justify-center">
          <UniFileQuestion size={64} className="text-light-gray dark:text-dark-gray" />
          <Text className="font-semibold text-light-gray dark:text-dark-gray mt-2 text-center">
            投稿が見つかりません
          </Text>
          <Text className="text-sm text-light-gray dark:text-dark-gray mt-2 text-center">
            削除されたか、アクセスできないコンテンツです
          </Text>
        </View>
      ) : !status ? (
        <View className="flex-1 bg-light-background dark:bg-dark-background items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      ) : (
        <ScrollView className="flex-1 bg-light-background dark:bg-dark-background">
          {/* User header */}
          <View className="flex-row items-center px-4 pt-4 pb-2">
            <TouchableOpacity onPress={() => user && router.push(`/user/${user.screenName}`)} activeOpacity={0.7}>
              {user?.profile?.iconUrl ? (
                <UniImage
                  source={{ uri: getCdnUrl({ src: user.profile.iconUrl, variant: "icon", width: 96 }) }}
                  className="h-12 w-12 rounded-full"
                  contentFit="cover"
                />
              ) : (
                <View className="h-12 w-12 rounded-full" />
              )}
            </TouchableOpacity>

            <View className="flex-1 ml-3">
              <TouchableOpacity onPress={() => user && router.push(`/user/${user.screenName}`)} activeOpacity={0.7}>
                <View className="flex-row items-center gap-1">
                  <Text className="shrink text-light-text dark:text-dark-text font-semibold text-base" numberOfLines={1}>
                    {user?.displayName ?? ""}
                  </Text>
                  <ProfileEmoji emoji={user?.profileEmoji} size={16} />
                </View>
                <Text className="text-neutral-500" numberOfLines={1}>
                  @{user?.screenName ?? ""}
                </Text>
              </TouchableOpacity>
            </View>

            <StatusVisibilityBadge privacy={privacy} />
          </View>

          {/* Media */}
          {status && status.medias.length > 0 && (
            <MediaCarousel medias={status.medias} onIndexChange={setCurrentMediaIndex} />
          )}

          {/* Body and actions */}
          <View className="p-4">
            {status && status.body.length > 0 && <StatusText status={status.body} />}

            {status && (
              <>
                <Text className="text-sm text-neutral-500 mt-2">
                  {abs(status.createdAt)} - {rel(status.createdAt)}
                </Text>

                <View className="border-t border-light-border dark:border-dark-border my-2" />

                <ActionBar isDefaultFavorited={isFavorited} status={status} />

                <View className="border-t border-light-border dark:border-dark-border my-2" />

                <ReactionBar
                  reactions={reactions}
                  onReact={handleReact}
                  onUnreact={handleUnreact}
                  onAddReaction={isLoggedIn ? () => emojiPickerRef.current?.open() : undefined}
                />

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

                  const NAME_TABLE: Record<string, string> = {
                    Author: "撮影者",
                    LocationName: "撮影場所",
                    TakenBy: "撮影者",
                    TakenAt: "撮影日時",
                    Platform: "撮影プラットフォーム",
                    World: "撮影ワールド",
                  };

                  return (
                    <>
                      <View className="border-t border-light-border dark:border-dark-border my-2" />
                      <Text className="text-sm font-semibold text-light-text dark:text-dark-text mb-2">メタデータ</Text>
                      {meta.platform && (
                        <View className="flex-row py-1.5 border-b border-light-divider dark:border-dark-divider">
                          <Text className="w-32 text-sm text-light-text-muted dark:text-dark-text-muted">
                            撮影プラットフォーム
                          </Text>
                          <Text className="flex-1 text-sm text-light-text dark:text-dark-text">{meta.platform}</Text>
                        </View>
                      )}
                      {meta.world && (
                        <View className="flex-row py-1.5 border-b border-light-divider dark:border-dark-divider">
                          <Text className="w-32 text-sm text-light-text-muted dark:text-dark-text-muted">
                            撮影ワールド
                          </Text>
                          <Pressable
                            className="flex-1"
                            onPress={() =>
                              router.push(
                                `/search/${encodeURIComponent(`platform:${meta.platform} world:"${meta.world!.name}"`)}`,
                              )
                            }
                          >
                            <Text className="text-sm text-blue-500">{meta.world.name}</Text>
                          </Pressable>
                        </View>
                      )}
                      {meta.users.length > 0 && (
                        <View className="flex-row py-1.5 border-b border-light-divider dark:border-dark-divider">
                          <Text className="w-32 text-sm text-light-text-muted dark:text-dark-text-muted">
                            写っているユーザー
                          </Text>
                          <Text className="flex-1 text-sm text-light-text dark:text-dark-text">
                            {meta.users.map((u) => u.displayName).join(", ")}
                          </Text>
                        </View>
                      )}
                      {Object.entries(meta.additionalData ?? {}).map(([key, value]) => {
                        const ref = meta.additionalData2?.[key]?.ref ?? "";
                        const isWorldLink = key === "World" && ref.startsWith("wrld_");
                        const isAuthorLink = ref.startsWith("usr_");
                        const searchQuery = isWorldLink
                          ? `platform:VRChat world:"${value}"`
                          : isAuthorLink
                            ? `takenBy:${ref}`
                            : null;

                        return (
                          <View
                            key={key}
                            className="flex-row py-1.5 border-b border-light-divider dark:border-dark-divider"
                          >
                            <Text className="w-32 text-sm text-light-text-muted dark:text-dark-text-muted">
                              {NAME_TABLE[key] ?? key}
                            </Text>
                            {searchQuery ? (
                              <Pressable
                                className="flex-1"
                                onPress={() => router.push(`/search/${encodeURIComponent(searchQuery)}`)}
                              >
                                <Text className="text-sm text-blue-500">{key === "TakenAt" ? abs(value) : value}</Text>
                              </Pressable>
                            ) : (
                              <Text className="flex-1 text-sm text-light-text dark:text-dark-text">
                                {key === "TakenAt" ? abs(value) : value}
                              </Text>
                            )}
                          </View>
                        );
                      })}
                    </>
                  );
                })()}
              </>
            )}
          </View>
        </ScrollView>
      )}

      {/* Edit caption sheet */}
      {Platform.OS === "ios" ? (
        <Modal visible={isEditSheetVisible} animationType="slide" presentationStyle="pageSheet">
          <View className="flex-1 bg-light-background dark:bg-dark-background">
            <View className="flex-row justify-between items-center px-4 py-3 border-b border-light-border dark:border-dark-border">
              <TouchableOpacity onPress={() => setIsEditSheetVisible(false)}>
                <Text className="text-[17px] text-light-tint dark:text-dark-tint">キャンセル</Text>
              </TouchableOpacity>
              <Text className="text-[17px] font-semibold text-light-text dark:text-dark-text">キャプションを編集</Text>
              <TouchableOpacity onPress={handleEditSave} disabled={isEditingSaving || editingCaption.length === 0}>
                <Text
                  className={cn(
                    "text-[17px] font-semibold text-light-tint dark:text-dark-tint",
                    (isEditingSaving || editingCaption.length === 0) && "opacity-40",
                  )}
                >
                  保存
                </Text>
              </TouchableOpacity>
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
              <TouchableOpacity onPress={() => setIsEditSheetVisible(false)} className="p-3">
                <UniArrowLeft size={24} className="text-light-text dark:text-dark-text" />
              </TouchableOpacity>
              <Text className="flex-1 text-lg font-medium ml-2 text-light-text dark:text-dark-text">
                キャプションを編集
              </Text>
              <TouchableOpacity
                onPress={handleEditSave}
                disabled={isEditingSaving || editingCaption.length === 0}
                className={cn(
                  "m-2 px-4 py-2 rounded-full bg-[#1976D2]",
                  (isEditingSaving || editingCaption.length === 0) && "bg-[#90CAF9]",
                )}
              >
                <UniCheck size={22} className="text-white" />
              </TouchableOpacity>
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
