import { cn } from "@/lib/utils";
import { memo } from "react";
import { View } from "react-native";

const Bone = ({ className }: { className?: string }) => {
  return <View className={cn("bg-light-skeleton dark:bg-dark-skeleton", className)} />;
};

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
          <Bone className="size-10 rounded-full" />

          <View className="min-w-0 flex-1 gap-1.5">
            <Bone className="h-3.5 w-28 rounded-full" />
            <Bone className="h-3 w-36 rounded-full" />
          </View>

          <Bone className="size-5 rounded-full" />
        </View>

        {showMedia ? <Bone className="mt-3 h-56 w-full" /> : null}

        {bodyLines > 0 ? (
          <View className="gap-2 px-4 pt-3">
            {Array.from({ length: bodyLines }, (_, index) => (
              <Bone
                key={index}
                className={cn("h-3 rounded-full", BODY_LINE_WIDTHS[index] ?? "w-3/5")}
              />
            ))}
          </View>
        ) : null}

        <View className="flex-row gap-2 px-4 pt-3">
          <Bone className="h-7 w-14 rounded-full" />
          <Bone className="h-7 w-14 rounded-full" />
          <Bone className="h-7 w-10 rounded-full" />
        </View>
      </View>
    );
  },
);
TimelineStatusPlaceholder.displayName = "TimelineStatusPlaceholder";

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
