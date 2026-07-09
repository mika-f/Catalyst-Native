import { accountAtom } from "@/models/atoms/account";
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import type {
  CatalystCustomReaction,
  CatalystCustomReactionList,
} from "@/models/sdk-types";
import { useAtomValue } from "jotai";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { StyleSheet, Text, View, useColorScheme } from "react-native";
import { getFilteredCategories, useDefaultCategories } from "./emoji-data";
import { EmojiPickerView } from "./emoji-picker-view";
import { recordUnicodeUsage, recordUrlUsage } from "./frequency-manager";
import type { EmojiCategory, EmojiItem } from "./types";
import { emojiToCodepoints } from "./unicode";

export type EmojiPickerSheetRef = {
  open: () => void;
  close: () => void;
};

type Props = {
  onReact?: (symbol: string, url?: string, customReactionId?: string) => void;
  onEmojiSelected?: (emoji: EmojiItem) => void;
  includeCatalystReactions?: boolean;
};

export const EmojiPickerSheet = forwardRef<EmojiPickerSheetRef, Props>(
  function EmojiPickerSheet({ onReact, onEmojiSelected, includeCatalystReactions = true }, ref) {
    const theme = useColorScheme() ?? "light";
    const account = useAtomValue(accountAtom);
    const [categories, setCategories] = useState<EmojiCategory[]>([]);
    const [isCategoriesLoading, setIsCategoriesLoading] = useState(true);
    const [isPresented, setIsPresented] = useState(false);
    const bottomSheetRef = useRef<BottomSheetModal>(null);
    const { categories: defaultCategories, isLoading: isEmojiDataLoading } =
      useDefaultCategories();

    useImperativeHandle(ref, () => ({
      open: () => {
        setIsPresented(true);
        bottomSheetRef.current?.present();
      },
      close: () => {
        bottomSheetRef.current?.dismiss();
      },
    }));

    useEffect(() => {
      if (!isPresented || isEmojiDataLoading) return;

      setIsCategoriesLoading(true);
      let cancelled = false;

      const load = async () => {
        try {
          const [customReactions, userReactionList] = await Promise.all([
            account?.credential.client
              ? account.credential.client.catalyst.v1.reactions
                  .get({ throwOnError: true })
                  .then(({ data }) => data)
                  .catch(() => [] as CatalystCustomReaction[])
              : Promise.resolve([] as CatalystCustomReaction[]),
            account?.credential.client
              ? account.credential.client.catalyst.v1.customReactions
                  .get({ throwOnError: true })
                  .then(({ data }) => data)
                  .catch(() => null as CatalystCustomReactionList | null)
              : Promise.resolve(null as CatalystCustomReactionList | null),
          ]);

          if (cancelled) return;

          const builtCategories: EmojiCategory[] = [];

          const activeUserReactions =
            userReactionList?.items.filter((r) => r.status === "active") ?? [];
          if (activeUserReactions.length > 0) {
            builtCategories.push({
              id: "user-custom",
              title: "マイリアクション",
              icon: "star-plus",
              emojis: activeUserReactions.map((r) => ({
                id: `:${r.shortcode}:`,
                type: { kind: "url" as const, url: r.imageUrl, customReactionId: r.id },
                keywords: [r.displayName, r.shortcode],
              })),
            });
          }

          if (includeCatalystReactions && customReactions.length > 0) {
            builtCategories.push({
              id: "catalyst",
              title: "Catalyst",
              icon: "star",
              emojis: customReactions.map((r) => ({
                id: r.symbol,
                type: { kind: "url" as const, url: r.url },
                keywords: [r.name],
              })),
            });
          }

          const filtered = getFilteredCategories(
            ["flags", "smileys_and_people"],
            defaultCategories,
          );
          builtCategories.push(...filtered);

          setCategories(builtCategories);
        } catch (e) {
          if (cancelled) return;
          console.error("Failed to load emoji data:", e);
          setCategories(
            getFilteredCategories(
              ["flags", "smileys_and_people"],
              defaultCategories,
            ),
          );
        } finally {
          if (!cancelled) {
            setIsCategoriesLoading(false);
          }
        }
      };

      load();

      return () => {
        cancelled = true;
      };
    }, [isPresented, account, isEmojiDataLoading, defaultCategories, includeCatalystReactions]);

    const handleDismiss = useCallback(() => {
      setIsPresented(false);
    }, []);

    const handleEmojiSelected = useCallback(
      async (emoji: EmojiItem) => {
        onEmojiSelected?.(emoji);

        if (emoji.type.kind === "unicode") {
          const codepoints = emojiToCodepoints(emoji.type.emoji);
          onReact?.(codepoints);
          recordUnicodeUsage(emoji.type.emoji).catch(() => {});
        } else if (emoji.type.kind === "url") {
          onReact?.(emoji.id, emoji.type.url, emoji.type.customReactionId);
          recordUrlUsage(emoji.id, emoji.type.url).catch(() => {});
        }
        bottomSheetRef.current?.dismiss();
      },
      [onReact, onEmojiSelected],
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          disappearsOnIndex={-1}
          appearsOnIndex={0}
        />
      ),
      [],
    );

    // BottomSheetFlatList を直接 BottomSheetModal の子にするためのヘッダー
    // BottomSheetView でラップすると position:absolute で height が未定義になり、
    // FlatList の高さが正しく制約されずスクロールできなくなる
    const listHeaderPrepend = (
      <>
        <Text
          style={[
            styles.title,
            { color: theme === "dark" ? "#FFFFFF" : "#000000" },
          ]}
        >
          リアクションを追加
        </Text>
        <View
          style={[
            styles.headerDivider,
            { backgroundColor: theme === "dark" ? "#38383A" : "#E5E5EA" },
          ]}
        />
      </>
    );

    return (
      <BottomSheetModal
        ref={bottomSheetRef}
        enableDynamicSizing={false}
        snapPoints={["75%"]}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        onDismiss={handleDismiss}
        backgroundStyle={{
          backgroundColor: theme === "dark" ? "#1C1C1E" : "#FFFFFF",
        }}
        handleIndicatorStyle={{
          backgroundColor: theme === "dark" ? "#48484A" : "#C7C7CC",
        }}
      >
        {/* BottomSheetFlatList を BottomSheetModal の直接の子にすることで、
            snapPoints が高さの上限として正しく機能しスクロールが有効になる */}
        <EmojiPickerView
          categories={categories}
          onEmojiSelected={handleEmojiSelected}
          isLoading={isCategoriesLoading}
          listHeaderPrepend={listHeaderPrepend}
          FlatListComponent={BottomSheetFlatList}
        />
      </BottomSheetModal>
    );
  },
);

const styles = StyleSheet.create({
  title: {
    fontSize: 17,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 8,
  },
  headerDivider: {
    height: StyleSheet.hairlineWidth,
  },
});
