import { FleetReactionList } from "@/components/fleet/reaction-list";
import { Stack, useLocalSearchParams } from "expo-router";
import { View } from "react-native";

export default function FleetReactionsPage() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View className="flex-1 bg-light-background dark:bg-dark-background">
      <Stack.Screen options={{ title: "リアクション" }} />
      <FleetReactionList fleetId={id} />
    </View>
  );
}
