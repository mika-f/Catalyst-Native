import { CatalystText } from "@/components/design-system";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";
import { Animated, Pressable, View, useWindowDimensions } from "react-native";

type Props = {
  activeIndex: number;
  tabs: { route: string; label: string }[];
  onClickTab: (index: number) => void;
};

export const ProfileTabs = ({ activeIndex, tabs, onClickTab }: Props) => {
  const { width: screenWidth } = useWindowDimensions();
  const [indicator] = useState(() => new Animated.Value(0));
  const tabWidth = screenWidth / tabs.length;

  const handleTabClick = useCallback(
    (i: number) => {
      onClickTab?.(i);

      Animated.timing(indicator, {
        toValue: i * tabWidth,
        duration: 200,
        useNativeDriver: false,
      }).start();
    },
    [indicator, onClickTab, tabWidth],
  );

  useEffect(() => {
    indicator.setValue(activeIndex * tabWidth);
  }, [activeIndex, indicator, tabWidth]);

  return (
    <View className="flex-row bg-light-background dark:bg-dark-surface">
      {tabs.map((tab, i) => {
        const isActive = i === activeIndex;

        return (
          <Pressable
            className="items-center justify-center py-3.5 active:bg-light-surface-muted dark:active:bg-dark-surface-muted"
            key={tab.route}
            style={{ width: tabWidth }}
            onPress={() => handleTabClick(i)}
          >
            <CatalystText
              variant="label"
              tone={isActive ? "default" : "muted"}
              className={cn(
                "text-center",
                isActive ? "font-bold" : "font-semibold",
              )}
            >
              {tab.label}
            </CatalystText>
          </Pressable>
        );
      })}
      <Animated.View
        className="absolute bottom-0 h-0.5 rounded-full bg-light-accent dark:bg-dark-accent"
        style={{ transform: [{ translateX: indicator }], width: tabWidth }}
      />
    </View>
  );
};
