import { getCdnUrl } from "@/lib/media";
import type { Notification } from "@/models/sdk-types";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { memo } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { withUniwind } from "uniwind";

const UniImage = withUniwind(Image);

type Props = {
  notification: Notification;
};

export const FollowNotification = memo(({ notification }: Props) => {
  const router = useRouter();
  const { entities } = notification;
  const occurredBy = entities[0]?.occurredBy;
  const isGrouped = entities.length > 1 && !entities.every((e) => e.occurredBy.id === entities[0].occurredBy.id);
  const displayEntities = isGrouped ? entities : [entities[0]];

  const navigateToUser = (screenName: string) => {
    router.push(`/user/${screenName}`);
  };

  return (
    <View className="flex-row items-start px-4 py-3 gap-4">
      {isGrouped ? (
        <View className="w-12 h-12 rounded-full bg-light-surface dark:bg-dark-surface items-center justify-center">
          <Text className="text-2xl">👤</Text>
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

      <View className="flex-1 gap-2">
        <Text className="text-sm text-light-text dark:text-dark-text">
          {isGrouped
            ? `${entities.length}人にフォローされました`
            : `${occurredBy?.displayName ?? ""}さんにフォローされました`}
        </Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-2 h-12">
            {displayEntities.map((entity) => {
              const user = entity.occurredBy;
              return (
                <Pressable
                  key={entity.id}
                  onPress={() => navigateToUser(user.screenName)}
                >
                  {user.profile?.iconUrl ? (
                    <UniImage
                      source={{
                        uri: getCdnUrl({
                          src: user.profile.iconUrl,
                          variant: "icon",
                          width: 96,
                        }),
                      }}
                      className="w-12 h-12 rounded-full"
                      contentFit="cover"
                    />
                  ) : (
                    <View className="w-12 h-12 rounded-full bg-[#888] opacity-25" />
                  )}
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
});

FollowNotification.displayName = "FollowNotification";
