import { CatalystEmptyState } from "@/components/design-system";
import { View } from "react-native";

export default function AccessibilitySettingsPage() {
  return (
    <View className="flex-1 bg-light-surface-muted dark:bg-dark-background">
      <CatalystEmptyState title="準備中です" description="アクセシビリティ設定は今後追加されます。" />
    </View>
  );
}
