import { cn } from "@/lib/utils";
import { View } from "react-native";

export type CatalystDividerProps = React.ComponentProps<typeof View> & {
  orientation?: "horizontal" | "vertical";
};

export const CatalystDivider = ({
  className,
  orientation = "horizontal",
  ...props
}: CatalystDividerProps) => {
  return (
    <View
      accessibilityRole="none"
      className={cn(
        "bg-light-divider dark:bg-dark-divider",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  );
};
