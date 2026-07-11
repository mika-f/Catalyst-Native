import { CatalystActionSheetItem, CatalystDivider } from "@/components/design-system";
import { getCdnUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { timelineImageQualityAtom, timelineWifiUpgradeAtom } from "@/models/atoms/image-quality";
import NetInfo from "@react-native-community/netinfo";
import { useAtomValue } from "jotai";
import { Zoomable } from "@likashefqet/react-native-image-zoom";
import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import type { Media } from "@/models/sdk-types";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { File, Paths } from "expo-file-system";
import { Asset as MediaLibraryAsset, requestPermissionsAsync as requestMediaLibraryPermissions } from "expo-media-library";
import { Download, ImageDown, Share2 } from "lucide-react-native";
import { EyeOff } from "lucide-react-native";
import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, Share, Text, View, useColorScheme, useWindowDimensions } from "react-native";
import { Gesture, GestureDetector, GestureHandlerRootView } from "react-native-gesture-handler";
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { withUniwind } from "uniwind";

const UniShare2 = withUniwind(Share2);
const UniDownload = withUniwind(Download);
const UniImageDown = withUniwind(ImageDown);

const SPRING_CONFIG = {
  mass: 0.5,
  stiffness: 150,
  damping: 80,
  initialVelocity: 0.1,
};

type Props = {
  medias: Media[];
  onIndexChange?: (index: number) => void;
};

