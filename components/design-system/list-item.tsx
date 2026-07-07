import { cn } from "@/lib/utils";
import { Pressable, View } from "react-native";

export type CatalystListItemProps = React.ComponentProps<typeof Pressable> & {
  divided?: boolean;
};

export const CatalystListItem = ({
  className,
  divided = true,
  ...props
}: CatalystListItemProps) => {
  return (
    <Pressable
      className={cn(
        "flex-row items-center gap-3 px-4 py-3 active:bg-light-surface-muted dark:active:bg-dark-surface-muted",
        divided && "border-b border-light-divider dark:border-dark-divider",
        className,
      )}
      {...props}
    />
  );
};

export type CatalystListItemContentProps = React.ComponentProps<typeof View>;

export const CatalystListItemContent = ({
  className,
  ...props
}: CatalystListItemContentProps) => {
  return <View className={cn("min-w-0 flex-1 gap-1", className)} {...props} />;
};
