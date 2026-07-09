import {
  CatalystDivider,
  CatalystEmptyState,
  CatalystListItem,
  CatalystListItemContent,
  CatalystMediaFrame,
  CatalystText,
} from "@/components/design-system";
import { useAsyncEffect } from "@/hooks/use-async-effect";
import { cn } from "@/lib/utils";
import { getCdnUrl } from "@/lib/media";
import { clientAtom } from "@/models/atoms/credential";
import {
  BottomSheetBackdrop,
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetTextInput,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import type { CatalystContest } from "@/models/sdk-types";
import dayjs from "dayjs";
import { Image } from "expo-image";
import { useAtomValue } from "jotai";
import { Trophy } from "lucide-react-native";
import React, { useCallback, useImperativeHandle, useRef, useState } from "react";
import { View, useColorScheme } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);
const UniTrophy = withUniwind(Trophy);
const UniBottomSheetTextInput = withUniwind(BottomSheetTextInput);

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
      const { data } = await client.catalyst.v1.contest.search.get({
        query: { q: query || undefined, state: "opening" },
        throwOnError: true,
      });
      setContests(data.contests);
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
      <CatalystListItem
        divided={false}
        onPress={() => handleSelect(item)}
        className="min-h-18 bg-light-background px-5 py-3 dark:bg-dark-surface"
      >
        {item.headerUrl ? (
          <CatalystMediaFrame className="h-11 w-18">
            <UniImage
              source={{ uri: getCdnUrl({ src: item.headerUrl, variant: "header", width: 120 }) }}
              className="h-full w-full"
              contentFit="cover"
            />
          </CatalystMediaFrame>
        ) : (
          <CatalystMediaFrame className="h-11 w-18 items-center justify-center">
            <UniTrophy size={20} className="text-light-text-subtle dark:text-dark-text-subtle" />
          </CatalystMediaFrame>
        )}
        <CatalystListItemContent>
          <CatalystText variant="subtitle" className="text-[15px] font-semibold" numberOfLines={1}>
            {item.title}
          </CatalystText>
          {item.theme ? (
            <CatalystText variant="caption" tone="muted" numberOfLines={1}>
              テーマ: {item.theme}
            </CatalystText>
          ) : null}
          <CatalystText variant="caption" tone="subtle">受付終了: {fmt(item.until)}</CatalystText>
        </CatalystListItemContent>
      </CatalystListItem>
    ),
    [handleSelect],
  );

  const listHeader = (
    <>
      <CatalystText variant="subtitle" className="py-3 text-center">
        コンテストを選択
      </CatalystText>
      <CatalystDivider />
      <View className="bg-light-surface-muted px-5 py-3 dark:bg-dark-background">
        <UniBottomSheetTextInput
          value={query}
          onChangeText={setQuery}
          placeholder="コンテストを検索..."
          className={cn(
            "h-10 rounded-full bg-light-background px-4 text-base text-light-text dark:bg-dark-surface dark:text-dark-text",
          )}
          placeholderTextColorClassName="accent-light-text-subtle dark:accent-dark-text-subtle"
          cursorColorClassName="accent-light-tint dark:accent-dark-tint"
          selectionColorClassName="accent-light-tint dark:accent-dark-tint"
          returnKeyType="search"
        />
      </View>
      <CatalystDivider />
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
          <CatalystEmptyState
            title="応募受付中のコンテストはありません"
            icon={<UniTrophy />}
            className="min-h-80"
          />
        }
        ItemSeparatorComponent={() => <CatalystDivider className="ml-5 w-auto" />}
      />
    </BottomSheetModal>
  );
};
