import { emojis } from "@/lib/generated/emojis";
import { Image } from "expo-image";
import {
  Clock,
  Flag,
  Heart,
  Lightbulb,
  PawPrint,
  Plane,
  Search,
  Smile,
  Star,
  StarPlus,
  Trophy,
  Utensils,
  X,
} from "lucide-react-native";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  type FlatListProps,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import type { EmojiCategory, EmojiItem } from "./types";
import { emojiToTwemojiKey } from "./unicode";

const GRID_COLUMNS = 8;
const EMOJI_SIZE = 36;

const ICON_MAP: Record<
  string,
  React.ComponentType<{ size: number; color: string }>
> = {
  clock: Clock,
  smile: Smile,
  "paw-print": PawPrint,
  utensils: Utensils,
  trophy: Trophy,
  plane: Plane,
  lightbulb: Lightbulb,
  heart: Heart,
  flag: Flag,
  star: Star,
  "star-plus": StarPlus,
};

type Props = {
  categories: EmojiCategory[];
  onEmojiSelected: (emoji: EmojiItem) => void;
  /** ローディング中は ActivityIndicator を表示する */
  isLoading?: boolean;
  /** スティッキーヘッダーの先頭に追加するコンテンツ（タイトル等） */
  listHeaderPrepend?: React.ReactNode;
  /**
   * 使用する FlatList コンポーネント。
   * デフォルトは RN の FlatList。BottomSheet 内では BottomSheetFlatList を渡すこと。
   *
   * アーキテクチャ上の注意:
   * - BottomSheetView でラップすると position:absolute で height が未定義になりスクロール不可
   * - 代わりに通常の View (flex:1) をルートにし、BottomSheetFlatList を直接子にする構成を取る
   * - こうすることで BottomSheetContent が計算した height が正しく伝播しスクロールが機能する
   */
  // biome-ignore lint/suspicious/noExplicitAny: FlatList と BottomSheetFlatList は互換プロップを持つが型定義が異なる
  FlatListComponent?: React.ComponentType<FlatListProps<EmojiItem> & any>;
};

const EmojiItemCell = memo(
  ({
    item,
    onPress,
  }: {
    item: EmojiItem;
    onPress: (item: EmojiItem) => void;
  }) => {
    const handlePress = useCallback(() => onPress(item), [item, onPress]);

    if (item.type.kind === "unicode") {
      const codepoint = emojiToTwemojiKey(item.type.emoji);
      const source = emojis[codepoint as keyof typeof emojis];
      if (source) {
        return (
          <Pressable onPress={handlePress} style={styles.emojiCell}>
            <Image
              source={source}
              style={styles.emojiImage}
              contentFit="contain"
            />
          </Pressable>
        );
      }
      return (
        <Pressable onPress={handlePress} style={styles.emojiCell}>
          <Text style={styles.emojiText}>{item.type.emoji}</Text>
        </Pressable>
      );
    }

    return (
      <Pressable onPress={handlePress} style={styles.emojiCell}>
        <Image
          source={{ uri: item.type.url }}
          style={styles.emojiImage}
          contentFit="contain"
        />
      </Pressable>
    );
  },
);
EmojiItemCell.displayName = "EmojiItemCell";

function CategoryButton({
  category,
  isSelected,
  disabled,
  onPress,
}: {
  category: EmojiCategory;
  isSelected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const theme = useColorScheme() ?? "light";
  const IconComponent = ICON_MAP[category.icon];
  const activeColor = theme === "dark" ? "#0A84FF" : "#007AFF";
  const inactiveColor = "#8E8E93";

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.categoryButton, disabled && { opacity: 0.5 }]}
    >
      {IconComponent && (
        <IconComponent
          size={22}
          color={isSelected ? activeColor : inactiveColor}
        />
      )}
      <View
        style={[
          styles.categoryIndicator,
          isSelected && { backgroundColor: activeColor },
        ]}
      />
    </Pressable>
  );
}

