import { cn } from "@/lib/utils";
import { View } from "react-native";

export type CatalystMediaFrameProps = React.ComponentProps<typeof View> & {
  shape?: "rounded" | "square" | "circle";
};

const shapeClassName: Record<NonNullable<CatalystMediaFrameProps["shape"]>, string> = {
  circle: "rounded-full",
  rounded: "rounded-xl",
  square: "rounded-none",
};

export const CatalystMediaFrame = ({
  className,
  shape = "rounded",
  ...props
}: CatalystMediaFrameProps) => {
  return (
    <View
      className={cn(
        "overflow-hidden bg-light-surface-muted dark:bg-dark-surface-muted",
        shapeClassName[shape],
        className,
      )}
      {...props}
    />
  );
};
