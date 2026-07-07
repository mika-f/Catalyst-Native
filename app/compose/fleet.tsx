import { EmojiPickerView } from "@/components/emoji-verse";
import { getFilteredCategories, useDefaultCategories } from "@/components/emoji-verse/emoji-data";
import type { EmojiCategory, EmojiItem } from "@/components/emoji-verse/types";
import { emojiToCodepoints } from "@/components/emoji-verse/unicode";
import { useContainerUnits } from "@/hooks/use-container-units";
import { accountAtom } from "@/models/atoms/account";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import Slider from "@react-native-community/slider";
import * as FileSystem from "expo-file-system";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { ImageIcon, Pencil, Plus, Trash2, Type, X } from "lucide-react-native";
import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  LayoutChangeEvent,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
  useColorScheme,
} from "react-native";
import { Gesture, GestureDetector, GestureType, ScrollView } from "react-native-gesture-handler";
import Animated, { SharedValue, useAnimatedStyle, useSharedValue } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { withUniwind } from "uniwind";

const UniImageIcon = withUniwind(ImageIcon);
const UniType = withUniwind(Type);
const UniX = withUniwind(X);
const UniPlus = withUniwind(Plus);
const UniPencil = withUniwind(Pencil);
const UniTrash2 = withUniwind(Trash2);

const BG_COLORS = ["#000000", "#1a1a2e", "#0d3b66", "#1b4332", "#7b2d8b", "#c0392b", "#e67e22", "#ffffff"];

const SCALE_MIN = 0.05;
const SCALE_MAX = 5.0;
const MAX_TEXTS = 20;
const MAX_STICKERS = 20;

// ─── types ───────────────────────────────────────────────────────────────────

type SelectedImage = {
  uri: string;
  width: number;
  height: number;
  fileSize?: number;
};

type TextItem = {
  id: string;
  body: string;
  scale: number;
  rotation: number;
};

type StickerItem = {
  id: string;
  emoji: string;
  scale: number;
  rotation: number;
};

type ReactionItem = {
  id?: string;
  symbol: string;
  name: string;
  url: string;
};

// ─── DraggableText ───────────────────────────────────────────────────────────

type DraggableTextHandle = {
  getPlacement: () => { posX: number; posY: number; scale: number; rotation: number };
  setScale: (v: number) => void;
  setRotation: (v: number) => void;
  getScale: () => number;
  getRotation: () => number;
};

type DraggableTextProps = {
  body: string;
  containerWidth: SharedValue<number>;
  containerHeight: SharedValue<number>;
  imgPanRef: React.RefObject<GestureType>;
  imgPinchRef: React.RefObject<GestureType>;
};

