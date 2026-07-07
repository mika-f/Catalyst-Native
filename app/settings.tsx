import { CatalystDivider, CatalystListItem, CatalystListItemContent, CatalystText } from "@/components/design-system";
import { router } from "expo-router";
import { Accessibility, Bell, Bug, ChevronRight, FileText, Lock, Palette, Smile, UserCircle } from "lucide-react-native";
import { View } from "react-native";
import { withUniwind } from "uniwind";


type SettingsSection = {
  route: string;
  title: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
};

const UniAccessibility = withUniwind(Accessibility);
const UniBell = withUniwind(Bell);
const UniBug = withUniwind(Bug);
const UniChevronRight = withUniwind(ChevronRight);
const UniFileText = withUniwind(FileText);
const UniLock = withUniwind(Lock);
const UniPalette = withUniwind(Palette);
const UniSmile = withUniwind(Smile);
const UniUserCircle = withUniwind(UserCircle);

const sections: SettingsSection[] = [
  { route: "/settings/account", title: "アカウント", icon: UniUserCircle },
  { route: "/settings/notifications", title: "通知", icon: UniBell },
  { route: "/settings/privacy", title: "プライバシー", icon: UniLock },
  { route: "/settings/display", title: "表示", icon: UniPalette },
  { route: "/settings/accessibility", title: "アクセシビリティ", icon: UniAccessibility },
  { route: "/settings/custom-reactions", title: "カスタムリアクション", icon: UniSmile },
  ...(__DEV__ ? [{ route: "/settings/debug", title: "デバッグ", icon: UniBug }] : []),
  { route: "/settings/legal", title: "法的情報", icon: UniFileText },
];

export default function SettingsPage() {
  return (
    <View className="flex-1 bg-light-surface-muted dark:bg-dark-background">
      <View className="bg-light-background dark:bg-dark-surface">
        {sections.map((section, index) => {
          const Icon = section.icon;

          return (
            <View key={section.route}>
              <CatalystListItem
                divided={false}
                className="min-h-14 px-5 py-3.5"
                onPress={() => {
                  router.push(section.route as never);
                }}
              >
                <Icon className="text-light-icon dark:text-dark-icon" size={22} />
                <CatalystListItemContent className="gap-0">
                  <CatalystText variant="subtitle" className="text-[15px] font-semibold">
                    {section.title}
                  </CatalystText>
                </CatalystListItemContent>
                <UniChevronRight className="text-light-text-subtle dark:text-dark-text-subtle" size={19} />
              </CatalystListItem>
              {index < sections.length - 1 && <CatalystDivider className="ml-14 w-auto" />}
            </View>
          );
        })}
      </View>
    </View>
  );
}
