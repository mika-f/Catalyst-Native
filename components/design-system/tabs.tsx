import { useReducedMotion } from "@/hooks/use-reduced-motion";
import React, { useMemo, useRef, useState } from "react";
import {
  Animated,
  FlatList,
  ListRenderItem,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  View,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";
import { CatalystDivider } from "./divider";
import { CatalystText } from "./text";

const AnimatedFlatList = Animated.FlatList as unknown as typeof FlatList;

export type CatalystTab = {
  key: string;
  label: string;
};

export type CatalystTabsProps = {
  tabs: CatalystTab[];
  renderScene: (tab: CatalystTab) => React.ReactNode;
  defaultIndex?: number;
  onTabChange?: (tab: CatalystTab, index: number) => void;
  onSwipeRightFromStart?: () => void;
  swipeRightThreshold?: number;
};

export function CatalystTabs({
  tabs,
  renderScene,
  defaultIndex = 0,
  onTabChange,
  onSwipeRightFromStart,
  swipeRightThreshold = 70,
}: CatalystTabsProps) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const reducedMotion = useReducedMotion();
  const { width: screenWidth } = useWindowDimensions();
  const [scrollX] = useState(() => new Animated.Value(defaultIndex * screenWidth));
  const flatListRef = useRef<FlatList<CatalystTab>>(null);
  const isScrollingProgrammatically = useRef(false);

  const tabWidth = screenWidth / tabs.length;
  const indicatorWidth = Math.min(64, Math.max(36, tabWidth * 0.44));

  const indicatorTranslateX = scrollX.interpolate({
    inputRange: tabs.map((_, i) => i * screenWidth),
    outputRange: tabs.map((_, i) => i * tabWidth + (tabWidth - indicatorWidth) / 2),
    extrapolate: "clamp",
  });

  const handleTabPress = (index: number) => {
    isScrollingProgrammatically.current = true;
    setActiveIndex(index);
    onTabChange?.(tabs[index]!, index);
    flatListRef.current?.scrollToIndex({ index, animated: !reducedMotion });
    Animated.timing(scrollX, {
      toValue: index * screenWidth,
      duration: reducedMotion ? 0 : 220,
      useNativeDriver: false,
    }).start(() => {
      isScrollingProgrammatically.current = false;
    });
  };

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    { useNativeDriver: false },
  );

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isScrollingProgrammatically.current) return;
    const offsetX = e.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / screenWidth);
    const clampedIndex = Math.max(0, Math.min(index, tabs.length - 1));
    if (clampedIndex !== activeIndex) {
      setActiveIndex(clampedIndex);
      onTabChange?.(tabs[clampedIndex]!, clampedIndex);
    }
  };

  const nativeScrollGesture = useMemo(() => Gesture.Native(), []);

  const swipeRightGesture = useMemo(() => {
    const callback = onSwipeRightFromStart;
    return Gesture.Pan()
      .enabled(activeIndex === 0 && !!callback)
      .activeOffsetX(20)
      .failOffsetX(-20)
      .onEnd((e) => {
        if (callback && e.translationX > swipeRightThreshold && e.velocityX >= 0) {
          runOnJS(callback)();
        }
      });
  }, [activeIndex, onSwipeRightFromStart, swipeRightThreshold]);

  const composedGesture = useMemo(
    () => Gesture.Simultaneous(swipeRightGesture, nativeScrollGesture),
    [swipeRightGesture, nativeScrollGesture],
  );

  const renderItem: ListRenderItem<CatalystTab> = ({ item }) => (
    <View style={{ width: screenWidth, flex: 1 }}>{renderScene(item)}</View>
  );

  return (
    <View className="flex-1">
      <View className="relative flex-row">
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          return (
            <Pressable
              key={tab.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              className="h-12 flex-1 items-center justify-center"
              onPress={() => handleTabPress(index)}
            >
              <CatalystText
                variant="label"
                tone={isActive ? "default" : "subtle"}
                className={isActive ? "font-bold" : undefined}
              >
                {tab.label}
              </CatalystText>
            </Pressable>
          );
        })}
        <CatalystDivider className="absolute bottom-0" />
        <Animated.View
          className="absolute bottom-0 h-1 rounded-full bg-light-accent dark:bg-dark-accent"
          style={[
            {
              width: indicatorWidth,
              transform: [{ translateX: indicatorTranslateX }],
            },
          ]}
        />
      </View>

      <GestureDetector gesture={composedGesture}>
        <AnimatedFlatList
          ref={flatListRef}
          data={tabs}
          horizontal
          pagingEnabled
          scrollEnabled
          bounces={false}
          overScrollMode="never"
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          renderItem={renderItem}
          getItemLayout={(_, index) => ({ length: screenWidth, offset: screenWidth * index, index })}
          initialScrollIndex={defaultIndex}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          className="flex-1"
        />
      </GestureDetector>
    </View>
  );
}
