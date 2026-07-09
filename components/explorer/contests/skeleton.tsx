import { CatalystSkeleton } from "@/components/design-system";
import { memo } from "react";
import { View } from "react-native";

const ContestCardPlaceholder = memo(() => {
  return (
    <View className="mx-3 py-3">
      <CatalystSkeleton className="h-32 w-full rounded-xl" />
      <View className="gap-1.5 pt-2">
        <CatalystSkeleton className="h-5 w-20 rounded-full" />
        <CatalystSkeleton className="h-4 w-4/5 rounded-full" />
        <CatalystSkeleton className="h-3 w-3/5 rounded-full" />
        <CatalystSkeleton className="h-3 w-2/5 rounded-full" />
      </View>
      <View className="mt-4 h-px bg-light-divider dark:bg-dark-divider" />
    </View>
  );
});
ContestCardPlaceholder.displayName = "ContestCardPlaceholder";

type ContestListPlaceholderProps = {
  count?: number;
};

export const ContestListPlaceholder = memo(({ count = 4 }: ContestListPlaceholderProps) => {
  return (
    <View
      accessibilityLabel="コンテストを読み込み中"
      accessibilityRole="progressbar"
      className="flex-1"
    >
      {Array.from({ length: count }, (_, index) => (
        <ContestCardPlaceholder key={index} />
      ))}
    </View>
  );
});
ContestListPlaceholder.displayName = "ContestListPlaceholder";

/** Contest detail header while metadata is loading */
export const ContestDetailPlaceholder = memo(() => {
  return (
    <View
      accessibilityLabel="コンテストを読み込み中"
      accessibilityRole="progressbar"
      className="flex-1"
    >
      <CatalystSkeleton className="h-40 w-full" />
      <View className="gap-3 px-4 py-4">
        <CatalystSkeleton className="h-5 w-24 rounded-full" />
        <CatalystSkeleton className="h-6 w-4/5 rounded-full" />
        <CatalystSkeleton className="h-3 w-3/5 rounded-full" />
        <CatalystSkeleton className="h-3 w-full rounded-full" />
        <CatalystSkeleton className="h-3 w-11/12 rounded-full" />
      </View>
      <View className="mt-2">
        {Array.from({ length: 3 }, (_, index) => (
          <View key={index} className="border-t border-light-divider dark:border-dark-divider">
            <View className="flex-row items-center gap-3 px-4 py-3">
              <CatalystSkeleton className="size-10 rounded-full" />
              <View className="flex-1 gap-1.5">
                <CatalystSkeleton className="h-3.5 w-28 rounded-full" />
                <CatalystSkeleton className="h-3 w-36 rounded-full" />
              </View>
            </View>
            <CatalystSkeleton className="h-48 w-full" />
          </View>
        ))}
      </View>
    </View>
  );
});
ContestDetailPlaceholder.displayName = "ContestDetailPlaceholder";
