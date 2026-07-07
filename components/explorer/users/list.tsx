import { useAsyncEffect } from "@/hooks/use-async-effect";
import { clientAtom } from "@/models/atoms/credential";
import { EgeriaUser } from "@natsuneko-laboratory/catalyst-sdk";
import { FlashList, FlashListRef, ListRenderItem } from "@shopify/flash-list";
import { useAtomValue } from "jotai";
import { useCallback, useImperativeHandle, useRef, useState } from "react";
import { UserCard } from "./card";
import { UsersEmptyResult } from "./empty-result";

type TimelineHandle = {
  scrollToTop: () => void;
};

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
      const res = await client.egeria.search(query);
      setUsers(res.users);
    }
  }, [client, query]);

  useImperativeHandle(
    ref,
    () => ({
      scrollToTop: () => {
        list.current?.scrollToOffset({ offset: 0, animated: true });
      },
    }),
    [],
  );

  return (
    <FlashList
      ref={list}
      data={users}
      keyExtractor={(w) => w.id}
      renderItem={onRender}
      ListEmptyComponent={UsersEmptyResult}
      ListEmptyComponentStyle={{ minHeight: "80%" }}
    />
  );
};
