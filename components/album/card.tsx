import { getCdnUrl } from "@/lib/media";
import type { CatalystAlbumOrSmartAlbum, Media } from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Globe, Images, Lock } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";

const UniGlobe = withUniwind(Globe);
const UniImage = withUniwind(Image);
const UniImages = withUniwind(Images);
const UniLock = withUniwind(Lock);

type Props = {
  album: CatalystAlbumOrSmartAlbum;
};

export const AlbumCard = ({ album }: Props) => {
  const router = useRouter();
  const pictures = album.statuses.flatMap((w) => w.medias).slice(0, 3);

  const route = album.type !== "album" ? `/smart-album/${album.id}` : `/album/${album.id}`;

  return (
    <Pressable onPress={() => router.push(route as never)} className="p-2 m-2 bg-light-surface dark:bg-dark-surface rounded-xl">
      {/* サムネイル画像 */}
      <View className="h-50 rounded-lg overflow-hidden bg-neutral-200 dark:bg-neutral-800">
        {pictures.length === 0 && <EmptyThumbnail />}
        {pictures.length === 1 && <SingleThumbnail media={pictures[0]} />}
        {pictures.length === 2 && <DoubleThumbnail medias={pictures as [Media, Media]} />}
        {pictures.length === 3 && <TripleThumbnail medias={pictures as [Media, Media, Media]} />}
      </View>

      {/* アルバム情報 */}
      <View className="px-1 pt-2 gap-1">
        <Text className="text-base font-bold text-neutral-900 dark:text-neutral-100" numberOfLines={1}>
          {album.name}
        </Text>

        {album.description.length > 0 && (
          <Text className="text-sm text-neutral-500 dark:text-neutral-400" numberOfLines={2}>
            {album.description}
          </Text>
        )}

        <View className="flex-row items-center gap-1">
          {album.user && (
            <>
              <Text className="text-xs text-neutral-500 dark:text-neutral-400">{album.user.displayName}</Text>
              <Text className="text-xs text-neutral-500 dark:text-neutral-400">•</Text>
            </>
          )}

          <Text className="text-xs text-neutral-500 dark:text-neutral-400">
            {album.type !== "album" ? "スマートアルバム" : "アルバム"}
          </Text>

          <View className="flex-1" />

          {album.isPublic ? (
            <UniGlobe size={12} className="text-neutral-500 dark:text-neutral-400" />
          ) : (
            <UniLock size={12} className="text-neutral-500 dark:text-neutral-400" />
          )}
        </View>
      </View>
    </Pressable>
  );
};

const EmptyThumbnail = () => (
  <View className="flex-1 items-center justify-center">
    <UniImages size={48} className="text-neutral-400" />
  </View>
);

const ThumbnailImage = ({ media, className }: { media: Media; className?: string }) => (
  <UniImage
    source={{
      uri: getCdnUrl({ src: media.url, variant: "small", width: 1024 }),
    }}
    contentFit="cover"
    className={className}
  />
);

const SingleThumbnail = ({ media }: { media: Media }) => <ThumbnailImage media={media} className="flex-1" />;

const DoubleThumbnail = ({ medias }: { medias: [Media, Media] }) => (
  <View className="flex-1 flex-row gap-1">
    <ThumbnailImage media={medias[0]} className="flex-1" />
    <ThumbnailImage media={medias[1]} className="flex-1" />
  </View>
);

const TripleThumbnail = ({ medias }: { medias: [Media, Media, Media] }) => (
  <View className="flex-1 flex-row gap-1">
    <ThumbnailImage media={medias[0]} className="flex-[0.6]" />
    <View className="flex-[0.4] gap-1">
      <ThumbnailImage media={medias[1]} className="flex-1" />
      <ThumbnailImage media={medias[2]} className="flex-1" />
    </View>
  </View>
);
