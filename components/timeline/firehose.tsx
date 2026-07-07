import { clientAtom } from "@/models/atoms/credential";
import { useAtomValue } from "jotai";
import { Ref, useCallback } from "react";
import { TimelineBase, TimelineHandle } from "./base";

type Props = {
  ref?: Ref<TimelineHandle>;
}

export const FirehoseTimeline = ({ ref }: Props) => {
  const client = useAtomValue(clientAtom);

  const fetcher = useCallback(
    async (since: string | null, until: string | null) => {
      return (
        (
          await client?.catalyst.v11.timeline.firehose.get({
            query: { since: since ?? undefined, until: until ?? undefined },
            throwOnError: true,
          })
        )?.data ?? []
      );
    },
    [client],
  );

  return <TimelineBase ref={ref} fetcher={fetcher} />;
};
