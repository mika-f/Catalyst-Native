import { CatalystText } from "@/components/design-system";
import { licenses } from "@/lib/licenses";
import { Stack, useLocalSearchParams } from "expo-router";
import { ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LicenseKey } from "./licenses";

export default function LegalLicensesPage() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const insets = useSafeAreaInsets();
  const license = licenses[key as unknown as LicenseKey];

  return (
    <ScrollView
      className="flex-1 bg-light-surface-muted dark:bg-dark-background"
      contentContainerClassName="bg-light-background px-5 py-4 dark:bg-dark-surface"
      style={{ paddingBottom: insets.bottom }}
    >
      <Stack.Screen options={{ title: license.name }} />
      <CatalystText variant="mono" className="leading-5 font-mono">
        {license.content}
      </CatalystText>
    </ScrollView>
  );
}
