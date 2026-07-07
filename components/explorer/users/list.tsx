import { useAsyncEffect } from "@/hooks/use-async-effect";
import { clientAtom } from "@/models/atoms/credential";
import type { EgeriaUser } from "@/models/sdk-types";
import { FlashList, FlashListRef, ListRenderItem } from "@shopify/flash-list";
import { useAtomValue } from "jotai";
import { useCallback, useImperativeHandle, useRef, useState } from "react";
import { UserCard } from "./card";
import { UsersEmptyResult } from "./empty-result";

type TimelineHandle = {
  scrollToTop: () => void;
}

type Props = {
  query: string;
  ref?: React.Ref<TimelineHandle>;
};

export const UserList = ({ query, ref }: Props) => {
  const client = useAtomValue(clientAtom);
  const [users, setUsers] = useState<EgeriaUser[]>([]);
  const list = useRef<FlashListRef<EgeriaUser>>(null);

  const onRender = useCallback<ListRenderItem<EgeriaUser>>(({ item }) => {
    return <UserCard user={item} />;
  }, []);

  useAsyncEffect(async () => {
    if (client) {
      const { data } = await client.egeria.v1.search.get({ query: { q: query }, throwOnError: true });
      setUsers(data.users as EgeriaUser[]);
    }
  }, [query]);

  useImperativeHandle(ref, () => ({
    scrollToTop: () => {
      list.current?.scrollToOffset({ offset: 0, animated: true });
    }
  }), []);

  return (
    <FlashList
      ref={list}
      data={users}
      keyExtractor={(w) => w.id}
      renderItem={onRender}
      ListEmptyComponent={UsersEmptyResult}
      ListEmptyComponentStyle={{ minHeight: "100%" }}
    />
  );
};
