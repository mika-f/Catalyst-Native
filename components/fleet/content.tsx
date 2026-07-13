import { getCdnUrl } from "@/lib/media";
import {
  FleetCanvas,
  type FleetContentData,
  type FleetImageProps,
  type FleetMediaEntity,
  type FleetStickerLike,
} from "@natsuneko-laboratory/fleet-renderer-react-native";
import { Image } from "expo-image";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);

export type {
  FleetContentData,
  FleetMediaEntity,
  FleetPlacement as FleetMediaPlacement,
  FleetStickerEntity,
  FleetTextEntity,
} from "@natsuneko-laboratory/fleet-renderer-react-native";

type Props = {
  fleet: FleetContentData;
  onMediaLoad?: () => void;
};

const CatalystFleetImage = ({ uri, alt, style, contentFit, onLoad }: FleetImageProps) => (
  <UniImage source={{ uri }} accessibilityLabel={alt} style={style} contentFit={contentFit} onLoad={onLoad} />
);

const resolveMediaUri = (media: FleetMediaEntity, containerWidth: number) =>
  getCdnUrl({ src: media.url, width: containerWidth, variant: "medium" });

const resolveStickerImageUrl = (sticker: FleetStickerLike) =>
  sticker.imageUrl ??
  (sticker.emoji ? `https://static.natsuneko.com/images/reactions/${sticker.emoji}.png` : undefined);

export const FleetContent = ({ fleet, onMediaLoad }: Props) => (
  <FleetCanvas
    fleet={fleet}
    ImageComponent={CatalystFleetImage}
    resolveMediaUri={resolveMediaUri}
    resolveStickerImageUrl={resolveStickerImageUrl}
    emptyTextPlaceholder="テキストを入力..."
    onMediaLoad={onMediaLoad}
  />
);
