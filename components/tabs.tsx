import { cn } from "@/lib/utils";
import React, { useMemo, useRef, useState } from "react";
import { Animated, FlatList, ListRenderItem, NativeScrollEvent, NativeSyntheticEvent, Pressable, Text, View, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { runOnJS } from "react-native-reanimated";

const AnimatedFlatList = Animated.FlatList as unknown as typeof FlatList;

export type Tab = {
  key: string;
  label: string;
};

type Props = {
  tabs: Tab[];
  renderScene: (tab: Tab) => React.ReactNode;
  defaultIndex?: number;
  onTabChange?: (tab: Tab, index: number) => void;
  /**
   * 先頭ページを表示中に左→右へスワイプした際に呼ばれる。
   * （逆向きスワイプは通常どおりタブ切り替えに使われる）
   */
  onSwipeRightFromStart?: () => void;
  /** onSwipeRightFromStart が発火する横移動量のしきい値 (px) */
  swipeRightThreshold?: number;
};

export function Tabs({
  tabs,
  renderScene,
  defaultIndex = 0,
  onTabChange,
  onSwipeRightFromStart,
  swipeRightThreshold = 70,
}: Props) {
  const [activeIndex, setActiveIndex] = useState(defaultIndex);
  const { width: screenWidth } = useWindowDimensions();
  const scrollX = useRef(new Animated.Value(defaultIndex * screenWidth)).current;
  const flatListRef = useRef<FlatList<Tab>>(null);
  const isScrollingProgrammatically = useRef(false);

  const TAB_WIDTH = screenWidth / tabs.length;
  const INDICATOR_WIDTH = TAB_WIDTH;

  const indicatorTranslateX = scrollX.interpolate({
    inputRange: tabs.map((_, i) => i * screenWidth),
    outputRange: tabs.map((_, i) => i * TAB_WIDTH + (TAB_WIDTH - INDICATOR_WIDTH) / 2),
    extrapolate: "clamp",
  });

  const handleTabPress = (index: number) => {
    isScrollingProgrammatically.current = true;
    setActiveIndex(index);
    onTabChange?.(tabs[index]!, index);
    flatListRef.current?.scrollToIndex({ index, animated: true });
    Animated.timing(scrollX, {
      toValue: index * screenWidth,
      duration: 250,
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

  // FlatList 自身の横スクロール（ネイティブジェスチャー）。
  const nativeScrollGesture = useMemo(() => Gesture.Native(), []);

  // 先頭ページで左→右にスワイプしたときのジェスチャー。
  // スクロールと同時に動かし、右方向のみ反応・左方向は FlatList のタブ切り替えに委ねる。
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

  const renderItem: ListRenderItem<Tab> = ({ item }) => (
    <View style={{ width: screenWidth, flex: 1 }}>{renderScene(item)}</View>
  );

  return (
    <View className="flex-1">
      {/* タブバー */}
      <View className="flex-row border-b border-light-border dark:border-dark-border">
        {tabs.map((tab, index) => {
          const isActive = index === activeIndex;
          return (
            <Pressable key={tab.key} className="flex-1 items-center py-4" onPress={() => handleTabPress(index)}>
              <Text
                className={cn(
                  isActive ? "font-bold text-light-text dark:text-dark-text" : "text-light-icon dark:text-dark-icon",
                )}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}

        {/* アクティブインジケーター */}
        <Animated.View
          className="bg-light-accent dark:bg-dark-accent h-1 rounded-none absolute bottom-0"
          style={[
            {
              width: INDICATOR_WIDTH,
              transform: [{ translateX: indicatorTranslateX }],
            },
          ]}
        />
      </View>

      {/* スワイプ可能なコンテンツ */}
      <GestureDetector gesture={composedGesture}>
        <AnimatedFlatList
          ref={flatListRef}
          data={tabs}
          horizontal
          pagingEnabled
          scrollEnabled={true}
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
