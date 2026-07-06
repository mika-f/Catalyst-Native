import { AlbumCard } from "@/components/album/card";
import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { clientAtom } from "@/models/atoms/credential";
import { CatalystAlbumOrSmartAlbum, EgeriaUser } from "@natsuneko-laboratory/catalyst-sdk";
import { FlashList, ListRenderItem } from "@shopify/flash-list";
import { useAtomValue } from "jotai";
import { Images } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { withUniwind } from "uniwind";

import "@/global.css";

const UniImages = withUniwind(Images);

const AlbumsEmpty = () => (
  <View className="flex items-center justify-center h-full">
    <View className="flex items-center justify-center">
      <UniImages size={64} className="text-light-gray dark:text-dark-gray" />
      <Text className="font-semibold text-light-gray dark:text-dark-gray mt-2 text-center">
        アルバムはまだありません
      </Text>
    </View>
  </View>
);

type Props = {
  user: EgeriaUser;
};

export const UserAlbums = ({ user }: Props) => {
  const client = useAtomValue(clientAtom);
  const [albums, setAlbums] = useState<CatalystAlbumOrSmartAlbum[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchAlbums = useCallback(async () => {
    if (!client) return;

    setIsLoading(true);
    try {
      const res = await client.catalyst.listAlbums(user.screenName, true);
      setAlbums(res);
    } finally {
      setIsLoading(false);
    }
  }, [client, user]);

  useAsyncOneTimeEffect(fetchAlbums);

  const onRender = useCallback<ListRenderItem<CatalystAlbumOrSmartAlbum>>(({ item }) => {
    return <AlbumCard album={item} />;
  }, []);

  if (isLoading && albums.length === 0) {
    return (
      <View className="py-4">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <FlashList
      data={albums}
      keyExtractor={(w) => w.id}
      renderItem={onRender}
      ListEmptyComponent={AlbumsEmpty}
      ListEmptyComponentStyle={{ minHeight: "100%" }}
    />
  );
};
