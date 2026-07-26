import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import React, { useEffect } from "react";
import { Pressable } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

export type CatalystSwitchProps = Omit<
  React.ComponentProps<typeof Pressable>,
  "accessibilityRole" | "children" | "onPress"
> & {
  value: boolean;
  onValueChange?: (value: boolean) => void;
};

export const CatalystSwitch = ({
  accessibilityState,
  className,
  disabled = false,
  onValueChange,
  value,
  ...props
}: CatalystSwitchProps) => {
  const progress = useSharedValue(value ? 1 : 0);
  const reducedMotion = useReducedMotion();
  const isDisabled = disabled === true;

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: reducedMotion ? 0 : 160 });
  }, [progress, reducedMotion, value]);

  const selectedTrackStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * 20 }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ ...accessibilityState, checked: value, disabled: isDisabled }}
      className={cn(
        "h-7 w-12 justify-center rounded-full border border-light-border-strong bg-light-surface-muted p-0.5 active:opacity-80 disabled:opacity-50 dark:border-dark-border-strong dark:bg-dark-surface-muted",
        className,
      )}
      disabled={isDisabled}
      onPress={() => onValueChange?.(!value)}
      {...props}
    >
      <Animated.View
        className="absolute inset-0 rounded-full bg-light-tint dark:bg-dark-accent"
        pointerEvents="none"
        style={selectedTrackStyle}
      />
      <Animated.View
        className="size-6 rounded-full bg-light-background dark:bg-dark-text"
        pointerEvents="none"
        style={thumbStyle}
      />
    </Pressable>
  );
};
