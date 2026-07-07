import { Image } from "@/components/ui/image";
import { cn } from "@/lib/utils";
import type { ImageSource } from "expo-image";
import { Text, View } from "react-native";

type CatalystAvatarSize = "sm" | "md" | "lg" | "xl";

const sizeClassName: Record<CatalystAvatarSize, string> = {
  sm: "size-8",
  md: "size-10",
  lg: "size-12",
  xl: "size-16",
};

const textClassName: Record<CatalystAvatarSize, string> = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-lg",
};

export type CatalystAvatarProps = React.ComponentProps<typeof View> & {
  alt?: string;
  fallback?: string;
  size?: CatalystAvatarSize;
  source?: ImageSource | string | number | null;
};

export const CatalystAvatar = ({
  alt,
  className,
  fallback,
  size = "md",
  source,
  ...props
}: CatalystAvatarProps) => {
  const imageSource = typeof source === "string" ? { uri: source } : source;

  return (
    <View
      accessibilityLabel={alt}
      className={cn(
        "shrink-0 items-center justify-center overflow-hidden rounded-full bg-light-surface-muted dark:bg-dark-surface-muted",
        sizeClassName[size],
        className,
      )}
      {...props}
    >
      {imageSource ? (
        <Image source={imageSource} className="h-full w-full" contentFit="cover" />
      ) : (
        <Text className={cn("font-semibold text-light-text-muted dark:text-dark-text-muted", textClassName[size])}>
          {fallback?.slice(0, 2) ?? ""}
        </Text>
      )}
    </View>
  );
};
