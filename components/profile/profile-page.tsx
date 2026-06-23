import { ProfileHeader } from "@/components/profile/header";
import { ProfileOverlay } from "@/components/profile/overlay";
import { TabContent } from "@/components/profile/tab-content";
import { ProfileTabs } from "@/components/profile/tabs";
import { UserTimelineHandle } from "@/components/profile/timeline";
import { useAsyncEffect } from "@/hooks/use-async-effect";
import { accountAtom } from "@/models/atoms/account";
import { clientAtom } from "@/models/atoms/credential";
import type { CatalystRelationships, EgeriaUser, ProfileTag } from "@natsuneko-laboratory/catalyst-sdk";
import { useScrollToTop } from "expo-router/react-navigation";
import { useAtomValue } from "jotai";
import { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  View,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Tab = {
  route: string;
  label: string;
};

const DEFAULT_TABS: Tab[] = [
  { route: "posts", label: "投稿" },
  { route: "gallery", label: "ギャラリー" },
  { route: "album", label: "アルバム" },
];

const LOAD_MORE_THRESHOLD = 200;

type Props = {
  screenName: string;
  showBackButton?: boolean;
};

export function ProfilePage({ screenName, showBackButton = true }: Props) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const account = useAtomValue(accountAtom);
  const client = useAtomValue(clientAtom);
  const accountUser = account?.user.screenName === screenName ? account.user : null;
  const [user, setUser] = useState<EgeriaUser | null>(accountUser);
  const [activeTab, setActiveTab] = useState(0);
  const scrollY = useRef(new Animated.Value(0)).current;
  const [headerHeight, setHeaderHeight] = useState(0);
  const NAV_BAR_HEIGHT = insets.top + 44;
  const isMyself = user?.id === account?.user.id;
  const tabContentRef = useRef<UserTimelineHandle>(null);
  const [relationships, setRelationships] = useState<CatalystRelationships | null>(null);
  const [initialTags, setInitialTags] = useState<ProfileTag[]>([]);
  const tabs: Tab[] = useMemo(
    () =>
      [...DEFAULT_TABS, isMyself && { route: "likes", label: "いいね" }]
        .filter(Boolean)
        .map((w) => w as unknown as Tab),
    [isMyself],
  );
  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-10, 10])
    .runOnJS(true)
    .onEnd((event) => {
      const { translationX, velocityX } = event;
      if (translationX < -50 || velocityX < -300) {
        setActiveTab((prev) => Math.min(prev + 1, tabs.length - 1));
      } else if (translationX > 50 || velocityX > 300) {
        setActiveTab((prev) => Math.max(prev - 1, 0));
      }
    });

  const view = useRef<ScrollView>(null);
  const scroller = useRef<{ scrollToTop: () => void }>(null);
  const scrollActiveTimelineToTopHandler = useMemo(() => {
    return {
      scrollToTop: () => {
        view.current?.scrollTo({ x: 0, y: 0, animated: true });
      },
    };
  }, []);
  scroller.current = scrollActiveTimelineToTopHandler;

  useScrollToTop(scroller);

  const stickyTabBarOpacity =
    headerHeight > 0
      ? scrollY.interpolate({
          inputRange: [headerHeight - 104, headerHeight - 103],
          outputRange: [0, 1],
          extrapolate: "clamp",
        })
      : 0;

  useAsyncEffect(async () => {
    if (!screenName) {
      return;
    }

    if (accountUser) {
      setUser(accountUser);
      const { tags } = await client.catalyst.getProfileTagsByUser(accountUser.id).catch(() => ({ tags: [] }));
      setInitialTags(tags);
      return;
    }

    setUser(null);
    setInitialTags([]);

    try {
      const [userResult, relationships] = await Promise.all([
        client.egeria.userByUsername(screenName),
        client.catalyst.relationships(screenName).catch(() => null),
      ]);

      if (userResult) {
        setUser(userResult.user);
        const { tags } = await client.catalyst.getProfileTagsByUser(userResult.user.id).catch(() => ({ tags: [] }));
        setInitialTags(tags);
      }

      if (relationships) {
        setRelationships(relationships);
      }
    } catch (e) {
      console.error(`failed to fetch user: @${screenName}, ${e}`);
    }
  }, [accountUser, client, screenName]);

  const handleScroll = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
        useNativeDriver: false,
        listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
          const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
          const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
          if (distanceFromBottom < LOAD_MORE_THRESHOLD) {
            tabContentRef.current?.loadMore();
          }
        },
      }),
    [scrollY],
  );

  if (!user) {
    return (
      <View className="flex-1 bg-light-background dark:bg-dark-background items-center justify-center">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <Animated.ScrollView ref={view} onScroll={handleScroll} scrollEventThrottle={16}>
        <ProfileHeader
          user={user}
          relationships={relationships}
          tags={initialTags}
          onUpdateRelationships={setRelationships}
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
        />

        <View
          className="flex-row border-b border-neutral-500 bg-light-background dark:bg-dark-background"
          style={{ width: screenWidth }}
        >
          <ProfileTabs activeIndex={activeTab} tabs={tabs} onClickTab={setActiveTab} />
        </View>

        <GestureDetector gesture={swipeGesture}>
          <View style={{ minHeight: 400 }}>
            <TabContent ref={tabContentRef} tab={tabs[activeTab]} user={user} />
          </View>
        </GestureDetector>
      </Animated.ScrollView>

      <ProfileOverlay
        user={user}
        relationships={relationships}
        scrollY={scrollY}
        showBackButton={showBackButton}
        onUpdateRelationships={setRelationships}
      />

      {/* Sticky Tab Bar Overlay */}
      <Animated.View
        className="flex-row border-b border-neutral-500 bg-light-background dark:bg-dark-background"
        style={{
          position: "absolute",
          top: NAV_BAR_HEIGHT,
          left: 0,
          width: screenWidth,
          opacity: stickyTabBarOpacity,
        }}
        pointerEvents={headerHeight > 0 ? "auto" : "none"}
      >
        <ProfileTabs activeIndex={activeTab} tabs={tabs} onClickTab={setActiveTab} />
      </Animated.View>
    </View>
  );
}
