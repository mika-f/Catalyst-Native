import { accountAtom } from "@/models/atoms/account";
import { clientAtom } from "@/models/atoms/credential";
import type { CatalystAlbum, CatalystAlbumOrSmartAlbum } from "@natsuneko-laboratory/catalyst-sdk";
import { useAtomValue } from "jotai";
import { ArrowLeft, Check, Folder, Globe, Lock } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { withUniwind } from "uniwind";

import "@/global.css";

const UniArrowLeft = withUniwind(ArrowLeft);
const UniSafeAreaView = withUniwind(SafeAreaView);

type AlbumSelectionModalProps = {
  visible: boolean;
  statusId: string;
  mode: "add" | "remove";
  onClose: () => void;
};

export function AlbumSelectionModal({ visible, statusId, mode, onClose }: AlbumSelectionModalProps) {
  const theme = useColorScheme() ?? "light";
  const account = useAtomValue(accountAtom);
  const client = useAtomValue(clientAtom);

  const [albums, setAlbums] = useState<(CatalystAlbum | CatalystAlbumOrSmartAlbum)[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const title = mode === "add" ? "アルバムへ追加" : "アルバムから削除";

  useEffect(() => {
    if (!visible || !account?.user?.screenName) return;

    const fetchAlbums = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const res =
          mode === "add"
            ? await client.catalyst.listAlbums(account?.user!.screenName, false)
            : await client.catalyst.albumsInStatus(statusId);
        setAlbums(res);

        const selected = new Set<string>();

        if (mode === "remove") {
          for (const album of res) {
            selected.add(album.id);
          }
        }
        setSelectedIds(selected);
      } catch {
        setError("アルバムの取得に失敗しました");
      } finally {
        setIsLoading(false);
      }
    };

    fetchAlbums();
  }, [visible, account, client, statusId, mode]);

  const displayAlbums = useMemo(() => {
    if (mode === "remove") {
      return albums.filter((album) => selectedIds.has(album.id));
    }
    return albums;
  }, [albums, selectedIds, mode]);

  const emptyMessage = mode === "add" ? "アルバムがありません" : "この投稿が含まれるアルバムはありません";

  const handleToggle = useCallback(
    async (album: CatalystAlbum | CatalystAlbumOrSmartAlbum) => {
      if (!account?.credential.client) return;

      const isSelected = selectedIds.has(album.id);

      try {
        if (isSelected) {
          await account.credential.client.catalyst.removeFromAlbum(album.id, statusId);
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(album.id);
            return next;
          });
          Toast.show({ type: "success", text1: `「${album.name}」から削除しました` });
        } else {
          await account.credential.client.catalyst.insertToAlbum(album.id, statusId);
          setSelectedIds((prev) => new Set(prev).add(album.id));
          Toast.show({ type: "success", text1: `「${album.name}」に追加しました` });
        }
      } catch {
        Toast.show({ type: "error", text1: "エラー", text2: "アルバムの更新に失敗しました" });
      }
    },
    [account, statusId, selectedIds],
  );

  const renderContent = () => {
    if (isLoading) {
      return (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
          <Text className="text-light-text-muted dark:text-dark-text-muted mt-3">読み込み中...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-light-text-muted dark:text-dark-text-muted text-center">{error}</Text>
        </View>
      );
    }

    if (displayAlbums.length === 0) {
      return (
        <View className="flex-1 items-center justify-center px-8">
          <Folder size={48} color={theme === "dark" ? "#888" : "#999"} />
          <Text className="text-light-text-muted dark:text-dark-text-muted mt-4">{emptyMessage}</Text>
        </View>
      );
    }

    return (
      <ScrollView className="flex-1">
        {displayAlbums.map((album) => {
          const isSelected = selectedIds.has(album.id);
          return (
            <Pressable
              key={album.id}
              style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              className="flex-row items-center px-4 py-3 border-b border-light-divider dark:border-dark-divider"
              onPress={() => handleToggle(album)}
            >
              <View className="flex-1">
                <Text className="text-light-text dark:text-dark-text text-base">{album.name}</Text>
                {album.description.length > 0 && (
                  <Text className="text-light-text-muted dark:text-dark-text-muted text-sm mt-0.5" numberOfLines={2}>
                    {album.description}
                  </Text>
                )}
                <View className="flex-row items-center mt-1">
                  {album.isPublic ? (
                    <Globe size={12} color={theme === "dark" ? "#888" : "#999"} />
                  ) : (
                    <Lock size={12} color={theme === "dark" ? "#888" : "#999"} />
                  )}
                  <Text className="text-light-text-subtle dark:text-dark-text-subtle text-xs ml-1">
                    {album.isPublic ? "公開" : "非公開"}
                  </Text>
                </View>
              </View>
              {isSelected && <Check size={20} color={theme === "dark" ? "#E8788A" : "#D4849A"} />}
            </Pressable>
          );
        })}
      </ScrollView>
    );
  };

  if (Platform.OS === "ios") {
    return (
      <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
        <View className="flex-1 bg-light-background dark:bg-dark-background">
          <View className="flex-row justify-between items-center px-4 py-3 border-b border-light-border dark:border-dark-border">
            <View className="w-15" />
            <Text className="text-lg font-semibold text-light-text dark:text-dark-text">{title}</Text>
            <TouchableOpacity onPress={onClose} className="w-15 items-end">
              <Text className="text-lg font-semibold text-light-tint dark:text-dark-tint ">完了</Text>
            </TouchableOpacity>
          </View>
          {renderContent()}
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="fade">
      <UniSafeAreaView className="flex-1 bg-light-background dark:bg-dark-background">
        <View style={[styles.toolbar, { backgroundColor: theme === "dark" ? "#1E1E1E" : "#FFFFFF" }]}>
          <TouchableOpacity onPress={onClose} className="p-3">
            <UniArrowLeft size={24} className="text-black dark:text-white" />
          </TouchableOpacity>
          <Text className="flex-1 text-lg font-medium ml-2 text-black dark:text-white">{title}</Text>
        </View>
        {renderContent()}
      </UniSafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 8,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
});
