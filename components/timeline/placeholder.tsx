import { CatalystSkeleton } from "@/components/design-system";
import { cn } from "@/lib/utils";
import { memo } from "react";
import { View } from "react-native";

type StatusPlaceholderVariant = {
  showMedia?: boolean;
  bodyLines?: number;
};

const VARIANTS: StatusPlaceholderVariant[] = [
  { showMedia: true, bodyLines: 2 },
  { showMedia: false, bodyLines: 3 },
  { showMedia: true, bodyLines: 1 },
  { showMedia: false, bodyLines: 2 },
  { showMedia: true, bodyLines: 2 },
  { showMedia: false, bodyLines: 1 },
];

const BODY_LINE_WIDTHS = ["w-full", "w-11/12", "w-4/5"] as const;

type StatusPlaceholderProps = StatusPlaceholderVariant & {
  className?: string;
};

export const TimelineStatusPlaceholder = memo(
  ({ showMedia = true, bodyLines = 2, className }: StatusPlaceholderProps) => {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        className={cn("bg-light-background py-3 dark:bg-dark-background", className)}
      >
        <View className="flex-row items-center gap-3 px-4">
          <CatalystSkeleton className="size-10 rounded-full" />

          <View className="min-w-0 flex-1 gap-1.5">
            <CatalystSkeleton className="h-3.5 w-28 rounded-full" />
            <CatalystSkeleton className="h-3 w-36 rounded-full" />
          </View>

          <CatalystSkeleton className="size-5 rounded-full" />
        </View>

        {showMedia ? <CatalystSkeleton className="mt-3 h-56 w-full" /> : null}

        {bodyLines > 0 ? (
          <View className="gap-2 px-4 pt-3">
            {Array.from({ length: bodyLines }, (_, index) => (
              <CatalystSkeleton
                key={index}
                className={cn("h-3 rounded-full", BODY_LINE_WIDTHS[index] ?? "w-3/5")}
              />
            ))}
          </View>
        ) : null}

        <View className="flex-row gap-2 px-4 pt-3">
          <CatalystSkeleton className="h-7 w-14 rounded-full" />
          <CatalystSkeleton className="h-7 w-14 rounded-full" />
          <CatalystSkeleton className="h-7 w-10 rounded-full" />
        </View>
      </View>
    );
  },
);
TimelineStatusPlaceholder.displayName = "TimelineStatusPlaceholder";

/** Single-status detail view skeleton (larger avatar / more body room). */
export const StatusDetailPlaceholder = memo(() => {
  return (
    <View
      accessibilityLabel="投稿を読み込み中"
      accessibilityRole="progressbar"
      className="flex-1 bg-light-surface-muted dark:bg-dark-background"
    >
      <View className="bg-light-background px-5 pb-4 pt-4 dark:bg-dark-surface">
        <View className="flex-row items-center gap-3">
          <CatalystSkeleton className="size-12 rounded-full" />
          <View className="min-w-0 flex-1 gap-1.5">
            <CatalystSkeleton className="h-4 w-32 rounded-full" />
            <CatalystSkeleton className="h-3 w-28 rounded-full" />
          </View>
        </View>

        <CatalystSkeleton className="mt-4 h-64 w-full rounded-xl" />

        <View className="mt-4 gap-2">
          <CatalystSkeleton className="h-3.5 w-full rounded-full" />
          <CatalystSkeleton className="h-3.5 w-11/12 rounded-full" />
          <CatalystSkeleton className="h-3.5 w-4/5 rounded-full" />
        </View>

        <View className="mt-4 flex-row gap-2">
          <CatalystSkeleton className="h-8 w-16 rounded-full" />
          <CatalystSkeleton className="h-8 w-16 rounded-full" />
          <CatalystSkeleton className="h-8 w-12 rounded-full" />
        </View>
      </View>
    </View>
  );
});
StatusDetailPlaceholder.displayName = "StatusDetailPlaceholder";

const ItemSeparator = () => {
  return <View className="h-px bg-light-divider dark:bg-dark-divider" />;
};

type TimelinePlaceholderProps = {
  count?: number;
};

export const TimelinePlaceholder = memo(({ count = VARIANTS.length }: TimelinePlaceholderProps) => {
  const items = VARIANTS.slice(0, count);

  return (
    <View
      accessibilityLabel="タイムラインを読み込み中"
      accessibilityRole="progressbar"
      className="flex-1"
    >
      {items.map((variant, index) => (
        <View key={index}>
          {index > 0 ? <ItemSeparator /> : null}
          <TimelineStatusPlaceholder {...variant} />
        </View>
      ))}
    </View>
  );
});
TimelinePlaceholder.displayName = "TimelinePlaceholder";