const DraggableText = forwardRef<DraggableTextHandle, DraggableTextProps>(function DraggableText(
  { body, containerWidth, containerHeight, imgPanRef, imgPinchRef },
  ref,
) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useImperativeHandle(ref, () => ({
    getPlacement: () => ({
      posX: containerWidth.value > 0 ? translateX.value / containerWidth.value + 0.5 : 0.5,
      posY: containerHeight.value > 0 ? translateY.value / containerHeight.value + 0.5 : 0.5,
      scale: scale.value,
      rotation: rotation.value,
    }),
    setScale: (v: number) => {
      scale.value = v;
    },
    setRotation: (v: number) => {
      rotation.value = v;
    },
    getScale: () => scale.value,
    getRotation: () => rotation.value,
  }));

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = savedX.value + e.translationX;
      translateY.value = savedY.value + e.translationY;
    });

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.min(SCALE_MAX, Math.max(SCALE_MIN, savedScale.value * e.scale));
    });

  const composed = Gesture.Simultaneous(
    panGesture.blocksExternalGesture(imgPanRef, imgPinchRef),
    pinchGesture.blocksExternalGesture(imgPanRef, imgPinchRef),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <GestureDetector gesture={composed}>
        <Animated.View style={animatedStyle}>
          <Text
            style={{
              color: "#ffffff",
              fontSize: 18,
              textAlign: "center",
              textShadowColor: "rgba(0,0,0,0.6)",
              textShadowOffset: { width: 0, height: 2 },
              textShadowRadius: 6,
              fontFamily: "Noto Sans JP Regular",
            }}
          >
            {body}
          </Text>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

type DraggableStickerHandle = {
  getPlacement: () => { posX: number; posY: number; scale: number; rotation: number };
  setScale: (v: number) => void;
  setRotation: (v: number) => void;
  getScale: () => number;
  getRotation: () => number;
};

type DraggableStickerProps = {
  unit: number;
  emoji: string;
  imageUrl?: string;
  containerWidth: SharedValue<number>;
  containerHeight: SharedValue<number>;
  imgPanRef: React.RefObject<GestureType>;
  imgPinchRef: React.RefObject<GestureType>;
};

const DraggableSticker = forwardRef<DraggableStickerHandle, DraggableStickerProps>(function DraggableSticker(
  { unit, emoji, imageUrl, containerWidth, containerHeight, imgPanRef, imgPinchRef },
  ref,
) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const rotation = useSharedValue(0);

  useImperativeHandle(ref, () => ({
    getPlacement: () => ({
      posX: containerWidth.value > 0 ? translateX.value / containerWidth.value + 0.5 : 0.5,
      posY: containerHeight.value > 0 ? translateY.value / containerHeight.value + 0.5 : 0.5,
      scale: scale.value,
      rotation: rotation.value,
    }),
    setScale: (v: number) => {
      scale.value = v;
    },
    setRotation: (v: number) => {
      rotation.value = v;
    },
    getScale: () => scale.value,
    getRotation: () => rotation.value,
  }));

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      savedX.value = translateX.value;
      savedY.value = translateY.value;
    })
    .onUpdate((e) => {
      translateX.value = savedX.value + e.translationX;
      translateY.value = savedY.value + e.translationY;
    });

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.min(SCALE_MAX, Math.max(SCALE_MIN, savedScale.value * e.scale));
    });

  const composed = Gesture.Simultaneous(
    panGesture.blocksExternalGesture(imgPanRef, imgPinchRef),
    pinchGesture.blocksExternalGesture(imgPanRef, imgPinchRef),
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <GestureDetector gesture={composed}>
        <Animated.View style={animatedStyle}>
          <Image
            source={{ uri: imageUrl ?? `https://static.natsuneko.com/images/reactions/${emoji}.png` }}
            style={{ width: unit * 8, height: unit * 8 }}
            contentFit="contain"
          />
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

// ─── FleetComposerScreen ─────────────────────────────────────────────────────

export default function FleetComposerScreen() {
  const theme = useColorScheme() ?? "light";
  const router = useRouter();
  const account = useAtomValue(accountAtom);
  const insets = useSafeAreaInsets();

  const [image, setImage] = useState<SelectedImage | null>(null);
  const [backgroundColor, setBackgroundColor] = useState("#000000");
  const [texts, setTexts] = useState<TextItem[]>([]);
  const [stickers, setStickers] = useState<StickerItem[]>([]);
  const [editingText, setEditingText] = useState<{
    id: string | null;
    body: string;
    scale: number;
    rotation: number;
  } | null>(null);
  const [editingSticker, setEditingSticker] = useState<{
    id: string | null;
    emoji: string;
    scale: number;
    rotation: number;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sheetContentHeight, setSheetContentHeight] = useState(0);
  const [availableReactions, setAvailableReactions] = useState<ReactionItem[]>([]);
  const [isLoadingReactions, setIsLoadingReactions] = useState(false);
  const { categories: defaultEmojiCategories, isLoading: isLoadingDefaultEmojis } = useDefaultCategories();

  const textRefsMap = useRef<Map<string, DraggableTextHandle | null>>(new Map());
  const stickerRefsMap = useRef<Map<string, DraggableStickerHandle | null>>(new Map());
  const imgPanRef = useRef<GestureType>(undefined!);
  const imgPinchRef = useRef<GestureType>(undefined!);

  const { onLayout, cqw, cqh } = useContainerUnits();

  const containerWidth = useSharedValue(0);
  const containerHeight = useSharedValue(0);
  const imgTranslateX = useSharedValue(0);
  const imgTranslateY = useSharedValue(0);
  const imgSavedX = useSharedValue(0);
  const imgSavedY = useSharedValue(0);
  const imgScale = useSharedValue(1);
  const imgSavedScale = useSharedValue(1);

  const canPost = !isSubmitting && image !== null;
  const reactionUrlMap = availableReactions.reduce<Record<string, string>>((acc, reaction) => {
    acc[reaction.symbol] = reaction.url;
    return acc;
  }, {});

  useEffect(() => {
    if (editingSticker === null || availableReactions.length > 0 || isLoadingDefaultEmojis) return;

    let active = true;
    setIsLoadingReactions(true);

    fetch("https://api.natsuneko.com/catalyst/v1/reactions")
      .then((response) => response.json() as Promise<ReactionItem[]>)
      .then((reactions) => {
        if (!active) return;
        setAvailableReactions(reactions);
      })
      .catch((error) => {
        console.error("Failed to load teyvat reactions:", error);
        if (active) {
          Toast.show({ type: "error", text1: "エラー", text2: "ステッカーの読み込みに失敗しました" });
        }
      })
      .finally(() => {
        if (active) {
          setIsLoadingReactions(false);
        }
      });

    return () => {
      active = false;
    };
  }, [editingSticker, availableReactions.length, isLoadingDefaultEmojis]);

  const stickerCategories = React.useMemo<EmojiCategory[]>(() => {
    const categories: EmojiCategory[] = [];

    if (availableReactions.length > 0) {
      categories.push({
        id: "catalyst",
        title: "Catalyst",
        icon: "star",
        emojis: availableReactions.map(
          (reaction): EmojiItem => ({
            id: reaction.symbol,
            type: { kind: "url", url: reaction.url },
            keywords: [reaction.name, reaction.symbol],
          }),
        ),
      });
    }

    categories.push(...getFilteredCategories(["flags", "smileys_and_people"], defaultEmojiCategories));

    return categories;
  }, [availableReactions, defaultEmojiCategories]);

  // ── image gestures ──────────────────────────────────────────────────────────
  const imgPan = Gesture.Pan()
    .withRef(imgPanRef)
    .onBegin(() => {
      imgSavedX.value = imgTranslateX.value;
      imgSavedY.value = imgTranslateY.value;
    })
    .onUpdate((e) => {
      imgTranslateX.value = imgSavedX.value + e.translationX;
      imgTranslateY.value = imgSavedY.value + e.translationY;
    });

  const imgPinch = Gesture.Pinch()
    .withRef(imgPinchRef)
    .onBegin(() => {
      imgSavedScale.value = imgScale.value;
    })
    .onUpdate((e) => {
      imgScale.value = Math.min(SCALE_MAX, Math.max(SCALE_MIN, imgSavedScale.value * e.scale));
    });

  const imgGesture = Gesture.Simultaneous(imgPan, imgPinch);

  const imgAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: imgTranslateX.value }, { translateY: imgTranslateY.value }, { scale: imgScale.value }],
  }));

  // ── handlers ────────────────────────────────────────────────────────────────
  const handlePreviewLayout = useCallback(
    (e: LayoutChangeEvent) => {
      containerWidth.value = e.nativeEvent.layout.width;
      containerHeight.value = e.nativeEvent.layout.height;
      onLayout(e);
    },
    [containerWidth, containerHeight, onLayout],
  );

  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: false,
      quality: 1,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setImage({ uri: asset.uri, width: asset.width, height: asset.height, fileSize: asset.fileSize ?? undefined });
      imgTranslateX.value = 0;
      imgTranslateY.value = 0;
      imgSavedX.value = 0;
      imgSavedY.value = 0;
      imgScale.value = 1;
      imgSavedScale.value = 1;
    }
  }, [imgTranslateX, imgTranslateY, imgSavedX, imgSavedY, imgScale, imgSavedScale]);

  const openAddText = useCallback(() => {
    setEditingText({ id: null, body: "", scale: 1, rotation: 0 });
  }, []);

  const openEditText = useCallback((item: TextItem) => {
    const h = textRefsMap.current.get(item.id);
    setEditingText({ id: item.id, body: item.body, scale: h?.getScale() ?? 1, rotation: h?.getRotation() ?? 0 });
  }, []);

  const openAddSticker = useCallback(() => {
    setEditingSticker({ id: null, emoji: "", scale: 1, rotation: 0 });
  }, []);

  const openEditSticker = useCallback((item: StickerItem) => {
    const h = stickerRefsMap.current.get(item.id);
    setEditingSticker({ id: item.id, emoji: item.emoji, scale: h?.getScale() ?? 1, rotation: h?.getRotation() ?? 0 });
  }, []);

  const handleConfirmText = useCallback(() => {
    if (!editingText || !editingText.body.trim()) {
      setEditingText(null);
      return;
    }
    const { body, scale, rotation } = {
      body: editingText.body.trim(),
      scale: editingText.scale,
      rotation: editingText.rotation,
    };
    if (editingText.id === null) {
      const id = `${Date.now()}-${Math.random()}`;
      setTexts((prev) => [...prev, { id, body, scale, rotation }]);
    } else {
      // scale/rotation は DraggableText の shared value が正なので body のみ更新
      setTexts((prev) => prev.map((t) => (t.id === editingText.id ? { ...t, body } : t)));
      // スライダー値をプレビューにも反映
      const h = textRefsMap.current.get(editingText.id);
      h?.setScale(scale);
      h?.setRotation(rotation);
    }
    setEditingText(null);
  }, [editingText]);

  const handleDeleteText = useCallback((id: string) => {
    setTexts((prev) => prev.filter((t) => t.id !== id));
    textRefsMap.current.delete(id);
  }, []);

  const handleConfirmSticker = useCallback(() => {
    if (!editingSticker || !editingSticker.emoji) {
      setEditingSticker(null);
      return;
    }

    const { emoji, scale, rotation } = editingSticker;
    if (editingSticker.id === null) {
      const id = `${Date.now()}-${Math.random()}`;
      setStickers((prev) => [...prev, { id, emoji, scale, rotation }]);
    } else {
      setStickers((prev) =>
        prev.map((sticker) => (sticker.id === editingSticker.id ? { ...sticker, emoji } : sticker)),
      );
      const h = stickerRefsMap.current.get(editingSticker.id);
      h?.setScale(scale);
      h?.setRotation(rotation);
    }

    setEditingSticker(null);
  }, [editingSticker]);

  const handleDeleteSticker = useCallback((id: string) => {
    setStickers((prev) => prev.filter((sticker) => sticker.id !== id));
    stickerRefsMap.current.delete(id);
  }, []);

  const handleSelectSticker = useCallback((emoji: EmojiItem) => {
    const e = emoji.type;
    if (e.kind === "unicode") {
      const codepoints = emojiToCodepoints(e.emoji);
      setEditingSticker((prev) => prev && { ...prev, emoji: codepoints });
      setAvailableReactions((prev) => {
        if (prev.some((reaction) => reaction.symbol === codepoints)) return prev;
        return [
          ...prev,
          {
            symbol: codepoints,
            name: emoji.keywords[0] ?? codepoints,
            url: `https://static.natsuneko.com/images/reactions/${codepoints}.png`,
          },
        ];
      });
      return;
    } else if (e.kind === "url") {
      setEditingSticker(
        (prev) => prev && { ...prev, emoji: e.url.substring(e.url.lastIndexOf("/") + 1, e.url.lastIndexOf(".")) },
      );
    }
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canPost || !account || !image) return;
    setIsSubmitting(true);
    try {
      const client = account.credential.client;
      const { data: uploadUrls } = await client.media.v2.upload.create({ throwOnError: true });
      const file = new FileSystem.File(image.uri);
      const ab = await file.arrayBuffer();
      await fetch(uploadUrls.signedUrl, { method: "PUT", body: ab, headers: { "Content-Type": "image/jpeg" } });

      const textPayload = texts.map((t) => {
        const p = textRefsMap.current.get(t.id)?.getPlacement() ?? { posX: 0.5, posY: 0.5, scale: 1, rotation: 0 };
        return {
          body: t.body,
          textStyle: "default" as const,
          textAlignment: "center" as const,
          color: "#ffffff",
          backgroundColor: "transparent",
          posX: p.posX,
          posY: p.posY,
          scale: p.scale,
          rotation: p.rotation,
        };
      });

      const stickerPayload = stickers.map((sticker) => {
        const p = stickerRefsMap.current.get(sticker.id)?.getPlacement() ?? {
          posX: 0.5,
          posY: 0.5,
          scale: 1,
          rotation: 0,
        };
        return {
          emoji: sticker.emoji,
          posX: p.posX,
          posY: p.posY,
          scale: p.scale,
          rotation: p.rotation,
        };
      });

      await client.catalyst.v1.fleet.create({
        body: {
          backgroundColor,
          media: {
            url: uploadUrls.url,
            width: image.width,
            height: image.height,
            bytes: image.fileSize ?? 0,
            placement: {
              posX: containerWidth.value > 0 ? imgTranslateX.value / containerWidth.value + 0.5 : 0.5,
              posY: containerHeight.value > 0 ? imgTranslateY.value / containerHeight.value + 0.5 : 0.5,
              scale: imgScale.value,
              rotation: 0,
            },
          },
          texts: textPayload,
          stickers: stickerPayload,
        },
        throwOnError: true,
      });

      router.dismiss();
      Toast.show({ type: "success", text1: "フリートを投稿しました" });
    } catch (error) {
      console.error("Failed to create fleet:", error);
      Toast.show({ type: "error", text1: "エラー", text2: "フリートの投稿に失敗しました" });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    canPost,
    account,
    image,
    backgroundColor,
    texts,
    stickers,
    containerWidth,
    containerHeight,
    imgTranslateX,
    imgTranslateY,
    imgScale,
    router,
  ]);

  const sheetBg = theme === "dark" ? "#1C1C1E" : "#FFFFFF";
  const handleColor = theme === "dark" ? "#48484A" : "#C7C7CC";
  const trackColor = theme === "dark" ? "#555" : "#ccc";

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <Stack.Screen
        options={{
          title: "Fleet",
          headerBackTitle: "キャンセル",
          headerRight: () => (
            <Pressable onPress={handleSubmit} disabled={!canPost}>
              <Text
                className={`text-base font-semibold ${canPost ? "text-light-accent dark:text-dark-accent" : "text-light-text-subtle dark:text-dark-text-subtle"}`}
              >
                投稿
              </Text>
            </Pressable>
          ),
        }}
      />
      <View className="flex-1 bg-light-background dark:bg-dark-background">
        {isSubmitting && (
          <View className="absolute inset-0 z-50 items-center justify-center bg-light-overlay dark:bg-dark-overlay">
            <ActivityIndicator size="large" />
          </View>
        )}

        {/* Preview — paddingBottom prevents sheet from covering content */}
        <View className="flex-1 items-center justify-center px-4" style={{ paddingBottom: sheetContentHeight }}>
          <View
            className="w-full overflow-hidden rounded-2xl"
            style={{ aspectRatio: 9 / 16, backgroundColor }}
            onLayout={handlePreviewLayout}
          >
            {image ? (
              <GestureDetector gesture={imgGesture}>
                <Animated.View
                  style={[
                    {
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      alignItems: "center",
                      justifyContent: "center",
                    },
                    imgAnimatedStyle,
                  ]}
                >
                  <Image source={{ uri: image.uri }} style={{ width: "100%", height: "100%" }} contentFit="contain" />
                </Animated.View>
              </GestureDetector>
            ) : (
              <Pressable onPress={handlePickImage} className="flex-1 items-center justify-center gap-2">
                <UniImageIcon size={40} className="text-light-icon dark:text-dark-icon" />
                <Text className="text-sm text-light-text-muted dark:text-dark-text-muted">タップして画像を選択</Text>
              </Pressable>
            )}

            {texts.map((item) => (
              <DraggableText
                key={item.id}
                ref={(r) => {
                  textRefsMap.current.set(item.id, r);
                }}
                body={item.body}
                containerWidth={containerWidth}
                containerHeight={containerHeight}
                imgPanRef={imgPanRef}
                imgPinchRef={imgPinchRef}
              />
            ))}

            {stickers.map((item) => (
              <DraggableSticker
                key={item.id}
                ref={(r) => {
                  stickerRefsMap.current.set(item.id, r);
                }}
                unit={cqw(1)}
                emoji={item.emoji}
                imageUrl={reactionUrlMap[item.emoji]}
                containerWidth={containerWidth}
                containerHeight={containerHeight}
                imgPanRef={imgPanRef}
                imgPinchRef={imgPinchRef}
              />
            ))}
          </View>
        </View>

        {/* Bottom Sheet — always visible toolbar */}
        <BottomSheet
          index={0}
          enableDynamicSizing
          enableContentPanningGesture={false}
          enablePanDownToClose={false}
          backgroundStyle={{ backgroundColor: sheetBg }}
          handleIndicatorStyle={{ backgroundColor: handleColor }}
        >
          <BottomSheetView
            onLayout={(e) => setSheetContentHeight(e.nativeEvent.layout.height + 24 /* handle height */)}
            style={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 8, gap: 12 }}
          >
            {/* Background color */}
            <View className="flex-row items-center gap-2">
              <Text className="w-16 text-xs text-light-text-muted dark:text-dark-text-muted">背景色</Text>
              <View className="flex-1 flex-row gap-2">
                {BG_COLORS.map((color) => (
                  <Pressable
                    key={color}
                    onPress={() => setBackgroundColor(color)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: color,
                      borderWidth: backgroundColor === color ? 2.5 : 1,
                      borderColor: backgroundColor === color ? "#888" : "rgba(128,128,128,0.4)",
                    }}
                  />
                ))}
              </View>
            </View>

            {/* Actions */}
            <View className="flex-row gap-3">
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                <Pressable
                  onPress={handlePickImage}
                  className="flex-row items-center gap-1.5 rounded-full border border-light-border px-3 py-2 dark:border-dark-border"
                >
                  <UniImageIcon size={16} className="text-light-text dark:text-dark-text" />
                  <Text className="text-sm text-light-text dark:text-dark-text">
                    {image ? "画像を変更" : "画像を選択"}
                  </Text>
                </Pressable>

                {texts.length < MAX_TEXTS ? (
                  <Pressable
                    onPress={openAddText}
                    className="flex-row items-center gap-1.5 rounded-full border border-light-border px-3 py-2 dark:border-dark-border"
                  >
                    <UniType size={16} className="text-light-text dark:text-dark-text" />
                    <UniPlus size={14} className="text-light-text dark:text-dark-text" />
                    <Text className="text-sm text-light-text dark:text-dark-text">
                      テキスト追加 ({texts.length}/{MAX_TEXTS})
                    </Text>
                  </Pressable>
                ) : (
                  <View className="flex-row items-center gap-1.5 rounded-full border border-light-border px-3 py-2 opacity-40 dark:border-dark-border">
                    <UniType size={16} className="text-light-text dark:text-dark-text" />
                    <Text className="text-sm text-light-text dark:text-dark-text">
                      テキスト ({texts.length}/{MAX_TEXTS})
                    </Text>
                  </View>
                )}

                {stickers.length < MAX_STICKERS ? (
                  <Pressable
                    onPress={openAddSticker}
                    className="flex-row items-center gap-1.5 rounded-full border border-light-border px-3 py-2 dark:border-dark-border"
                  >
                    <UniPlus size={14} className="text-light-text dark:text-dark-text" />
                    <Text className="text-sm text-light-text dark:text-dark-text">
                      ステッカー追加 ({stickers.length}/{MAX_STICKERS})
                    </Text>
                  </Pressable>
                ) : (
                  <View className="flex-row items-center gap-1.5 rounded-full border border-light-border px-3 py-2 opacity-40 dark:border-dark-border">
                    <Text className="text-sm text-light-text dark:text-dark-text">
                      ステッカー ({stickers.length}/{MAX_STICKERS})
                    </Text>
                  </View>
                )}
              </ScrollView>
            </View>

            {/* Text chip list */}
            {texts.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                {texts.map((item) => (
                  <View
                    key={item.id}
                    className="flex-row items-center gap-1 rounded-full border border-light-border bg-light-surface px-3 py-2 dark:border-dark-border dark:bg-dark-surface"
                  >
                    <Text
                      className="max-w-28 text-sm text-light-text dark:text-dark-text text-ellipsis"
                      numberOfLines={1}
                    >
                      {item.body}
                    </Text>
                    <Pressable onPress={() => openEditText(item)} className="p-1" hitSlop={8}>
                      <UniPencil size={12} className="text-light-text-muted dark:text-dark-text-muted" />
                    </Pressable>
                    <Pressable onPress={() => handleDeleteText(item.id)} className="p-1" hitSlop={8}>
                      <UniTrash2 size={12} className="text-light-error dark:text-dark-error" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}

            {stickers.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
                {stickers.map((item) => (
                  <View
                    key={item.id}
                    className="flex-row items-center gap-1 rounded-full border border-light-border bg-light-surface px-3 py-2 dark:border-dark-border dark:bg-dark-surface"
                  >
                    <Image
                      source={{
                        uri:
                          reactionUrlMap[item.emoji] ??
                          `https://static.natsuneko.com/images/reactions/${item.emoji}.png`,
                      }}
                      style={{ width: 20, height: 20 }}
                      contentFit="contain"
                    />
                    <Text
                      className="max-w-28 text-sm text-light-text dark:text-dark-text text-ellipsis"
                      numberOfLines={1}
                    >
                      {availableReactions.find((reaction) => reaction.symbol === item.emoji)?.name ?? item.emoji}
                    </Text>
                    <Pressable onPress={() => openEditSticker(item)} className="p-1" hitSlop={8}>
                      <UniPencil size={12} className="text-light-text-muted dark:text-dark-text-muted" />
                    </Pressable>
                    <Pressable onPress={() => handleDeleteSticker(item.id)} className="p-1" hitSlop={8}>
                      <UniTrash2 size={12} className="text-light-error dark:text-dark-error" />
                    </Pressable>
                  </View>
                ))}
              </ScrollView>
            )}

            {!image && <Text className="text-xs text-light-error dark:text-dark-error">※ 画像は必須です</Text>}
          </BottomSheetView>
        </BottomSheet>

        {/* Text add / edit modal */}
        <Modal visible={editingText !== null} animationType="slide" transparent>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
            <Pressable className="flex-1" onPress={() => setEditingText(null)} />
            <View className="gap-3 rounded-t-2xl bg-light-surface-elevated p-4 dark:bg-dark-surface-elevated">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-light-text dark:text-dark-text">
                  {editingText?.id === null ? "テキストを追加" : "テキストを編集"}
                </Text>
                <Pressable onPress={() => setEditingText(null)}>
                  <UniX size={20} className="text-light-text dark:text-dark-text" />
                </Pressable>
              </View>
              <TextInput
                value={editingText?.body ?? ""}
                onChangeText={(v) => setEditingText((prev) => prev && { ...prev, body: v })}
                placeholder="テキストを入力..."
                placeholderTextColor={theme === "dark" ? "#666" : "#999"}
                multiline
                maxLength={500}
                autoFocus
                className="min-h-24 rounded-lg border border-light-border bg-light-surface p-3 text-base text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                textAlignVertical="top"
              />
              <Text className="text-right text-xs text-light-text-muted dark:text-dark-text-muted">
                {(editingText?.body ?? "").length} / 500
              </Text>

              {/* Scale slider */}
              <View className="flex-row items-center gap-2">
                <Text className="w-12 text-xs text-light-text-muted dark:text-dark-text-muted">拡大縮小</Text>
                <Slider
                  style={{ flex: 1 }}
                  minimumValue={SCALE_MIN}
                  maximumValue={SCALE_MAX}
                  value={editingText?.scale ?? 1}
                  onValueChange={(v) => {
                    setEditingText((prev) => prev && { ...prev, scale: v });
                    if (editingText?.id) textRefsMap.current.get(editingText.id)?.setScale(v);
                  }}
                  minimumTrackTintColor="#e879a0"
                  maximumTrackTintColor={trackColor}
                  thumbTintColor="#e879a0"
                />
                <Text className="w-10 text-right text-xs text-light-text-muted dark:text-dark-text-muted">
                  {(editingText?.scale ?? 1).toFixed(2)}x
                </Text>
              </View>

              {/* Rotation slider */}
              <View className="flex-row items-center gap-2">
                <Text className="w-12 text-xs text-light-text-muted dark:text-dark-text-muted">回転</Text>
                <Slider
                  style={{ flex: 1 }}
                  minimumValue={-180}
                  maximumValue={180}
                  value={editingText?.rotation ?? 0}
                  onValueChange={(v) => {
                    setEditingText((prev) => prev && { ...prev, rotation: v });
                    if (editingText?.id) textRefsMap.current.get(editingText.id)?.setRotation(v);
                  }}
                  minimumTrackTintColor="#e879a0"
                  maximumTrackTintColor={trackColor}
                  thumbTintColor="#e879a0"
                />
                <Text className="w-10 text-right text-xs text-light-text-muted dark:text-dark-text-muted">
                  {Math.round(editingText?.rotation ?? 0)}°
                </Text>
              </View>

              <Pressable
                onPress={handleConfirmText}
                disabled={!editingText?.body.trim()}
                className={`items-center rounded-lg py-3 ${editingText?.body.trim() ? "bg-light-accent dark:bg-dark-accent" : "bg-light-surface-muted dark:bg-dark-surface-muted"}`}
              >
                <Text
                  className={`text-sm font-semibold ${editingText?.body.trim() ? "text-light-accent-foreground dark:text-dark-accent-foreground" : "text-light-text-subtle dark:text-dark-text-subtle"}`}
                >
                  {editingText?.id === null ? "追加" : "更新"}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={editingSticker !== null} animationType="slide" transparent>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} className="flex-1">
            <Pressable className="flex-1" onPress={() => setEditingSticker(null)} />
            <View className="max-h-[85%] gap-3 rounded-t-2xl bg-light-surface-elevated p-4 dark:bg-dark-surface-elevated">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-light-text dark:text-dark-text">
                  {editingSticker?.id === null ? "ステッカーを追加" : "ステッカーを編集"}
                </Text>
                <Pressable onPress={() => setEditingSticker(null)}>
                  <UniX size={20} className="text-light-text dark:text-dark-text" />
                </Pressable>
              </View>

              <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">ステッカーを選択</Text>
              <View className="h-72 overflow-hidden rounded-2xl border border-light-border dark:border-dark-border">
                {isLoadingReactions || isLoadingDefaultEmojis ? (
                  <View className="flex-1 items-center justify-center py-6">
                    <ActivityIndicator />
                  </View>
                ) : stickerCategories.length > 0 ? (
                  <EmojiPickerView categories={stickerCategories} onEmojiSelected={handleSelectSticker} />
                ) : (
                  <View className="flex-1 items-center justify-center px-4 py-6">
                    <Text className="text-center text-sm text-light-text-muted dark:text-dark-text-muted">
                      利用できるステッカーがありません
                    </Text>
                  </View>
                )}
              </View>

              <View className="flex-row items-center gap-2">
                <Text className="w-12 text-xs text-light-text-muted dark:text-dark-text-muted">拡大縮小</Text>
                <Slider
                  style={{ flex: 1 }}
                  minimumValue={SCALE_MIN}
                  maximumValue={SCALE_MAX}
                  value={editingSticker?.scale ?? 1}
                  onValueChange={(v) => {
                    setEditingSticker((prev) => prev && { ...prev, scale: v });
                    if (editingSticker?.id) stickerRefsMap.current.get(editingSticker.id)?.setScale(v);
                  }}
                  minimumTrackTintColor="#e879a0"
                  maximumTrackTintColor={trackColor}
                  thumbTintColor="#e879a0"
                />
                <Text className="w-10 text-right text-xs text-light-text-muted dark:text-dark-text-muted">
                  {(editingSticker?.scale ?? 1).toFixed(2)}x
                </Text>
              </View>

              <View className="flex-row items-center gap-2">
                <Text className="w-12 text-xs text-light-text-muted dark:text-dark-text-muted">回転</Text>
                <Slider
                  style={{ flex: 1 }}
                  minimumValue={-180}
                  maximumValue={180}
                  value={editingSticker?.rotation ?? 0}
                  onValueChange={(v) => {
                    setEditingSticker((prev) => prev && { ...prev, rotation: v });
                    if (editingSticker?.id) stickerRefsMap.current.get(editingSticker.id)?.setRotation(v);
                  }}
                  minimumTrackTintColor="#e879a0"
                  maximumTrackTintColor={trackColor}
                  thumbTintColor="#e879a0"
                />
                <Text className="w-10 text-right text-xs text-light-text-muted dark:text-dark-text-muted">
                  {Math.round(editingSticker?.rotation ?? 0)}°
                </Text>
              </View>

              <Pressable
                onPress={handleConfirmSticker}
                disabled={!editingSticker?.emoji}
                className={`items-center rounded-lg py-3 ${editingSticker?.emoji ? "bg-light-accent dark:bg-dark-accent" : "bg-light-surface-muted dark:bg-dark-surface-muted"}`}
              >
                <Text
                  className={`text-sm font-semibold ${editingSticker?.emoji ? "text-light-accent-foreground dark:text-dark-accent-foreground" : "text-light-text-subtle dark:text-dark-text-subtle"}`}
                >
                  {editingSticker?.id === null ? "追加" : "更新"}
                </Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      </View>
    </>
  );
}
