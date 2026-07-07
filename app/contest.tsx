import { CatalystSearchField } from "@/components/design-system";
import { ContestList } from "@/components/explorer/contests/list";
import { Tab, Tabs } from "@/components/tabs";
import { TimelineHandle } from "@/components/timeline/base";
import { useScrollToTop } from "expo-router/react-navigation";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import { v4 } from "uuid";

const TABS: Tab[] = [
  { key: "current", label: "開催中" },
  { key: "upcoming", label: "開催予定" },
  { key: "archive", label: "アーカイブ" },
];

const CURRENT_STATES = ["opening", "voting", "closing", "electing"];
const UPCOMING_STATES = ["published"];
const ARCHIVE_STATES = ["closed"];

export default function ContestScreen() {
  const [inputState, setInputState] = useState("");
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState(TABS[0].key);
  const [stateKey, setStateKey] = useState(v4());

  const currentRef = useRef<TimelineHandle>(null);
  const upcomingRef = useRef<TimelineHandle>(null);
  const archiveRef = useRef<TimelineHandle>(null);

  const runQuery = useCallback(() => {
    setQuery(inputState);
    setStateKey(v4());
  }, [inputState]);

  const scroller = useRef<{ scrollToTop: () => void }>(null);
  const scrollHandler = useMemo(
    () => ({
      scrollToTop: () => {
        if (activeTab === "current") currentRef.current?.scrollToTop();
        else if (activeTab === "upcoming") upcomingRef.current?.scrollToTop();
        else if (activeTab === "archive") archiveRef.current?.scrollToTop();
      },
    }),
    [activeTab],
  );

  useEffect(() => {
    scroller.current = scrollHandler;
  }, [scrollHandler]);

  useScrollToTop(scroller);

  return (
    <View className="flex-col flex-1 bg-light-background dark:bg-dark-background">
      <View className="px-4 pt-1">
        <CatalystSearchField
          value={inputState}
          onChangeText={setInputState}
          onClear={() => setInputState("")}
          onSubmitEditing={runQuery}
          placeholder="コンテストを検索..."
          returnKeyType="search"
        />
      </View>
      <View className="flex-1">
        <Tabs
          tabs={TABS}
          onTabChange={(w) => setActiveTab(w.key)}
          renderScene={(w) => {
            switch (w.key) {
              case "current":
                return (
                  <ContestList
                    ref={currentRef}
                    key={stateKey}
                    states={CURRENT_STATES}
                    query={query || undefined}
                  />
                );
              case "upcoming":
                return (
                  <ContestList
                    ref={upcomingRef}
                    key={stateKey}
                    states={UPCOMING_STATES}
                    query={query || undefined}
                  />
                );
              case "archive":
                return (
                  <ContestList
                    ref={archiveRef}
                    key={stateKey}
                    states={ARCHIVE_STATES}
                    query={query || undefined}
                  />
                );
            }
          }}
        />
      </View>
    </View>
  );
}
