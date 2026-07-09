import { FleetContent, FleetContentData } from "@/components/fleet/content";
import { getCdnUrl, getIdenticonUrl } from "@/lib/media";
import { accountAtom } from "@/models/atoms/account";
import { clientAtom } from "@/models/atoms/credential";
import type { CatalystFleet } from "@/models/sdk-types";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { Ellipsis } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Modal, Pressable, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);
const UniEllipsis = withUniwind(Ellipsis);

const FLEET_DURATION = 1000 * 6; // 6 seconds

type Props = {
  username: string | null;
  usernames: string[];
  visible: boolean;
  onClose: () => void;
  onMarkRead: (username: string) => void;
};

const toFleetContentData = (fleet: CatalystFleet): FleetContentData => ({
  backgroundColor: fleet.backgroundColor,
  media: fleet.media
    ? {
        url: fleet.media.url,
        alt: fleet.media.alt,
        width: fleet.media.width ?? undefined,
        height: fleet.media.height ?? undefined,
        placement: fleet.media.placement,
      }
    : null,
  stickers: fleet.stickers.map((s) => ({
    emoji: s.emoji,
    id: s.id,
    posX: s.posX,
    posY: s.posY,
    rotation: s.rotation,
    scale: s.scale,
  })),
  texts: fleet.texts.map((t) => ({
    id: t.id,
    body: t.body,
    color: t.color,
    backgroundColor: t.backgroundColor,
    posX: t.posX,
    posY: t.posY,
    rotation: t.rotation,
    scale: t.scale,
    textAlignment: t.textAlignment as "left" | "center" | "right",
    textStyle: t.textStyle as "default" | "bold" | "serif" | "handwriting",
  })),
});

type ProgressBarState = "past" | "current" | "future";

type ProgressBarProps = {
  state: ProgressBarState;
  paused: boolean;
  onComplete: () => void;
};

const ProgressBar = ({ state, paused, onComplete }: ProgressBarProps) => {
  const progress = useSharedValue(state === "past" ? 1 : 0);
  const prevStateRef = useRef(state);

  const handleComplete = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const prevState = prevStateRef.current;
    prevStateRef.current = state;

    if (state !== "current") {
      cancelAnimation(progress);
      progress.value = state === "past" ? 1 : 0;
      return;
    }

    if (paused) {
      cancelAnimation(progress);
      return;
    }

    if (prevState !== "current") {
      // 別の状態から "current" に遷移した場合は 0 から開始
      cancelAnimation(progress);
      progress.value = withSequence(
        withTiming(0, { duration: 0 }),
        withTiming(1, { duration: FLEET_DURATION }, (finished) => {
          if (finished) runOnJS(handleComplete)();
        }),
      );
    } else {
      // pause 解除などで再開する場合は現在位置から続行
      const remaining = FLEET_DURATION * (1 - progress.value);
      progress.value = withTiming(1, { duration: remaining }, (finished) => {
        if (finished) runOnJS(handleComplete)();
      });
    }
  }, [state, paused, handleComplete, progress]);

  const filledStyle = useAnimatedStyle(() => ({ flex: progress.value }));
  const emptyStyle = useAnimatedStyle(() => ({ flex: 1 - progress.value }));

  return (
    <View className="flex-1 h-[2.5px] flex-row rounded-full overflow-hidden">
      <Animated.View className="bg-white" style={filledStyle} />
      <Animated.View className="bg-white/40" style={emptyStyle} />
    </View>
  );
};

