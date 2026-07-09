import { CatalystDivider, CatalystListItem, CatalystListItemContent, CatalystText } from "@/components/design-system";
import { licenses } from "@/lib/licenses";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import { ChevronRight } from "lucide-react-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { withUniwind } from "uniwind";

const UniChevronRight = withUniwind(ChevronRight);

export type LicenseKey = keyof typeof licenses;

export const LICENSES = Object.keys(licenses)
  .map((w) => {
    const license = licenses[w as unknown as LicenseKey];
    return { id: license.id, name: license.name };
  })
  .sort((a, b) => a.id.localeCompare(b.id));

export default function LegalLicensesPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <FlashList
      data={LICENSES}
      keyExtractor={(w) => w.id}
      className="flex-1 bg-light-surface-muted dark:bg-dark-background"
      style={{ paddingBottom: insets.bottom }}
      renderItem={({ item, index }) => {
        return (
          <View className="bg-light-background dark:bg-dark-surface">
            <CatalystListItem
              divided={false}
              className="min-h-12 px-5 py-2.5"
              onPress={() => router.push(`/settings/legal/license?key=${item.id}`)}
            >
              <CatalystListItemContent className="gap-0">
                <CatalystText variant="subtitle" className="text-[15px] font-semibold" numberOfLines={1}>
                  {item.name}
                </CatalystText>
              </CatalystListItemContent>
              <UniChevronRight className="text-light-text-subtle dark:text-dark-text-subtle" size={19} />
            </CatalystListItem>
            {index < LICENSES.length - 1 && <CatalystDivider className="ml-5 w-auto" />}
          </View>
        );
      }}
    />
  );
}
