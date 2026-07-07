import { AlbumCard } from "@/components/album/card";
import { useAsyncEffect } from "@/hooks/use-async-effect";
import { clientAtom } from "@/models/atoms/credential";
import { CatalystAlbumOrSmartAlbum } from "@natsuneko-laboratory/catalyst-sdk";
import { FlashList, FlashListRef, ListRenderItem } from "@shopify/flash-list";
import { useAtomValue } from "jotai";
import { useCallback, useImperativeHandle, useRef, useState } from "react";
import { AlbumsEmptyResult } from "./empty-result";

type TimelineHandle = {
  scrollToTop: () => void;
};

type Props = {
  query: string;
  ref?: React.Ref<TimelineHandle>;
};

export const AlbumList = ({ query, ref }: Props) => {
  const client = useAtomValue(clientAtom);
  const [albums, setAlbums] = useState<CatalystAlbumOrSmartAlbum[]>([]);
  const list = useRef<FlashListRef<CatalystAlbumOrSmartAlbum>>(null);

  const onRender = useCallback<ListRenderItem<CatalystAlbumOrSmartAlbum>>(({ item }) => {
    return <AlbumCard album={item} />;
  }, []);

  useAsyncEffect(async () => {
    if (client) {
      const res = await client.catalyst.searchAlbums(query, true);
      setAlbums(res);
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
      data={albums}
      keyExtractor={(w) => w.id}
      renderItem={onRender}
      ListEmptyComponent={AlbumsEmptyResult}
      ListEmptyComponentStyle={{ minHeight: "80%" }}
    />
  );
};