export function EmojiPickerView({
  categories,
  onEmojiSelected,
  isLoading = false,
  listHeaderPrepend,
  FlatListComponent = FlatList,
}: Props) {
  const theme = useColorScheme() ?? "light";
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    categories[0]?.id ?? "",
  );
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (categories.length === 0) return;
    const isValid = categories.some((c) => c.id === selectedCategoryId);
    if (!isValid) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSelectedCategoryId(categories[0].id);
    }
  }, [categories, selectedCategoryId]);
  const isSearching = searchText.trim().length > 0;

  const searchResults = useMemo(() => {
    if (!isSearching) return [];
    const query = searchText.toLowerCase().trim();
    const results: EmojiItem[] = [];
    for (const category of categories) {
      for (const emoji of category.emojis) {
        if (emoji.id.toLowerCase().includes(query)) {
          results.push(emoji);
          continue;
        }
        if (emoji.keywords.some((k) => k.toLowerCase().includes(query))) {
          results.push(emoji);
        }
      }
    }
    return results;
  }, [searchText, categories, isSearching]);

  const handleEmojiPress = useCallback(
    (emoji: EmojiItem) => {
      onEmojiSelected(emoji);
    },
    [onEmojiSelected],
  );

  const renderItem = useCallback(
    ({ item }: { item: EmojiItem }) => (
      <EmojiItemCell item={item} onPress={handleEmojiPress} />
    ),
    [handleEmojiPress],
  );

  const keyExtractor = useCallback(
    (item: EmojiItem, index: number) => `${item.id}-${index}`,
    [],
  );

  const selectedCategory =
    categories.find((c) => c.id === selectedCategoryId) ?? categories[0];
  const displayEmojis = isSearching
    ? searchResults
    : (selectedCategory?.emojis ?? []);

  const bgColor = theme === "dark" ? "#1C1C1E" : "#FFFFFF";

  return (
    // 通常の View (flex:1) をルートにすることで、BottomSheetContent が計算した
    // height を正しく受け取れる。BottomSheetView は position:absolute のため不可。
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {/* ===== スティッキーヘッダー ===== */}
      <View style={{ backgroundColor: bgColor }}>
        {/* タイトル等、呼び出し元から渡されるコンテンツ */}
        {listHeaderPrepend}

        {/* 検索バー */}
        <View
          style={[
            styles.searchBar,
            { backgroundColor: theme === "dark" ? "#2C2C2E" : "#F2F2F7" },
          ]}
        >
          <Search size={16} color="#8E8E93" />
          <TextInput
            style={[
              styles.searchInput,
              { color: theme === "dark" ? "#FFFFFF" : "#000000" },
            ]}
            placeholder="絵文字を検索"
            placeholderTextColor="#8E8E93"
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchText.length > 0 && (
            <Pressable onPress={() => setSearchText("")}>
              <X size={16} color="#8E8E93" />
            </Pressable>
          )}
        </View>

        {/* カテゴリタブ (水平スクロールのため通常の ScrollView で問題なし) */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryBar}
          contentContainerStyle={styles.categoryBarContent}
        >
          {categories.map((category) => (
            <CategoryButton
              key={category.id}
              category={category}
              isSelected={selectedCategoryId === category.id}
              disabled={isSearching}
              onPress={() => setSelectedCategoryId(category.id)}
            />
          ))}
        </ScrollView>

        <View
          style={[
            styles.divider,
            { backgroundColor: theme === "dark" ? "#38383A" : "#E5E5EA" },
          ]}
        />
      </View>

      {/* ===== スクロール領域 ===== */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator />
        </View>
      ) : (
        <FlatListComponent
          style={styles.list}
          data={displayEmojis}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={GRID_COLUMNS}
          contentContainerStyle={styles.gridContent}
          columnWrapperStyle={styles.gridRow}
          getItemLayout={(_: unknown, index: number) => ({
            length: EMOJI_SIZE + 8,
            offset: (EMOJI_SIZE + 8) * Math.floor(index / GRID_COLUMNS),
            index,
          })}
          initialNumToRender={40}
          maxToRenderPerBatch={40}
          windowSize={5}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 12,
    marginVertical: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },
  categoryBar: {
    maxHeight: 48,
    flexShrink: 0,
    flexGrow: 0,
  },
  categoryBarContent: {
    paddingHorizontal: 12,
    gap: 12,
    alignItems: "center",
  },
  categoryButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 36,
    height: 40,
    gap: 4,
  },
  categoryIndicator: {
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: "transparent",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
  },
  list: {
    flex: 1,
  },
  gridContent: {
    padding: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  gridRow: {
    justifyContent: "flex-start",
  },
  emojiCell: {
    width: `${100 / GRID_COLUMNS}%`,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiImage: {
    width: EMOJI_SIZE,
    height: EMOJI_SIZE,
  },
  emojiText: {
    fontSize: EMOJI_SIZE - 4,
    lineHeight: EMOJI_SIZE + 4,
  },
});