export const FleetViewer = ({ username, usernames, visible, onClose, onMarkRead }: Props) => {
  const client = useAtomValue(clientAtom);
  const account = useAtomValue(accountAtom);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeUsername, setActiveUsername] = useState<string | null>(null);
  const [fleets, setFleets] = useState<CatalystFleet[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isMediaLoaded, setIsMediaLoaded] = useState(false);

  // 外部から username が変わったら activeUsername を同期
  useEffect(() => {
    if (visible && username) {
      setActiveUsername(username);
    }
  }, [visible, username]);

  useEffect(() => {
    if (!visible || !activeUsername || !client) return;
    setIsLoading(true);
    setCurrentIndex(0);
    client.catalyst.v1.fleet.by.user.username
      .get({ path: { username: activeUsername }, throwOnError: true })
      .then(({ data }) => {
        setFleets(data);
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
        onClose();
      });
  }, [visible, activeUsername, client]);

  useEffect(() => {
    setIsMediaLoaded(false);
  }, [currentIndex]);

  useEffect(() => {
    if (!visible || isLoading || fleets.length === 0 || !client) return;
    const fleet = fleets[currentIndex];
    if (fleet) {
      client.catalyst.v1.fleet.id.view
        .create({ path: { id: fleet.id }, throwOnError: true })
        .catch(() => {});
    }
  }, [visible, isLoading, currentIndex, fleets, client]);

  const activeUsernameRef = useRef(activeUsername);
  activeUsernameRef.current = activeUsername;
  const usernamesRef = useRef(usernames);
  usernamesRef.current = usernames;
  const fleetsRef = useRef(fleets);
  fleetsRef.current = fleets;

  // ユーザー操作で進行/後退した際にインクリメントし、古い自動進行を無視する
  const navEpochRef = useRef(0);

  const autoAdvance = useCallback(() => {
    const epoch = navEpochRef.current;
    setCurrentIndex((prev) => {
      // ユーザーが手動でナビゲーションした場合、この自動進行を無視
      if (navEpochRef.current !== epoch) return prev;
      if (prev + 1 >= fleetsRef.current.length) {
        const name = activeUsernameRef.current;
        if (name) onMarkRead(name);
        const userIndex = usernamesRef.current.indexOf(name ?? "");
        if (userIndex >= 0 && userIndex + 1 < usernamesRef.current.length) {
          setActiveUsername(usernamesRef.current[userIndex + 1]);
          return 0;
        }
        onClose();
        return prev;
      }
      return prev + 1;
    });
  }, [onClose, onMarkRead]);

  const goNext = useCallback(() => {
    navEpochRef.current += 1;
    setCurrentIndex((prev) => {
      if (prev + 1 >= fleetsRef.current.length) {
        const name = activeUsernameRef.current;
        if (name) onMarkRead(name);
        const userIndex = usernamesRef.current.indexOf(name ?? "");
        if (userIndex >= 0 && userIndex + 1 < usernamesRef.current.length) {
          setActiveUsername(usernamesRef.current[userIndex + 1]);
          return 0;
        }
        onClose();
        return prev;
      }
      return prev + 1;
    });
  }, [onClose, onMarkRead]);

  const goPrev = useCallback(() => {
    navEpochRef.current += 1;
    setCurrentIndex((prev) => {
      if (prev === 0) {
        const name = activeUsernameRef.current;
        const userIndex = usernamesRef.current.indexOf(name ?? "");
        if (userIndex > 0) {
          setActiveUsername(usernamesRef.current[userIndex - 1]);
        }
        return 0;
      }
      return prev - 1;
    });
  }, []);

  const handleMediaLoad = useCallback(() => {
    setIsMediaLoaded(true);
  }, []);

  const currentFleet = fleets[currentIndex];
  const contentData = currentFleet ? toFleetContentData(currentFleet) : null;
  const isMyFleet = !!currentFleet && currentFleet.user.id === account?.user?.id;

  const handleReport = useCallback(() => {
    if (!currentFleet) return;
    const fleetId = currentFleet.id;
    Alert.alert("Fleet を報告しますか？", undefined, [
      { text: "キャンセル", style: "cancel" },
      {
        text: "報告する",
        style: "destructive",
        onPress: () => {
          onClose();
          router.push(`/report/${fleetId}?type=fleet`);
        },
      },
    ]);
  }, [currentFleet, onClose, router]);

  const iconUrl = currentFleet?.user.profile?.iconUrl
    ? getCdnUrl({ src: currentFleet.user.profile.iconUrl, variant: "icon", width: 64 })
    : getIdenticonUrl(currentFleet?.user.id);

  const isPaused = !!(currentFleet?.media && !isMediaLoaded);

  const getProgressBarState = (index: number): ProgressBarState => {
    if (index < currentIndex) return "past";
    if (index === currentIndex) return "current";
    return "future";
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View className="flex-1 bg-black">
        {/* Fleet content — full screen */}
        {isLoading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator colorClassName="accent-white" size="large" />
          </View>
        ) : contentData ? (
          <View className="flex-1">
            <FleetContent key={currentFleet?.id} fleet={contentData} onMediaLoad={currentFleet?.media ? handleMediaLoad : undefined} />
            {/* Media loading overlay */}
            {currentFleet?.media && !isMediaLoaded && (
              <View className="absolute inset-0 justify-center items-center bg-black/30">
                <ActivityIndicator colorClassName="accent-white" size="large" />
              </View>
            )}
          </View>
        ) : null}

        {/* Header overlay: progress bars + user info */}
        {!isLoading && fleets.length > 0 && (
          <View className="absolute left-0 right-0 z-10" style={{ top: insets.top + 8 }} pointerEvents="none">
            <View className="flex-row gap-1 px-3 pb-2">
              {fleets.map((_, i) => (
                <ProgressBar
                  key={i}
                  state={getProgressBarState(i)}
                  paused={i === currentIndex ? isPaused : false}
                  onComplete={autoAdvance}
                />
              ))}
            </View>
            {currentFleet && (
              <View className="flex-row items-center px-3 pb-2">
                <UniImage source={{ uri: iconUrl }} className="w-8 h-8 rounded-full" contentFit="cover" />
                <Text className="text-white ml-2 font-semibold text-sm flex-1" numberOfLines={1}>
                  {currentFleet.user.displayName || currentFleet.user.screenName}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Tap areas: left = prev, right = next */}
        <View className="absolute inset-0 flex-row" pointerEvents="box-none">
          <Pressable className="flex-1" onPress={goPrev} />
          <Pressable className="flex-1" onPress={goNext} />
        </View>

        {/* Report button */}
        {!isLoading && currentFleet && account && !isMyFleet && (
          <Pressable
            onPress={handleReport}
            className="absolute right-14 z-20 w-8 h-8 justify-center items-center"
            style={{ top: insets.top + 48 }}
            hitSlop={8}
          >
            <UniEllipsis size={20} className="text-white" />
          </Pressable>
        )}

        {/* Close button */}
        <Pressable
          onPress={onClose}
          className="absolute right-4 z-20 w-8 h-8 justify-center items-center"
          style={{ top: insets.top + 48 }}
          hitSlop={16}
        >
          <Text className="text-white text-lg font-semibold">✕</Text>
        </Pressable>
      </View>
    </Modal>
  );
};
