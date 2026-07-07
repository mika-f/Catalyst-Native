import { AlbumList } from "@/components/explorer/albums/list";
import { AlbumsPlaceholder } from "@/components/explorer/albums/placeholder";
import { ContestList } from "@/components/explorer/contests/list";
import { StatusesEmptyResult } from "@/components/explorer/statuses/empty-result";
import { StatusesPlaceholder } from "@/components/explorer/statuses/placeholder";
import { UserList } from "@/components/explorer/users/list";
import { UsersPlaceholder } from "@/components/explorer/users/placeholder";
import { Tab, Tabs } from "@/components/tabs";
import { TimelineBase, TimelineHandle } from "@/components/timeline/base";
import { clientAtom } from "@/models/atoms/credential";
import { useScrollToTop } from "expo-router/react-navigation";
import { useAtomValue } from "jotai";
import { Search, X } from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TextInput, View } from "react-native";
import { withUniwind } from "uniwind";
import { v4 } from "uuid";

const UniSearchIcon = withUniwind(Search);
const UniTimesIcon = withUniwind(X);

const TABS: Tab[] = [
  { key: "statuses", label: "投稿" },
  { key: "albums", label: "アルバム" },
  { key: "users", label: "ユーザー" },
  { key: "contests", label: "コンテスト" },
];

const CURRENT_CONTEST_STATES = ["opening", "voting", "closing", "electing"];

export default function HomeScreen() {
  const [state, setState] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>(TABS[0].key);
  const [focused, setFocused] = useState(false);
  const client = useAtomValue(clientAtom);
  const [stateKey, setStateKey] = useState(v4());
  const timelineRef = useRef<TimelineHandle>(null);
  const albumsRef = useRef<TimelineHandle>(null);
  const usersRef = useRef<TimelineHandle>(null);
  const contestsRef = useRef<TimelineHandle>(null);

  const timeline = useCallback(
    async (since: string | null, until: string | null) => {
      if (!client) return [];

      const { data } = await client.catalyst.v1.timeline.search.get({
        query: {
          q: query,
          since: since ?? undefined,
          until: until ?? undefined,
        },
        throwOnError: true,
      });
      return data.statuses;
    },
    [client, query],
  );

  const runQuery = useCallback(() => {
    setQuery(state);
    setStateKey(v4());
  }, [state]);

  const scroller = useRef<{ scrollToTop: () => void }>(null);
  const scrollActiveTimelineToTopHandler = useMemo(() => {
    return {
      scrollToTop: () => {
        if (activeTab === "statuses") {
          timelineRef.current?.scrollToTop();
        } else if (activeTab === "albums") {
          albumsRef.current?.scrollToTop();
        } else if (activeTab === "users") {
          usersRef.current?.scrollToTop();
        } else if (activeTab === "contests") {
          contestsRef.current?.scrollToTop();
        }
      },
    };
  }, [activeTab]);

  useEffect(() => {
    scroller.current = scrollActiveTimelineToTopHandler;
  }, [scrollActiveTimelineToTopHandler]);

  useScrollToTop(scroller);

  return (
    <View className="flex-col flex-1 bg-light-background dark:bg-dark-background">
      <View className="px-4">
        <View className="flex flex-row items-center px-2 mt-1 gap-x-2 rounded-lg bg-neutral-200 dark:bg-neutral-800">
          <UniSearchIcon size={24} className="text-light-icon dark:text-dark-icon" />
          <TextInput
            className="w-full h-8 shrink-0 android:h-10 text-black dark:text-white placeholder-light-icon dark:placeholder-dark-icon"
            value={state}
            onChangeText={setState}
            onFocus={() => setFocused(true)}
            onSubmitEditing={runQuery}
            placeholder="検索..."
          />
          {focused && (
            <UniTimesIcon
              size={24}
              className="text-light-icon dark:text-dark-icon"
              onPress={() => {
                setState("");
                setFocused(false);
              }}
            />
          )}
        </View>
      </View>
      <View className="flex-1">
        <Tabs
          tabs={TABS}
          onTabChange={(w) => setActiveTab(w.key)}
          renderScene={(w) => {
            switch (w.key) {
              case "statuses": {
                if (query) {
                  return (
                    <TimelineBase
                      ref={timelineRef}
                      key={stateKey}
                      fetcher={timeline}
                      ListEmptyComponent={StatusesEmptyResult}
                      ListEmptyComponentStyle={{ minHeight: "100%" }}
                    />
                  );
                }

                return <StatusesPlaceholder />;
              }

              case "albums": {
                if (query) {
                  return <AlbumList ref={albumsRef} query={query} />;
                }

                return <AlbumsPlaceholder />;
              }

              case "users": {
                if (query) {
                  return <UserList ref={usersRef} query={query} />;
                }

                return <UsersPlaceholder />;
              }

              case "contests": {
                return (
                  <ContestList
                    ref={contestsRef}
                    key={stateKey}
                    states={CURRENT_CONTEST_STATES}
                    query={query || undefined}
                  />
                );
              }
            }
          }}
        />
      </View>
    </View>
  );
}
