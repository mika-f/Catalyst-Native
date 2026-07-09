import { cn } from "@/lib/utils";
import React from "react";
import { View } from "react-native";
import { CatalystText } from "./text";

export type CatalystEmptyStateProps = React.ComponentProps<typeof View> & {
  description?: string;
  icon?: React.ReactElement<{ className?: string; size?: number }>;
  title: string;
};

export const CatalystEmptyState = ({
  className,
  description,
  icon,
  title,
  ...props
}: CatalystEmptyStateProps) => {
  return (
    <View className={cn("h-full items-center justify-center px-6", className)} {...props}>
      <View className="w-full max-w-sm items-center gap-3 px-6 py-8">
        {icon ? (
          <View className="size-16 items-center justify-center rounded-full bg-light-surface-muted dark:bg-dark-surface-muted">
            {React.cloneElement(icon, {
              className: cn("text-light-icon dark:text-dark-icon", icon.props.className),
              size: icon.props.size ?? 34,
            })}
          </View>
        ) : null}
        <View className="items-center gap-1">
          <CatalystText variant="subtitle" className="text-center">
            {title}
          </CatalystText>
          {description ? (
            <CatalystText tone="muted" className="text-center">
              {description}
            </CatalystText>
          ) : null}
        </View>
      </View>
    </View>
  );
};
