import { ContentTypeSelectorSheet, type ContentTypeSelectorSheetRef } from "@/components/content-type-selector-sheet";
import { Tab, Tabs } from "@/components/tabs";
import { TimelineHandle } from "@/components/timeline/base";
import { FirehoseTimeline } from "@/components/timeline/firehose";
import { FollowingTimeline } from "@/components/timeline/following";
import { FloatingActionButton } from "@/components/ui/floating-action-button";
import { credentialAtom } from "@/models/atoms/credential";
import { useScrollToTop } from "expo-router/react-navigation";
import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { View } from "react-native";

const TABS: Tab[] = [
  { key: "following", label: "フォロー中" },
  { key: "firehose", label: "グローバル" },
];

export default function HomeScreen() {
  const credential = useAtomValue(credentialAtom);
  const router = useRouter();
  const [activeTab, setActiveTab] = React.useState<string>(
    () => (credential.accessToken ? "following" : "firehose"),
  );
  const selectorSheetRef = useRef<ContentTypeSelectorSheetRef>(null);
  const followingTabRef = useRef<TimelineHandle>(null);
  const firehoseTabRef = useRef<TimelineHandle>(null);
  const scrollable = useRef<{ scrollToTop: () => void }>(null);

  const handleFabPress = useCallback(() => {
    selectorSheetRef.current?.open();
  }, []);

  const handleContentTypeSelect = useCallback(
    (contentType: string) => {
      switch (contentType) {
        case "post":
          router.push("/compose/post");
          break;

        case "album":
          router.push("/compose/album");
          break;

        case "smartAlbum":
          router.push("/compose/smart-album");
          break;

        case "fleet":
          router.push("/compose/fleet");
          break;
      }
    },
    [router],
  );

  const scrollActiveTimelineToTopHandler = useMemo(() => {
    return {
      scrollToTop: () => {
        if (activeTab === "following") {
          followingTabRef.current?.scrollToTop();
        } else if (activeTab === "firehose") {
          firehoseTabRef.current?.scrollToTop();
        }
      }
    }
  }, [activeTab]);

  useEffect(() => {
    scrollable.current = scrollActiveTimelineToTopHandler;
  }, [scrollActiveTimelineToTopHandler]);

  useScrollToTop(scrollable);

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      {credential.accessToken ? (
        <Tabs
          tabs={TABS}
          onTabChange={(w) => setActiveTab(w.key)}
          renderScene={(tab) => {
            if (tab.key === "firehose") return <FirehoseTimeline ref={firehoseTabRef} />;
            return <FollowingTimeline ref={followingTabRef} />;
          }}
        />
      ) : (
        <FirehoseTimeline ref={firehoseTabRef} />
      )}
      {!!credential.accessToken && <FloatingActionButton onPress={handleFabPress} />}
      <ContentTypeSelectorSheet ref={selectorSheetRef} onSelect={handleContentTypeSelect} />
    </View>
  );
}
