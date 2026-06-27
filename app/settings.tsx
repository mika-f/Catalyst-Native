import { cn } from "@/lib/utils";
import { router } from "expo-router";
import { Accessibility, Bell, Bug, ChevronRight, FileText, Lock, Palette, Smile, UserCircle } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";


type SettingsSection = {
  route: string;
  title: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
};

const sections: SettingsSection[] = [
  { route: "/settings/account", title: "アカウント", icon: UserCircle },
  { route: "/settings/notifications", title: "通知", icon: Bell },
  { route: "/settings/privacy", title: "プライバシー", icon: Lock },
  { route: "/settings/display", title: "表示", icon: Palette },
  { route: "/settings/accessibility", title: "アクセシビリティ", icon: Accessibility },
  { route: "/settings/custom-reactions", title: "カスタムリアクション", icon: Smile },
  ...(__DEV__ ? [{ route: "/settings/debug", title: "デバッグ", icon: Bug }] : []),
  { route: "/settings/legal", title: "法的情報", icon: FileText },
];

const UniChevronRight = withUniwind(ChevronRight);

export default function SettingsPage() {
  return (
    <View className="flex-1">
      <View className="mt-4 mx-4 rounded-xl bg-light-surface dark:bg-dark-surface overflow-hidden">
        {sections.map((section, index) => {
          const Icon = withUniwind(section.icon);

          return (
            <Pressable
              key={section.route}
              className={cn(
                "px-4 py-3.5 flex-row items-center",
                index < sections.length - 1 && "border-b border-light-border dark:border-dark-border",
              )}
              onPress={() => {
                router.push(section.route as never);
              }}
            >
              <Icon className="text-light-icon dark:text-dark-icon mr-3" size={24} />
              <Text className="flex-1 text-base text-light-text dark:text-dark-text">{section.title}</Text>
              <UniChevronRight className="text-light-icon dark:text-dark-icon" size={20} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
