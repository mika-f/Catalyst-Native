import { useHover } from "@/hooks/use-hover";
import { getCdnUrl } from "@/models/cdn";
import { cn } from "cn";
import { useState } from "react";
import { Image, PixelRatio, Pressable, Text, View, type LayoutChangeEvent } from "react-native";

type RailCardProps = {
  title: string;
  children: React.ReactNode;
};

export const RailCard = ({ title, children }: RailCardProps) => {
  return (
    <View className="overflow-hidden rounded-2xl border border-light-divider bg-light-surface dark:border-dark-divider dark:bg-dark-surface">
      <Text
        accessibilityRole="header"
        className="px-4 pb-1 pt-3 text-[15px] font-bold text-light-text dark:text-dark-text"
      >
        {title}
      </Text>
      {children}
      <View className="h-2" />
    </View>
  );
};

// macOS の Image は width: 100% と aspectRatio だけでは固有サイズのまま描画され、カラムからはみ出す。
// 親の実幅を測ってから width / height をピクセルで渡す。
export const RailBanner = ({ uri, fallback }: { uri?: string | null; fallback?: React.ReactNode }) => {
  const [width, setWidth] = useState(0);

  const onLayout = (event: LayoutChangeEvent) => {
    const next = event.nativeEvent.layout.width;
    setWidth((prev) => (Math.abs(prev - next) < 1 ? prev : next));
  };

  // 画像の固有サイズに引っ張られないよう、枠自体を幅の 1/3 に固定する
  const height = width / 3;

  return (
    <View
      className="w-full overflow-hidden rounded-sm bg-light-surface-muted dark:bg-dark-surface-muted"
      onLayout={onLayout}
      style={width > 0 ? { height } : undefined}
    >
      {uri && width > 0 ? (
        <Image
          source={{
            uri: getCdnUrl({
              src: uri,
              variant: "header",
              width: Math.ceil(width * PixelRatio.get()),
              aspect: { w: 3, h: 1 },
            }),
          }}
          width={width}
          height={height}
          resizeMode="cover"
        />
      ) : (
        <View className="h-full w-full items-center justify-center">{fallback}</View>
      )}
    </View>
  );
};

export const RailRow = ({ children, label }: { children: React.ReactNode; label: string }) => {
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      focusable
      className={cn(hovered && "bg-light-overlay dark:bg-dark-overlay")}
      {...hoverProps}
    >
      {children}
    </Pressable>
  );
};
