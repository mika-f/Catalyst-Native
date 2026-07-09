import { CatalystSkeleton } from "@/components/design-system";
import { memo } from "react";
import { View } from "react-native";

export const UserRowPlaceholder = memo(() => {
  return (
    <View className="flex-row items-center gap-3 border-b border-light-divider px-4 py-3 dark:border-dark-divider">
      <CatalystSkeleton className="size-12 rounded-full" />
      <View className="min-w-0 flex-1 gap-1.5">
        <CatalystSkeleton className="h-3.5 w-28 rounded-full" />
        <CatalystSkeleton className="h-3 w-24 rounded-full" />
        <CatalystSkeleton className="h-3 w-full rounded-full" />
      </View>
    </View>
  );
});
UserRowPlaceholder.displayName = "UserRowPlaceholder";

type UserListPlaceholderProps = {
  count?: number;
};

export const UserListPlaceholder = memo(({ count = 8 }: UserListPlaceholderProps) => {
  return (
    <View
      accessibilityLabel="ユーザー一覧を読み込み中"
      accessibilityRole="progressbar"
      className="flex-1"
    >
      {Array.from({ length: count }, (_, index) => (
        <UserRowPlaceholder key={index} />
      ))}
    </View>
  );
});
UserListPlaceholder.displayName = "UserListPlaceholder";
