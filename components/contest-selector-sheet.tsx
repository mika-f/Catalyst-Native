import { useAsyncEffect } from "@/hooks/use-async-effect";
import { getCdnUrl } from "@/lib/media";
import { clientAtom } from "@/models/atoms/credential";
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import type { CatalystContest } from "@natsuneko-laboratory/catalyst-sdk";
import dayjs from "dayjs";
import { Image } from "expo-image";
import { useAtomValue } from "jotai";
import { Trophy } from "lucide-react-native";
import React, { useCallback, useImperativeHandle, useRef, useState } from "react";
import { Pressable, Text, View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);
const UniTrophy = withUniwind(Trophy);

const fmt = (d: string) => dayjs(d).format("YYYY/MM/DD");

export type ContestSelectorSheetRef = {
  open: () => void;
  close: () => void;
};

type Props = {
  ref: React.Ref<ContestSelectorSheetRef>;
  onSelect: (contest: CatalystContest) => void;
};

export const ContestSelectorSheet = ({ onSelect, ref }: Props) => {
  const theme = useColorScheme() ?? "light";
  const client = useAtomValue(clientAtom);
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const insets = useSafeAreaInsets();

  const [query, setQuery] = useState("");
  const [contests, setContests] = useState<CatalystContest[]>([]);

  useAsyncEffect(async () => {
    if (client) {
      const result = await client.catalyst.searchContests(query || undefined, "opening");
      setContests(result);
    }
  }, [client, query]);

  useImperativeHandle(ref, () => ({
    open: () => {
      bottomSheetRef.current?.present();
    },
    close: () => {
      bottomSheetRef.current?.dismiss();
    },
  }));

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  );

  const handleSelect = useCallback(
    (contest: CatalystContest) => {
      bottomSheetRef.current?.dismiss();
      onSelect(contest);
    },
    [onSelect],
  );

  const renderItem = useCallback(
    ({ item }: { item: CatalystContest }) => (
      <Pressable
        onPress={() => handleSelect(item)}
        className="flex-row items-center gap-3 px-4 py-3 border-b border-light-divider dark:border-dark-divider"
      >
        {item.headerUrl ? (
          <UniImage
            source={{ uri: getCdnUrl({ src: item.headerUrl, variant: "header", width: 120 }) }}
            className="w-16 h-10 rounded-lg"
            contentFit="cover"
          />
        ) : (
          <View className="w-16 h-10 rounded-lg bg-light-surface-muted dark:bg-dark-surface-muted items-center justify-center">
            <UniTrophy size={20} className="text-light-text-subtle dark:text-dark-text-subtle" />
          </View>
        )}
        <View className="flex-1 gap-0.5">
          <Text className="text-sm font-semibold text-light-text dark:text-dark-text" numberOfLines={1}>
            {item.title}
          </Text>
          {item.theme ? (
            <Text className="text-xs text-light-text-muted dark:text-dark-text-muted" numberOfLines={1}>
              テーマ: {item.theme}
            </Text>
          ) : null}
          <Text className="text-xs text-light-text-subtle dark:text-dark-text-subtle">受付終了: {fmt(item.until)}</Text>
        </View>
      </Pressable>
    ),
    [handleSelect],
  );

  const listHeader = (
    <>
      <Text className="py-3 text-center text-[17px] font-semibold text-light-text dark:text-dark-text">
        コンテストを選択
      </Text>
      <View className="h-px bg-light-divider dark:bg-dark-divider" />
      <View className="mx-4 my-3 rounded-lg bg-light-surface dark:bg-dark-surface border border-light-border dark:border-dark-border px-3 py-2">
        <BottomSheetTextInput
          value={query}
          onChangeText={setQuery}
          placeholder="コンテストを検索..."
          placeholderTextColor={theme === "dark" ? "#666" : "#999"}
          style={{ fontSize: 14, color: theme === "dark" ? "#F0F0F0" : "#1A1A1A" }}
          returnKeyType="search"
        />
      </View>
    </>
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      snapPoints={["60%", "90%"]}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: theme === "dark" ? "#1C1C1E" : "#FFFFFF",
      }}
      handleIndicatorStyle={{
        backgroundColor: theme === "dark" ? "#48484A" : "#C7C7CC",
      }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetFlatList
        data={contests}
        keyExtractor={(item) => item.slug}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        ListEmptyComponent={
          <View className="items-center justify-center py-12">
            <UniTrophy size={40} className="text-light-text-subtle dark:text-dark-text-subtle mb-3" />
            <Text className="text-sm text-light-text-muted dark:text-dark-text-muted">
              現在応募受付中のコンテストはありません
            </Text>
          </View>
        }
      />
    </BottomSheetModal>
  );
};
