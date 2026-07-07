import { CatalystDivider, CatalystListItem, CatalystListItemContent, CatalystText } from "@/components/design-system";
import { openUrlWithBrowser } from "@/models/browser-settings";
import { router } from "expo-router";
import { ChevronRight, ExternalLink } from "lucide-react-native";
import { View } from "react-native";
import { withUniwind } from "uniwind";

type LinkItem = {
  title: string;
  url: string;
};

type NavigationItem = {
  title: string;
  route: string;
};

const linkItems: LinkItem[] = [
  { title: "広告ポリシー", url: "https://docs.natsuneko.com/ja-jp/catalyst/ads/" },
  { title: "Cookie ポリシー", url: "https://docs.natsuneko.com/ja-jp/catalyst/cookies/" },
  { title: "プライバシーポリシー", url: "https://docs.natsuneko.com/ja-jp/catalyst/privacy/" },
  { title: "利用規約", url: "https://docs.natsuneko.com/ja-jp/catalyst/terms/" },
];

const navigationItems: NavigationItem[] = [{ title: "オープンソースソフトウェア", route: "/settings/legal/licenses" }];

const UniExternalLink = withUniwind(ExternalLink);
const UniChevronRight = withUniwind(ChevronRight);

export default function LegalSettingsPage() {
  const allItems = [
    ...linkItems.map((item) => ({ ...item, type: "link" as const })),
    ...navigationItems.map((item) => ({ ...item, type: "navigation" as const })),
  ];

  return (
    <View className="flex-1 bg-light-surface-muted dark:bg-dark-background">
      <View className="bg-light-background dark:bg-dark-surface">
        {allItems.map((item, index) => (
          <View key={item.title}>
            <CatalystListItem
              divided={false}
              className="min-h-14 px-5 py-3.5"
              onPress={async () => {
                if (item.type === "link") {
                  await openUrlWithBrowser(item.url);
                } else {
                  router.push(item.route as never);
                }
              }}
            >
              <CatalystListItemContent className="gap-0">
                <CatalystText variant="subtitle" className="text-[15px] font-semibold">
                  {item.title}
                </CatalystText>
              </CatalystListItemContent>
              {item.type === "link" ? (
                <UniExternalLink className="text-light-text-subtle dark:text-dark-text-subtle" size={18} />
              ) : (
                <UniChevronRight className="text-light-text-subtle dark:text-dark-text-subtle" size={19} />
              )}
            </CatalystListItem>
            {index < allItems.length - 1 && <CatalystDivider className="ml-5 w-auto" />}
          </View>
        ))}
      </View>
    </View>
  );
}
