import { AlbumCard } from "@/components/album/card";
import { ProfileAlbumsPlaceholder } from "@/components/profile/placeholder";
import { useAsyncEffect } from "@/hooks/use-async-effect";
import { clientAtom } from "@/models/atoms/credential";
import type { CatalystAlbumOrSmartAlbum } from "@/models/sdk-types";
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
  const [isLoading, setIsLoading] = useState(true);
  const list = useRef<FlashListRef<CatalystAlbumOrSmartAlbum>>(null);

  const onRender = useCallback<ListRenderItem<CatalystAlbumOrSmartAlbum>>(({ item }) => {
    return <AlbumCard album={item} />;
  }, []);

  useAsyncEffect(async () => {
    setIsLoading(true);
    setAlbums([]);
    try {
      if (client) {
        const { data } = await client.catalyst.v1.album.search.get({
          query: { q: query, include_smart_album: true },
          throwOnError: true,
        });
        setAlbums(data.albums);
      }
    } finally {
      setIsLoading(false);
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
      ListEmptyComponent={isLoading ? ProfileAlbumsPlaceholder : AlbumsEmptyResult}
      ListEmptyComponentStyle={{ minHeight: "80%" }}
    />
  );
};
