import { useRoute } from "@natsuneko-laboratory/react-native-desktop-navigation/native";
import { accountAtom } from "@/atoms/account";
import { SearchField, useHover } from "@/components/ui";
import type { SettingsCategory } from "@/navigation";
import { cn } from "cn";
import { useAtomValue } from "jotai";
import { Accessibility, Bell, FileText, Globe2, Lock, Palette, Smile, UserCircle } from "lucide-react-native";
import { useEffect, useState, type ComponentType } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { AccessibilityPage } from "./accessibility";
import { AccountPage } from "./account";
import { ActivityPubPage } from "./activitypub";
import { DisplayPage } from "./display";
import { LegalPage } from "./legal";
import { NotificationsPage } from "./notifications";
import { PrivacyPage } from "./privacy";
import { ReactionsPage } from "./reactions";

const UniAccessibility = withUniwind(Accessibility);
const UniBell = withUniwind(Bell);
const UniFileText = withUniwind(FileText);
const UniGlobe2 = withUniwind(Globe2);
const UniLock = withUniwind(Lock);
const UniPalette = withUniwind(Palette);
const UniSmile = withUniwind(Smile);
const UniUserCircle = withUniwind(UserCircle);

type Category = {
  key: SettingsCategory;
  label: string;
  keywords: string[];
  icon: ComponentType<{ size?: number; className?: string }>;
};

const CATEGORIES: Category[] = [
  { key: "account", label: "アカウント", keywords: ["ユーザー名", "ログイン", "ログアウト", "削除"], icon: UniUserCircle },
  { key: "display", label: "表示", keywords: ["外観", "テーマ", "ライト", "ダーク", "センシティブ"], icon: UniPalette },
  { key: "notifications", label: "通知", keywords: ["お題"], icon: UniBell },
  { key: "privacy", label: "プライバシー", keywords: ["フォロー", "フォロワー", "公開"], icon: UniLock },
  { key: "accessibility", label: "アクセシビリティ", keywords: ["アニメーション", "コントラスト", "下線", "リンク"], icon: UniAccessibility },
  { key: "reactions", label: "カスタムリアクション", keywords: ["絵文字", "サポーター"], icon: UniSmile },
  { key: "activitypub", label: "ActivityPub 連合", keywords: ["mastodon", "misskey", "連合"], icon: UniGlobe2 },
  { key: "legal", label: "法的情報", keywords: ["規約", "プライバシー", "ライセンス", "バージョン"], icon: UniFileText },
];

const PAGES: Record<SettingsCategory, ComponentType<{ onBack?: () => void }>> = {
  account: AccountPage,
  display: DisplayPage,
  notifications: NotificationsPage,
  privacy: PrivacyPage,
  accessibility: AccessibilityPage,
  reactions: ReactionsPage,
  activitypub: ActivityPubPage,
  legal: LegalPage,
};

const CategoryButton = ({
  item,
  selected,
  onPress,
}: {
  item: Category;
  selected: boolean;
  onPress: () => void;
}) => {
  const { hovered, hoverProps } = useHover();
  const Icon = item.icon;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      focusable
      className={cn(
        "relative h-8 flex-row items-center gap-2.5 rounded-md px-2.5",
        selected ? "bg-light-background dark:bg-dark-surface" : hovered && "bg-light-overlay dark:bg-dark-overlay",
      )}
      onPress={onPress}
      {...hoverProps}
    >
      {selected && <View className="absolute left-0 h-4 w-[3px] rounded-full bg-light-accent dark:bg-dark-accent" />}
      <Icon size={16} className="text-light-icon dark:text-dark-icon" />
      <Text numberOfLines={1} className="flex-1 text-[13px] text-light-text dark:text-dark-text">
        {item.label}
      </Text>
    </Pressable>
  );
};

const CategoryList = ({
  items,
  value,
  query,
  onQueryChange,
  onChange,
}: {
  items: Category[];
  value: SettingsCategory | null;
  query: string;
  onQueryChange: (value: string) => void;
  onChange: (value: SettingsCategory) => void;
}) => {
  return (
    <ScrollView className="flex-1" contentContainerClassName="gap-0.5 px-3 pb-6 pt-4">
      <SearchField placeholder="設定を検索" value={query} onChangeText={onQueryChange} className="mb-2" />
      {items.length === 0 ? (
        <Text className="px-2 py-3 text-[13px] text-light-text-muted dark:text-dark-text-muted">一致する設定がありません</Text>
      ) : (
        items.map((item) => (
          <CategoryButton key={item.key} item={item} selected={item.key === value} onPress={() => onChange(item.key)} />
        ))
      )}
    </ScrollView>
  );
};

// 幅があれば左にカテゴリ、右に項目。狭いときは一覧から項目へ切り替える
export const SettingsScreen = () => {
  const route = useRoute();
  const requested = (route.params as { category?: SettingsCategory } | undefined)?.category;
  const account = useAtomValue(accountAtom);
  const [category, setCategory] = useState<SettingsCategory | null>(requested ?? null);
  const [query, setQuery] = useState("");
  const [width, setWidth] = useState(0);
  const [activityPub, setActivityPub] = useState(false);
  const twoPane = width >= 720;

  useEffect(() => {
    if (requested) setCategory(requested);
  }, [requested]);

  useEffect(() => {
    if (!account) {
      setActivityPub(false);
      return;
    }
    let ignore = false;
    account.credential.client.catalyst.v1.activitypub.settings
      .get({ throwOnError: true })
      .then(({ data }) => {
        if (ignore) return;
        setActivityPub(data.rolloutEligible || data.state === "active" || data.state === "retired");
      })
      .catch(() => {
        if (!ignore) setActivityPub(false);
      });
    return () => {
      ignore = true;
    };
  }, [account]);

  const available = CATEGORIES.filter((item) => item.key !== "activitypub" || activityPub);
  const needle = query.trim().toLowerCase();
  const visible = needle
    ? available.filter(
        (item) =>
          item.label.toLowerCase().includes(needle) || item.keywords.some((keyword) => keyword.toLowerCase().includes(needle)),
      )
    : available;
  const active = visible.find((item) => item.key === category)?.key ?? visible[0]?.key ?? null;
  const detailKey = twoPane ? active : category;
  const Page = detailKey ? PAGES[detailKey] : null;
  const showDetail = twoPane || category !== null;

  return (
    <View className="flex-1 flex-row bg-light-surface-muted dark:bg-dark-background" onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 &&
        (twoPane ? (
          <>
            <View className="w-[240px] border-r-hairline border-light-divider dark:border-dark-divider">
              <CategoryList items={visible} value={active} query={query} onQueryChange={setQuery} onChange={setCategory} />
            </View>
            <View className="flex-1">
              {Page ? <Page /> : <Text className="px-8 py-8 text-[13px] text-light-text-muted dark:text-dark-text-muted">一致する設定がありません</Text>}
            </View>
          </>
        ) : showDetail && Page ? (
          <Page onBack={() => setCategory(null)} />
        ) : (
          <View className="flex-1">
            <CategoryList items={visible} value={null} query={query} onQueryChange={setQuery} onChange={setCategory} />
          </View>
        ))}
    </View>
  );
};
