import { cn } from "@/lib/utils";
import { View } from "react-native";

export type CatalystSkeletonProps = React.ComponentProps<typeof View>;

/**
 * Skeleton bone for loading placeholders.
 * Uses design tokens: bg-light-skeleton / bg-dark-skeleton.
 */
export const CatalystSkeleton = ({ className, ...props }: CatalystSkeletonProps) => {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn("bg-light-skeleton dark:bg-dark-skeleton", className)}
      {...props}
    />
  );
};
