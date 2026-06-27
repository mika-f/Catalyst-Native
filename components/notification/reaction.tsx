import { getCdnUrl } from "@/lib/media";
import type {
  CatalystStatus,
  Notification,
  NotificationGroup,
} from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { memo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);

function getReactionImageUrl(entity: NotificationGroup): string {
  if (entity.additionalContexts?.type === "custom-reaction") {
    return entity.additionalContexts.url;
  }
  return `https://static.natsuneko.com/images/reactions/${entity.body}.png`;
}

type Props = {
  notification: Notification;
};

export const ReactionNotification = memo(({ notification }: Props) => {
  const router = useRouter();
  const { isGrouped, entities } = notification;
  const occurredBy = entities[0]?.occurredBy;
  const belongsTo = notification.belongsTo as unknown as CatalystStatus | null;

  const navigateToUser = (screenName: string) => {
    router.push(`/user/${screenName}`);
  };

  const navigateToStatus = () => {
    if (belongsTo?.id) {
      router.push(`/status/${belongsTo.id}`);
    }
  };

  return (
    <View className="flex-row items-start px-4 py-3 gap-4">
      {isGrouped ? (
        <View className="w-12 h-12 rounded-full bg-light-surface dark:bg-dark-surface items-center justify-center">
          <Text className="text-2xl text-light-text dark:text-dark-text">+</Text>
        </View>
      ) : occurredBy?.profile?.iconUrl ? (
        <Pressable onPress={() => navigateToUser(occurredBy.screenName)}>
          <UniImage
            source={{
              uri: getCdnUrl({
                src: occurredBy.profile.iconUrl,
                variant: "icon",
                width: 96,
              }),
            }}
            className="w-12 h-12 rounded-full"
            contentFit="cover"
          />
        </Pressable>
      ) : (
        <View className="w-12 h-12 rounded-full bg-[#888] opacity-25" />
      )}

      <View className="flex-1 gap-1">
        {belongsTo && "body" in belongsTo && (belongsTo as CatalystStatus).body ? (
          <Pressable onPress={navigateToStatus}>
            <Text className="text-sm text-light-icon dark:text-dark-icon" numberOfLines={1}>
              {(belongsTo as CatalystStatus).body}
            </Text>
          </Pressable>
        ) : (
          <Pressable onPress={navigateToStatus}>
            <Text className="text-sm text-light-icon dark:text-dark-icon italic">no description provided</Text>
          </Pressable>
        )}

        <Text className="text-sm text-light-text dark:text-dark-text">
          {entities.length > 1 ? `${entities.length}回リアクションされました` : "リアクションされました"}
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2 h-8">
            {entities.map((entity) => {
              const user = entity.occurredBy;
              return (
                <Pressable key={entity.id} onPress={() => navigateToUser(user.screenName)}>
                  <View className="relative">
                    {user.profile?.iconUrl ? (
                      <UniImage
                        source={{
                          uri: getCdnUrl({
                            src: user.profile.iconUrl,
                            variant: "icon",
                            width: 64,
                          }),
                        }}
                        className="w-8 h-8 rounded-full"
                        contentFit="cover"
                      />
                    ) : (
                      <View className="w-8 h-8 rounded-full bg-[#888] opacity-25" />
                    )}
                    <UniImage
                      source={{ uri: getReactionImageUrl(entity) }}
                      className="w-4 h-4 absolute -bottom-0.5 -right-0.5"
                      contentFit="contain"
                    />
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
});

ReactionNotification.displayName = "ReactionNotification";
