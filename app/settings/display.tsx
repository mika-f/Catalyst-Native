import {
  CatalystDivider,
  CatalystListItem,
  CatalystListItemContent,
  CatalystSwitch,
  CatalystText,
} from "@/components/design-system";
import {
  type BrowserDefinition,
  type BrowserKey,
  getInstalledBrowsers,
  loadSelectedBrowser,
  saveSelectedBrowser,
} from "@/models/browser-settings";
import { timelineImageQualityAtom, timelineWifiUpgradeAtom } from "@/models/atoms/image-quality";
import { hideSensitiveContentAtom } from "@/models/atoms/sensitive-content";
import {
  type TimelineImageQuality,
  loadTimelineImageQuality,
  loadWifiUpgrade,
  saveTimelineImageQuality,
  saveWifiUpgrade,
} from "@/models/image-quality-settings";
import {
  loadHideSensitiveContent,
  saveHideSensitiveContent,
} from "@/models/sensitive-content-settings";
import { Check } from "lucide-react-native";
import { useAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { withUniwind } from "uniwind";

const CheckIcon = withUniwind(Check);

type QualityOption = {
  key: TimelineImageQuality;
  displayName: string;
  description: string;
};

const QUALITY_OPTIONS: QualityOption[] = [
  {
    key: "low",
    displayName: "低画質",
    description: "通信量を節約します",
  },
  {
    key: "medium",
    displayName: "高画質",
    description: "よりきれいな画像を表示します",
  },
];

export default function DisplaySettingsPage() {
  const [browsers, setBrowsers] = useState<BrowserDefinition[]>([]);
  const [selectedBrowser, setSelectedBrowser] = useState<BrowserKey>("systemDefault");
  const [quality, setQuality] = useAtom(timelineImageQualityAtom);
  const [wifiUpgrade, setWifiUpgrade] = useAtom(timelineWifiUpgradeAtom);
  const [hideSensitiveContent, setHideSensitiveContent] = useAtom(
    hideSensitiveContentAtom,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getInstalledBrowsers(),
      loadSelectedBrowser(),
      loadTimelineImageQuality(),
      loadWifiUpgrade(),
      loadHideSensitiveContent(),
    ]).then(([installed, selected, q, w, h]) => {
      setBrowsers(installed);
      setSelectedBrowser(selected);
      setQuality(q);
      setWifiUpgrade(w);
      setHideSensitiveContent(h);
      setIsLoading(false);
    });
  }, [setHideSensitiveContent, setQuality, setWifiUpgrade]);

  const handleBrowserSelect = useCallback(async (key: BrowserKey) => {
    setSelectedBrowser(key);
    await saveSelectedBrowser(key);
  }, []);

  const handleQualitySelect = useCallback(async (key: TimelineImageQuality) => {
    setQuality(key);
    await saveTimelineImageQuality(key);
  }, [setQuality]);

  const handleWifiUpgradeChange = useCallback(async (enabled: boolean) => {
    setWifiUpgrade(enabled);
    await saveWifiUpgrade(enabled);
  }, [setWifiUpgrade]);

  const handleHideSensitiveContentChange = useCallback(
    async (enabled: boolean) => {
      setHideSensitiveContent(enabled);
      await saveHideSensitiveContent(enabled);
    },
    [setHideSensitiveContent],
  );

  if (isLoading) {
    return <View className="flex-1 bg-light-surface-muted dark:bg-dark-background" />;
  }

  return (
    <View className="flex-1 bg-light-surface-muted dark:bg-dark-background">
      <View className="pt-2">
        <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
          デフォルトブラウザー
        </CatalystText>
        <View className="bg-light-background dark:bg-dark-surface">
          {browsers.map((browser, index) => (
            <View key={browser.key}>
              <CatalystListItem
                divided={false}
                className="min-h-13 px-5 py-3"
                onPress={() => handleBrowserSelect(browser.key)}
              >
                <CatalystListItemContent className="gap-0">
                  <CatalystText variant="subtitle" className="text-[15px] font-semibold">
                    {browser.displayName}
                  </CatalystText>
                </CatalystListItemContent>
                {selectedBrowser === browser.key && (
                  <CheckIcon className="text-light-tint dark:text-dark-tint" size={18} />
                )}
              </CatalystListItem>
              {index < browsers.length - 1 && <CatalystDivider className="ml-5 w-auto" />}
            </View>
          ))}
        </View>
        <CatalystText variant="caption" tone="subtle" className="px-5 pt-2 leading-4">
          リンクを開く際に使用するブラウザーを選択してください。インストールされているブラウザーのみが表示されます。
        </CatalystText>
      </View>

      <View className="mt-6">
        <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
          タイムラインの画像画質
        </CatalystText>
        <View className="bg-light-background dark:bg-dark-surface">
          {QUALITY_OPTIONS.map((option, index) => (
            <View key={option.key}>
              <CatalystListItem
                divided={false}
                className="min-h-16 px-5 py-3"
                onPress={() => handleQualitySelect(option.key)}
              >
                <CatalystListItemContent>
                  <CatalystText variant="subtitle" className="text-[15px] font-semibold">
                    {option.displayName}
                  </CatalystText>
                  <CatalystText variant="caption" tone="muted">
                    {option.description}
                  </CatalystText>
                </CatalystListItemContent>
                {quality === option.key && (
                  <CheckIcon className="text-light-tint dark:text-dark-tint" size={18} />
                )}
              </CatalystListItem>
              {index < QUALITY_OPTIONS.length - 1 && <CatalystDivider className="ml-5 w-auto" />}
            </View>
          ))}
        </View>
        <CatalystText variant="caption" tone="subtle" className="px-5 pt-2 leading-4">
          タイムラインに表示される画像の画質を選択してください。
        </CatalystText>
      </View>

      <View className="mt-6">
        <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
          Wi-Fi接続
        </CatalystText>
        <View className="min-h-16 flex-row items-center bg-light-background px-5 py-3 dark:bg-dark-surface">
          <CatalystListItemContent className="mr-4">
            <CatalystText variant="subtitle" className="text-[15px] font-semibold">
              Wi-Fi接続時にさらに高画質を使用
            </CatalystText>
            <CatalystText variant="caption" tone="muted">
                {quality === "low"
                  ? "Wi-Fi 接続時は高画質、それ以外は低画質を使用します"
                  : "Wi-Fi 接続時はさらに高画質、それ以外は高画質を使用します"}
            </CatalystText>
          </CatalystListItemContent>
          <CatalystSwitch
            value={wifiUpgrade}
            onValueChange={handleWifiUpgradeChange}
          />
        </View>
        <CatalystText variant="caption" tone="subtle" className="px-5 pt-2 leading-4">
          Wi-Fi 接続時は自動的により高い画質で画像を読み込みます。
        </CatalystText>
      </View>

      <View className="mt-6">
        <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
          センシティブ投稿
        </CatalystText>
        <View className="min-h-16 flex-row items-center bg-light-background px-5 py-3 dark:bg-dark-surface">
          <CatalystListItemContent className="mr-4">
            <CatalystText variant="subtitle" className="text-[15px] font-semibold">
              センシティブ投稿を表示しない
            </CatalystText>
            <CatalystText variant="caption" tone="muted">
              ホームタイムラインと Fleet からセンシティブ投稿を除外します
            </CatalystText>
          </CatalystListItemContent>
          <CatalystSwitch
            value={hideSensitiveContent}
            onValueChange={handleHideSensitiveContentChange}
          />
        </View>
      </View>
    </View>
  );
}
