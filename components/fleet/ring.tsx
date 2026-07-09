import { accountAtom } from "@/models/atoms/account";
import { clientAtom } from "@/models/atoms/credential";
import type { CatalystFleetRing } from "@/models/sdk-types";
import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { FleetRingCreateItem } from "./ring-create-item";
import { FleetRingItem } from "./ring-item";

type Props = {
  onRingPress: (username: string) => void;
  onUsernamesChange?: (usernames: string[]) => void;
  refreshKey?: number;
};

export const FleetRing = ({ onRingPress, onUsernamesChange, refreshKey }: Props) => {
  const client = useAtomValue(clientAtom);
  const account = useAtomValue(accountAtom);
  const router = useRouter();
  const [rings, setRings] = useState<CatalystFleetRing[]>([]);

  useEffect(() => {
    if (!client) return;
    client.catalyst.v1.fleet.ring
      .get({ throwOnError: true })
      .then(({ data }) => {
        setRings(data);
        onUsernamesChange?.(data.map((r) => r.user.screenName));
      })
      .catch(() => {});
  }, [client, refreshKey, onUsernamesChange]);

  if (!account && rings.length === 0) return null;

  return (
    <View className="border-b border-light-divider dark:border-dark-divider">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="py-3 px-2">
        {account ? (
          <FleetRingCreateItem
            user={account.user}
            onPress={() => router.push("/compose/fleet")}
          />
        ) : null}
        {rings.map((ring) => (
          <FleetRingItem key={ring.user.id} ring={ring} onPress={() => onRingPress(ring.user.screenName)} />
        ))}
      </ScrollView>
    </View>
  );
};
