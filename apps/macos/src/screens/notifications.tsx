import { Bell, Settings2 } from "lucide-react-native";
import { useState } from "react";
import { withUniwind } from "uniwind";
import { Page, PageHeader } from "../components/page";
import { EmptyState, IconButton, SegmentedTabs, type SegmentedTab } from "../components/ui";
import { NavigationRef } from "../navigation";

const UniBell = withUniwind(Bell);
const UniSettings2 = withUniwind(Settings2);

type Filter = "all" | "mentions" | "reactions";

const FILTERS: SegmentedTab<Filter>[] = [
  { key: "all", label: "すべて" },
  { key: "mentions", label: "メンション" },
  { key: "reactions", label: "リアクション" },
];

export const NotificationsScreen = () => {
  const [filter, setFilter] = useState<Filter>("all");

  return (
    <Page
      header={
        <PageHeader
          title="通知"
          actions={
            <IconButton label="通知の設定" onPress={() => NavigationRef.navigate("Settings", { category: "notifications" })}>
              <UniSettings2 size={18} className="text-light-icon dark:text-dark-icon" />
            </IconButton>
          }
        >
          <SegmentedTabs tabs={FILTERS} value={filter} onChange={setFilter} />
        </PageHeader>
      }
    >
      <EmptyState
        icon={<UniBell size={24} className="text-light-toggle-icon dark:text-dark-toggle-icon" />}
        title="通知はまだありません"
        description="フォローやリアクション、メンションがあるとここに表示されます。"
      />
    </Page>
  );
};
