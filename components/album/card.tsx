import { CatalystBadge, CatalystBadgeText, CatalystMediaFrame, CatalystText } from "@/components/design-system";
import { getCdnUrl } from "@/lib/media";
import type { CatalystAlbumOrSmartAlbum, Media } from "@/models/sdk-types";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Globe, Images, Lock } from "lucide-react-native";
import { Pressable, View } from "react-native";
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
    <Pressable onPress={() => router.push(route as never)} className="mx-3 py-3 active:opacity-80">
      <View className="gap-2">
        <CatalystMediaFrame className="h-50">
          {pictures.length === 0 && <EmptyThumbnail />}
          {pictures.length === 1 && <SingleThumbnail media={pictures[0]} />}
          {pictures.length === 2 && <DoubleThumbnail medias={pictures as [Media, Media]} />}
          {pictures.length === 3 && <TripleThumbnail medias={pictures as [Media, Media, Media]} />}
        </CatalystMediaFrame>

        <View className="gap-1 px-1 pb-1">
          <View className="flex-row items-start gap-2">
            <CatalystText variant="subtitle" className="min-w-0 flex-1" numberOfLines={1}>
              {album.name}
            </CatalystText>
            <CatalystBadge tone={album.type !== "album" ? "accent" : "neutral"} className="h-6">
              <CatalystBadgeText>{album.type !== "album" ? "Smart" : "Album"}</CatalystBadgeText>
            </CatalystBadge>
          </View>

          {album.description.length > 0 && (
            <CatalystText tone="muted" numberOfLines={2}>
              {album.description}
            </CatalystText>
          )}

          <View className="flex-row items-center gap-1">
            {album.user && (
              <>
                <CatalystText variant="caption" tone="muted">
                  {album.user.displayName}
                </CatalystText>
                <CatalystText variant="caption" tone="muted">
                  /
                </CatalystText>
              </>
            )}

            <CatalystText variant="caption" tone="muted">
              {album.isPublic ? "公開" : "非公開"}
            </CatalystText>

            <View className="flex-1" />

            {album.isPublic ? (
              <UniGlobe size={12} className="text-light-icon dark:text-dark-icon" />
            ) : (
              <UniLock size={12} className="text-light-icon dark:text-dark-icon" />
            )}
          </View>
        </View>
      </View>
    </Pressable>
  );
};

const EmptyThumbnail = () => (
  <View className="flex-1 items-center justify-center">
    <UniImages size={48} className="text-light-icon dark:text-dark-icon" />
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
