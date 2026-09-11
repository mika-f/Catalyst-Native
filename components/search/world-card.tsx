import { CatalystSurface, CatalystText } from "@/components/design-system";
import { openUrlWithBrowser } from "@/models/browser-settings";
import { ExternalLink } from "lucide-react-native";
import { Pressable, View } from "react-native";
import { withUniwind } from "uniwind";

const UniExternalLink = withUniwind(ExternalLink);

type Props = {
  name: string;
  platformIdentifier: string;
};

/**
 * `platform:VRChat world:"..."` の検索結果の先頭に出すワールドカード。
 * 投稿タイムラインの上に載る情報なので、ホームのフォトコンテスト案内と見た目をそろえている。
 */
export const SearchWorldCard = ({ name, platformIdentifier }: Props) => (
  <View className="border-b border-light-divider bg-light-background p-3 dark:border-dark-divider dark:bg-dark-background">
    <CatalystSurface variant="muted" className="overflow-hidden rounded-2xl">
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${name} を VRChat 公式サイトで開く`}
        className="flex-row items-center justify-between gap-3 px-3 py-2.5 active:opacity-75"
        onPress={() => openUrlWithBrowser(`https://vrchat.com/home/world/${platformIdentifier}`)}
      >
        <View className="min-w-0 flex-1">
          <CatalystText variant="caption" tone="muted" className="font-semibold uppercase">
            VRChat World
          </CatalystText>
          <CatalystText variant="subtitle" numberOfLines={1}>
            {name}
          </CatalystText>
          <CatalystText variant="mono" tone="muted" numberOfLines={1}>
            {platformIdentifier}
          </CatalystText>
        </View>
        <View className="flex-row items-center gap-1">
          <CatalystText tone="tint" className="font-semibold">
            公式サイト
          </CatalystText>
          <UniExternalLink size={16} className="text-light-tint dark:text-dark-tint" />
        </View>
      </Pressable>
    </CatalystSurface>
  </View>
);