export const MediaCarousel = memo(({ medias, onIndexChange }: Props) => {
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = useWindowDimensions();
  const MAX_HEIGHT = SCREEN_HEIGHT / 2;
  const theme = useColorScheme() ?? "light";
  const [presentedMediaIndex, setPresentedMediaIndex] = useState<number | null>(null);
  const [isBlurRemoved, setIsBlurRemoved] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);
  const [activeTouches, setActiveTouches] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const mediaIdentity = useMemo(() => medias.map((media) => media.id).join(":"), [medias]);
  const modalIndexRef = useRef(0);
  const imageActionsSheetRef = useRef<BottomSheet>(null);
  const actionTargetMediaRef = useRef<Media | null>(null);

  const imageQuality = useAtomValue(timelineImageQualityAtom);
  const wifiUpgrade = useAtomValue(timelineWifiUpgradeAtom);
  const [isWifi, setIsWifi] = useState(false);

  useEffect(() => {
    NetInfo.fetch().then((state) => setIsWifi(state.type === "wifi"));
    return NetInfo.addEventListener((state) => setIsWifi(state.type === "wifi"));
  }, []);

  const timelineVariant = useMemo(() => {
    if (wifiUpgrade && isWifi) {
      return imageQuality === "low" ? "small" : "medium";
    }
    return imageQuality === "low" ? "timeline" : "small";
  }, [imageQuality, wifiUpgrade, isWifi]);

  const len = medias.length;
  const translateX = useSharedValue(0);
  const currentIndexSV = useSharedValue(0);

  const modalTranslateY = useSharedValue(0);
  const zoomScale = useSharedValue(1);

  useAnimatedReaction(
    () => zoomScale.value > 1.01,
    (isZoomedNow, wasZoomed) => {
      if (isZoomedNow !== wasZoomed) {
        runOnJS(setIsZoomed)(isZoomedNow);
      }
    },
  );

  const dismissModal = () => setPresentedMediaIndex(null);

  const doShareImage = useCallback(async () => {
    const media = actionTargetMediaRef.current;
    if (!media) return;

    imageActionsSheetRef.current?.close();

    try {
      const url = getCdnUrl({
        src: media.url,
        variant: "medium",
        width: SCREEN_WIDTH,
        aspect: { w: media.metadata?.width ?? 1, h: media.metadata?.height ?? 1 },
      });
      const file = await File.downloadFileAsync(url, Paths.cache, { idempotent: true });
      await Share.share(Platform.OS === "ios" ? { url: file.uri } : { message: url });
    } catch (e) {
      Alert.alert("エラー", `画像の共有に失敗しました。\n${e instanceof Error ? e.message : String(e)}`);
    }
  }, [SCREEN_WIDTH]);

  const doSaveImage = useCallback(
    async (quality: "current" | "original") => {
      const media = actionTargetMediaRef.current;
      if (!media) return;

      imageActionsSheetRef.current?.close();

      try {
        const { status } = await requestMediaLibraryPermissions();
        if (status !== "granted") {
          Alert.alert("権限エラー", "写真を保存するには写真ライブラリへのアクセス許可が必要です。");
          return;
        }

        const url =
          quality === "original"
            ? getCdnUrl({ src: media.url, variant: "original", width: 9999 })
            : getCdnUrl({
                src: media.url,
                variant: "medium",
                width: SCREEN_WIDTH,
                aspect: { w: media.metadata?.width ?? 1, h: media.metadata?.height ?? 1 },
              });

        const file = await File.downloadFileAsync(url, Paths.cache, { idempotent: true });
        await MediaLibraryAsset.create(file.uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        Alert.alert("エラー", `画像の保存に失敗しました。\n${e instanceof Error ? e.message : String(e)}`);
      }
    },
    [SCREEN_WIDTH],
  );

  const handleImageLongPress = useCallback(() => {
    const media = medias[modalIndexRef.current];
    if (!media) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    actionTargetMediaRef.current = media;
    imageActionsSheetRef.current?.snapToIndex(0);
  }, [medias]);

  useEffect(() => {
    // FlashList can recycle timeline cells, so reset carousel state when a different post's media set is mounted.
    setPresentedMediaIndex(null);
    setIsBlurRemoved(false);
    setCurrentIndex(0);
    setIsZoomed(false);
    setModalIndex(0);
    setActiveTouches(0);
    modalIndexRef.current = 0;
    translateX.value = 0;
    currentIndexSV.value = 0;
    modalTranslateY.value = 0;
    zoomScale.value = 1;
    scrollViewRef.current?.scrollTo({ x: 0, y: 0, animated: false });
  }, [mediaIdentity, currentIndexSV, modalTranslateY, translateX, zoomScale]);

  const dismissPanGesture = Gesture.Pan()
    .activeOffsetY([-12, 12])
    .failOffsetX([-6, 6])
    .onUpdate((event) => {
      if (zoomScale.value > 1.01) return;
      modalTranslateY.value = event.translationY;
    })
    .onEnd((event) => {
      if (zoomScale.value > 1.01) {
        modalTranslateY.value = withSpring(0, SPRING_CONFIG);
        return;
      }
      const shouldDismiss = Math.abs(event.translationY) > SCREEN_HEIGHT * 0.15 || Math.abs(event.velocityY) > 800;
      if (shouldDismiss) {
        const direction = event.translationY > 0 ? 1 : -1;
        modalTranslateY.value = withTiming(direction * SCREEN_HEIGHT, { duration: 200 }, () => {
          runOnJS(dismissModal)();
        });
      } else {
        modalTranslateY.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const longPressGesture = Gesture.LongPress()
    .minDuration(600)
    .onStart(() => {
      runOnJS(handleImageLongPress)();
    });

  const modalGesture = Gesture.Simultaneous(dismissPanGesture, longPressGesture);

  const modalContentStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: modalTranslateY.value }],
  }));

  const modalBgStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(0,0,0,${interpolate(Math.abs(modalTranslateY.value), [0, SCREEN_HEIGHT * 0.4], [1, 0.2], "clamp")})`,
  }));

  const hasSensitiveContent = medias.some((m) => m.metadata?.isSensitive || m.metadata?.isSpoiler);
  const isSensitive = medias.some((m) => m.metadata?.isSensitive);
  const isSpoiler = medias.some((m) => m.metadata?.isSpoiler);

  const firstMedia = medias[0];
  const aspectRatio =
    firstMedia?.metadata?.width && firstMedia?.metadata?.height
      ? firstMedia.metadata.width / firstMedia.metadata.height
      : null;
  const actualHeight = aspectRatio ? Math.min(SCREEN_WIDTH / aspectRatio, MAX_HEIGHT) : MAX_HEIGHT;
  const carouselHeight = actualHeight + (len > 1 ? 32 : 0);

  const handleMediaPress = (index: number) => {
    if (hasSensitiveContent && !isBlurRemoved) return;
    modalTranslateY.value = 0;
    setPresentedMediaIndex(index);
    setModalIndex(index);
    modalIndexRef.current = index;
  };

  const panGesture = Gesture.Pan()
    // Activate for horizontal movement (≥8px), fail if vertical dominates.
    // 8px < iOS UIScrollView drag threshold (~10px), so this gesture wins
    // the race against the outer tab-switching FlatList scroll recognizer.
    // tan(~37°) ≈ 0.75 → slightly wider cone than the original 31° (10/6).
    .activeOffsetX([-8, 8])
    .failOffsetY([-6, 6])
    .onUpdate((event) => {
      const translation = event.translationX;
      let applied: number;
      // Apply resistance at edges (divide by 5)
      if (currentIndexSV.value === 0 && translation > 0) {
        applied = translation / 5;
      } else if (currentIndexSV.value === len - 1 && translation < 0) {
        applied = translation / 5;
      } else {
        applied = translation;
      }
      translateX.value = -currentIndexSV.value * SCREEN_WIDTH + applied;
    })
    .onEnd((event) => {
      const translation = event.translationX;
      const velocity = event.velocityX;
      let newIndex = currentIndexSV.value;

      const threshold = SCREEN_WIDTH * 0.1;
      if (Math.abs(translation) > threshold || Math.abs(velocity) > 500) {
        newIndex = translation > 0 ? currentIndexSV.value - 1 : currentIndexSV.value + 1;
      }

      newIndex = Math.max(0, Math.min(newIndex, len - 1));
      currentIndexSV.value = newIndex;
      translateX.value = withSpring(-newIndex * SCREEN_WIDTH, SPRING_CONFIG);
      runOnJS(setCurrentIndex)(newIndex);
      if (onIndexChange) runOnJS(onIndexChange)(newIndex);
    });

  const tapGesture = Gesture.Tap().onEnd(() => {
    runOnJS(handleMediaPress)(currentIndexSV.value);
  });

  // Pan takes priority; tap fires only when no horizontal pan is detected
  const gesture = Gesture.Exclusive(panGesture, tapGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const navigateToIndex = (index: number) => {
    currentIndexSV.value = index;
    translateX.value = withSpring(-index * SCREEN_WIDTH, SPRING_CONFIG);
    setCurrentIndex(index);
    onIndexChange?.(index);
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  );

  return (
    <>
      <View style={{ height: carouselHeight, overflow: "hidden" }}>
        <GestureDetector gesture={gesture}>
          <Animated.View
            style={[
              {
                flexDirection: "row",
                height: actualHeight,
                width: SCREEN_WIDTH * len,
              },
              animatedStyle,
            ]}
          >
            {medias.map((media) => (
              <View
                key={media.id}
                style={{
                  width: SCREEN_WIDTH,
                  height: actualHeight,
                  backgroundColor: "rgba(128,128,128,0.25)",
                }}
              >
                <Image
                  recyclingKey={`${mediaIdentity}:${media.id}:timeline`}
                  source={{
                    uri: getCdnUrl({
                      src: media.url,
                      width: SCREEN_WIDTH,
                      variant: timelineVariant,
                      aspect: { w: media.metadata?.width ?? 1, h: media.metadata?.height ?? 1 },
                    }),
                  }}
                  style={{ width: SCREEN_WIDTH, height: actualHeight }}
                  contentFit="contain"
                />
                {hasSensitiveContent && !isBlurRemoved && (
                  <View
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: "rgba(255,255,255,0.6)",
                    }}
                  />
                )}
              </View>
            ))}
          </Animated.View>
        </GestureDetector>

        {/* Sensitive content overlay */}
        {hasSensitiveContent && !isBlurRemoved && (
          <Pressable
            className="absolute inset-0 bg-light-skeleton dark:bg-dark-skeleton items-center justify-center gap-2"
            onPress={() => setIsBlurRemoved(true)}
          >
            <EyeOff size={28} color="white" />
            <Text style={{ color: "white", fontWeight: "bold", fontSize: 17 }}>Tap to view</Text>
            {isSensitive && (
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>センシティブコンテンツです</Text>
            )}
            {isSpoiler && (
              <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: 13 }}>ネタバレ注意コンテンツです</Text>
            )}
          </Pressable>
        )}

        {/* Indicator dots */}
        {len > 1 && (
          <View className="h-8 flex-row justify-center items-center" style={{ width: SCREEN_WIDTH }}>
            {medias.map((_, index) => (
              <Pressable
                key={index}
                onPress={() => navigateToIndex(index)}
                hitSlop={8}
                className={cn(
                  "w-2 h-2 rounded-full p-1 mx-2",
                  index === currentIndex ? "bg-light-tint dark:bg-dark-tint" : "bg-light-icon dark:bg-dark-icon",
                )}
              />
            ))}
          </View>
        )}
      </View>

      {/* Fullscreen image modal */}
      <Modal
        visible={presentedMediaIndex !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPresentedMediaIndex(null)}
      >
        <GestureHandlerRootView style={{ flex: 1 }}>
          {/* Background color animation */}
          <Animated.View
            style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, modalBgStyle]}
            pointerEvents="none"
          />

          {/* Close button */}
          <Pressable
            onPress={() => setPresentedMediaIndex(null)}
            style={{ position: "absolute", top: 48, right: 16, zIndex: 10, padding: 8 }}
          >
            <Text style={{ color: "white", fontSize: 20 }}>✕</Text>
          </Pressable>

          {/* Image content with dismiss/long-press gesture */}
          <GestureDetector gesture={modalGesture}>
            <Animated.View style={[{ flex: 1 }, modalContentStyle]}>
              {presentedMediaIndex !== null && (
                <ScrollView
                  ref={scrollViewRef}
                  horizontal
                  pagingEnabled
                  scrollEnabled={!isZoomed && activeTouches < 2}
                  showsHorizontalScrollIndicator={false}
                  contentOffset={{ x: (presentedMediaIndex ?? 0) * SCREEN_WIDTH, y: 0 }}
                  onMomentumScrollEnd={(e) => {
                    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                    setModalIndex(index);
                    modalIndexRef.current = index;
                  }}
                  onTouchStart={(e) => setActiveTouches(e.nativeEvent.touches.length)}
                  onTouchMove={(e) => setActiveTouches(e.nativeEvent.touches.length)}
                  onTouchEnd={() => setActiveTouches(0)}
                >
                  {medias.map((media, index) => (
                    <View
                      key={media.id}
                      style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: "center" }}
                    >
                      {index === modalIndex ? (
                        <Zoomable
                          minScale={1}
                          maxScale={5}
                          scale={zoomScale}
                          doubleTapScale={3}
                          isDoubleTapEnabled
                          isPinchEnabled
                          isPanEnabled={isZoomed}
                          style={{
                            width: SCREEN_WIDTH,
                            height: SCREEN_HEIGHT,
                            justifyContent: "center",
                            alignItems: "center",
                          }}
                        >
                          <Image
                            recyclingKey={`${mediaIdentity}:${media.id}:modal`}
                            source={{
                              uri: getCdnUrl({
                                src: media.url,
                                variant: "medium",
                                width: SCREEN_WIDTH,
                                aspect: { w: media.metadata?.width ?? 1, h: media.metadata?.height ?? 1 },
                              }),
                            }}
                            style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                            contentFit="contain"
                          />
                        </Zoomable>
                      ) : (
                        <Image
                          recyclingKey={`${mediaIdentity}:${media.id}:modal`}
                          source={{
                            uri: getCdnUrl({
                              src: media.url,
                              variant: "medium",
                              width: SCREEN_WIDTH,
                              aspect: { w: media.metadata?.width ?? 1, h: media.metadata?.height ?? 1 },
                            }),
                          }}
                          style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
                          contentFit="contain"
                        />
                      )}
                    </View>
                  ))}
                </ScrollView>
              )}
            </Animated.View>
          </GestureDetector>

          {/* Image action bottom sheet - rendered directly (no portal) so it works inside Modal */}
          <BottomSheet
            ref={imageActionsSheetRef}
            index={-1}
            enableDynamicSizing
            enablePanDownToClose
            backdropComponent={renderBackdrop}
            backgroundStyle={{
              backgroundColor: theme === "dark" ? "#1C1C1E" : "#FFFFFF",
            }}
            handleIndicatorStyle={{
              backgroundColor: theme === "dark" ? "#48484A" : "#C7C7CC",
            }}
          >
            <BottomSheetView style={{ paddingBottom: 32 }}>
              <CatalystActionSheetItem icon={UniShare2} title="画像を共有" onPress={doShareImage} tone="accent" />
              <CatalystDivider className="ml-14 w-auto" />
              <CatalystActionSheetItem
                icon={UniDownload}
                title="現在の画質で保存"
                onPress={() => doSaveImage("current")}
              />
              <CatalystDivider className="ml-14 w-auto" />
              <CatalystActionSheetItem
                icon={UniImageDown}
                title="最大画質で保存"
                onPress={() => doSaveImage("original")}
              />
            </BottomSheetView>
          </BottomSheet>
        </GestureHandlerRootView>
      </Modal>
    </>
  );
});
MediaCarousel.displayName = "MediaCarousel";
