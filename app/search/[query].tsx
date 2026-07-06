import { TimelineBase } from "@/components/timeline/base";
import { clientAtom } from "@/models/atoms/credential";
import { Stack, useLocalSearchParams } from "expo-router";
import { useAtomValue } from "jotai";
import { useCallback } from "react";

export default function SearchPage() {
  const params = useLocalSearchParams<{ query: string }>();
  const client = useAtomValue(clientAtom);
  const hashtag = decodeURIComponent(params.query ?? "");
  const fetcher = useCallback(
    async (since: string | null, until: string | null) => {
      if (!client || !hashtag) {
        return [];
      }

      return await client.catalyst.searchTimeline({
        q: hashtag,
        exact: true,
        since: since ?? undefined,
        until: until ?? undefined,
      });
    },
    [client, hashtag],
  );

  return (
    <>
      <Stack.Screen options={{ title: hashtag }} />
      <TimelineBase fetcher={fetcher} />
    </>
  );
}
