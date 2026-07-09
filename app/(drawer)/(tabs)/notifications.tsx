import { SystemNotificationList } from "@/components/notification/system";
import { UserMessageList } from "@/components/notification/user-message";
import { Tab, Tabs } from "@/components/tabs";
import { TimelineHandle } from "@/components/timeline/base";
import { useScrollToTop } from "expo-router/react-navigation";
import React, { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";

const TABS: Tab[] = [
  { key: "system", label: "システム通知" },
  { key: "message", label: "メッセージ" },
];

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = React.useState<string>(TABS[0].key);

  // 厳密には型はあってないけど、 TimelineHandle というインターフェースそのものは同じなので問題ないはず
  const messageTabRef = useRef<TimelineHandle>(null);
  const systemTabRef = useRef<TimelineHandle>(null);

  const scroller = useRef<{ scrollToTop: () => void }>(null);
  const scrollActiveTimelineToTopHandler = useMemo(() => {
    return {
      scrollToTop: () => {
        if (activeTab === "message") {
          messageTabRef.current?.scrollToTop();
        } else if (activeTab === "system") {
          systemTabRef.current?.scrollToTop();
        }
      },
    };
  }, [activeTab]);
  useEffect(() => {
    scroller.current = scrollActiveTimelineToTopHandler;
  }, [scrollActiveTimelineToTopHandler]);

  useScrollToTop(scroller);

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <Tabs
        onTabChange={(w) => setActiveTab(w.key)}
        tabs={TABS}
        renderScene={(tab) => {
          if (tab.key === "message")
            return <UserMessageList ref={messageTabRef} />;
          return <SystemNotificationList ref={systemTabRef} />;
        }}
      />
    </View>
  );
}
