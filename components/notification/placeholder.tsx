import { CatalystSkeleton } from "@/components/design-system";
import { memo } from "react";
import { View } from "react-native";

const ItemSeparator = () => <View className="h-px bg-light-divider dark:bg-dark-divider" />;

/** Follow / reaction style row */
const SystemNotificationRowPlaceholder = memo(() => {
  return (
    <View className="flex-row items-start gap-4 px-4 py-3">
      <CatalystSkeleton className="size-12 rounded-full" />
      <View className="min-w-0 flex-1 gap-2">
        <CatalystSkeleton className="h-3 w-4/5 rounded-full" />
        <CatalystSkeleton className="h-3 w-2/5 rounded-full" />
        <View className="flex-row gap-2">
          <CatalystSkeleton className="size-8 rounded-full" />
          <CatalystSkeleton className="size-8 rounded-full" />
          <CatalystSkeleton className="size-8 rounded-full" />
        </View>
      </View>
    </View>
  );
});
SystemNotificationRowPlaceholder.displayName = "SystemNotificationRowPlaceholder";

/** User message style row */
const UserMessageRowPlaceholder = memo(() => {
  return (
    <View className="gap-2 px-4 py-3">
      <View className="flex-row items-center gap-2">
        <CatalystSkeleton className="h-5 w-28 rounded-full" />
        <CatalystSkeleton className="h-3 w-20 rounded-full" />
        <View className="flex-1" />
        <CatalystSkeleton className="h-3 w-12 rounded-full" />
      </View>
      <View className="gap-1.5">
        <CatalystSkeleton className="h-3 w-full rounded-full" />
        <CatalystSkeleton className="h-3 w-11/12 rounded-full" />
        <CatalystSkeleton className="h-3 w-3/5 rounded-full" />
      </View>
    </View>
  );
});
UserMessageRowPlaceholder.displayName = "UserMessageRowPlaceholder";

type ListPlaceholderProps = {
  count?: number;
};

export const SystemNotificationPlaceholder = memo(({ count = 6 }: ListPlaceholderProps) => {
  return (
    <View
      accessibilityLabel="通知を読み込み中"
      accessibilityRole="progressbar"
      className="flex-1"
    >
      {Array.from({ length: count }, (_, index) => (
        <View key={index}>
          {index > 0 ? <ItemSeparator /> : null}
          <SystemNotificationRowPlaceholder />
        </View>
      ))}
    </View>
  );
});
SystemNotificationPlaceholder.displayName = "SystemNotificationPlaceholder";

export const UserMessagePlaceholder = memo(({ count = 5 }: ListPlaceholderProps) => {
  return (
    <View
      accessibilityLabel="メッセージを読み込み中"
      accessibilityRole="progressbar"
      className="flex-1"
    >
      {Array.from({ length: count }, (_, index) => (
        <View key={index}>
          {index > 0 ? <ItemSeparator /> : null}
          <UserMessageRowPlaceholder />
        </View>
      ))}
    </View>
  );
});
UserMessagePlaceholder.displayName = "UserMessagePlaceholder";
