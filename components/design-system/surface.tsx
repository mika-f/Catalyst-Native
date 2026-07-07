import { cn } from "@/lib/utils";
import { View } from "react-native";

type CatalystSurfaceVariant = "default" | "muted" | "elevated" | "transparent";
type CatalystSurfaceRadius = "none" | "sm" | "md" | "lg";

const variantClassName: Record<CatalystSurfaceVariant, string> = {
  default: "bg-light-surface dark:bg-dark-surface",
  muted: "bg-light-surface-muted dark:bg-dark-surface-muted",
  elevated: "bg-light-surface-elevated dark:bg-dark-surface-elevated",
  transparent: "bg-transparent",
};

const radiusClassName: Record<CatalystSurfaceRadius, string> = {
  none: "rounded-none",
  sm: "rounded-md",
  md: "rounded-lg",
  lg: "rounded-xl",
};

export type CatalystSurfaceProps = React.ComponentProps<typeof View> & {
  bleed?: boolean;
  radius?: CatalystSurfaceRadius;
  variant?: CatalystSurfaceVariant;
};

export const CatalystSurface = ({
  bleed,
  children,
  className,
  radius = "md",
  variant = "default",
  ...props
}: CatalystSurfaceProps) => {
  return (
    <View
      className={cn(
        variantClassName[variant],
        bleed ? "rounded-none" : radiusClassName[radius],
        className,
      )}
      {...props}
    >
      {children}
    </View>
  );
};
