import { useAsyncEffect } from "@/hooks/use-async-effect";
import { getCdnUrl } from "@/lib/media";
import { cn } from "@/lib/utils";
import { accountAtom } from "@/models/atoms/account";
import { clientAtom } from "@/models/atoms/credential";
import { openUrlWithBrowser } from "@/models/browser-settings";
import { CatalystRelationships, EgeriaUser, ProfileTag } from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { LinkIcon } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { LayoutChangeEvent, Pressable, Text, TouchableOpacity, View, useWindowDimensions } from "react-native";
import { withUniwind } from "uniwind";
import { StatusText } from "../status/text";
import { SecondaryText } from "../ui/secondary-text";

type RelationshipCounts = {
  followers: number | null;
  followings: number | null;
};
const UniImage = withUniwind(Image);
const UniLinkIcon = withUniwind(LinkIcon);

type Props = {
  user: EgeriaUser | null;
  relationships: CatalystRelationships | null;
  onUpdateRelationships?: (rel: CatalystRelationships) => void;
  onLayout: (e: LayoutChangeEvent) => void;
};

export const ProfileHeader = ({ user, relationships, onUpdateRelationships, onLayout }: Props) => {
  const { width: screenWidth } = useWindowDimensions();
  const bannerHeight = screenWidth / 3;
  const account = useAtomValue(accountAtom);
  const client = useAtomValue(clientAtom);
  const router = useRouter();
  const isLoggedIn = !!account?.user;
  const isMyself = account?.user.screenName === user?.screenName;
  const [counts, setCounts] = useState<RelationshipCounts | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tags, setTags] = useState<ProfileTag[]>([]);
  const actionText = useMemo(() => {
    if (relationships === null) return "読み込み中";

    if (relationships.isFollowing) return "フォロー中";
    if (relationships.isBlocking) return "ブロック解除";
    return "フォロー";
  }, [relationships]);
  const handleFollow = useCallback(async () => {
    if (!account || !user || isLoading) {
      return;
    }

    try {
      setIsLoading(true);

      if (relationships?.isFollowing) {
        await client.catalyst.remove({ userId: user.id });
      } else if (relationships?.isBlocking) {
        await client.catalyst.unblock({ userId: user.id });
      } else {
        await client.catalyst.follow({ userId: user.id });
      }

      const rel = await client.catalyst.relationships(user.screenName);
      onUpdateRelationships?.(rel);
    } finally {
      setIsLoading(false);
    }
  }, [
    account,
    user,
    isLoading,
    relationships?.isFollowing,
    relationships?.isBlocking,
    client.catalyst,
    onUpdateRelationships,
  ]);

  useAsyncEffect(async () => {
    if (user) {
      const [c, t] = await Promise.all([
        client.catalyst.relationshipCounts(user.screenName),
        client.catalyst.getProfileTagsByUser(user.id).catch(() => ({ tags: [] })),
      ]);
      setCounts(c);
      setTags(t.tags);
    }
  }, [user]);

  return (
    <View className="bg-light-background dark:bg-dark-background" onLayout={onLayout}>
      <View>
        {user ? (
          <UniImage
            source={{
              uri: getCdnUrl({
                src: user.profile!.bannerUrl,
                variant: "header",
                width: screenWidth,
              }),
            }}
            contentFit="cover"
            style={{ width: screenWidth, height: bannerHeight }}
          />
        ) : (
          <View className="bg-neutral-400 dark:bg-neutral-700" style={{ width: screenWidth, height: bannerHeight }} />
        )}
      </View>

      <View className="relative flex-row items-end px-4 -mt-8">
        <View className="border-light-background bg-light-background dark:border-dark-background dark:bg-dark-background rounded-full border-4">
          {user ? (
            <UniImage
              source={{
                uri: getCdnUrl({
                  src: user.profile!.iconUrl,
                  variant: "icon",
                  width: 128,
                }),
              }}
              className="w-24 h-24 rounded-full"
              contentFit="cover"
            />
          ) : (
            <View className="w-24 h-24 rounded-full bg-neutral-400 dark:bg-neutral-600" />
          )}
        </View>

        <View className="flex-1" />

        <View className="absolute top-12 right-2">
          {isLoggedIn &&
            (isMyself || relationships?.isMyself ? (
              <TouchableOpacity
                className="border rounded-full px-4 py-2 mb-2 mr-4 border-neutral-400 dark:border-neutral-600"
                onPress={() => router.push("/profile/edit")}
              >
                <Text className="font-bold text-black dark:text-white">編集</Text>
              </TouchableOpacity>
            ) : (
              <View className="flex-row items-center mb-2 mr-4 gap-2">
                {relationships?.isFollowed && (
                  <View className="bg-neutral-500/20 rounded-xs px-1 py-0.5">
                    <Text className="text-[10px] text-neutral-500">フォローされています</Text>
                  </View>
                )}
                <TouchableOpacity
                  className={cn(
                    "w-32 h-9 rounded-full border items-center justify-center",
                    relationships?.isFollowing
                      ? "bg-transparent text-neutral-400 dark:text-neutral-600 border-neutral-400 dark:border-neutral-600"
                      : "bg-black dark:bg-white",
                  )}
                  onPress={handleFollow}
                  disabled={isLoading || relationships === null}
                  activeOpacity={0.7}
                >
                  <Text
                    className={cn(
                      "font-bold text-sm",
                      relationships?.isFollowing ? "text-light-text dark:text-dark-text" : "text-white dark:text-black",
                    )}
                  >
                    {actionText}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
        </View>
      </View>

      <View className="px-4 pb-4 mt-2 gap-1.5">
        <Text className="font-bold text-xl text-light-text dark:text-dark-text">{user?.displayName}</Text>
        <SecondaryText className="text-sm">@{user?.screenName}</SecondaryText>

        <StatusText status={user?.profile?.bio ?? ""} />

        {tags.length > 0 && (
          <View className="flex flex-row flex-wrap gap-1.5 mt-1">
            {tags.map((tag) => (
              <Pressable
                key={tag.id}
                onPress={() => router.push(`/tags/${encodeURIComponent(tag.name)}`)}
                className="rounded-full bg-light-surface-muted dark:bg-dark-surface-muted px-2.5 py-1"
              >
                <Text className="text-xs text-light-tint dark:text-dark-tint">#{tag.name}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View className="flex flex-col gap-y-0.5">
          {user?.profile?.website ? (
            <TouchableOpacity
              className="flex flex-row items-center"
              onPress={() => openUrlWithBrowser(user.profile!.website)}
            >
              <UniLinkIcon size={14} className="text-neutral-500" />
              <SecondaryText className="ml-1">{user.profile.website}</SecondaryText>
            </TouchableOpacity>
          ) : null}

          {user?.profile?.additionalWebsites
            ?.filter((w) => !!w.trim())
            .map((website, i) => {
              return (
                <TouchableOpacity
                  className="flex flex-row items-center"
                  key={`${website}-${i}`}
                  onPress={() => openUrlWithBrowser(website)}
                >
                  <UniLinkIcon size={14} className="text-neutral-500" />
                  <SecondaryText className="ml-1">{website}</SecondaryText>
                </TouchableOpacity>
              );
            })}
        </View>

        <View className="flex flex-row gap-x-4">
          <TouchableOpacity
            className="flex flex-row items-center gap-x-1"
            onPress={() => router.push(`/user/${user?.screenName}/followings`)}
            disabled={counts === null || counts.followings === null}
          >
            <Text className="font-bold text-sm text-light-text dark:text-dark-text">
              {counts === null || counts.followings === null ? "-" : counts.followings}
            </Text>
            <SecondaryText className="text-sm">フォロー</SecondaryText>
          </TouchableOpacity>
          <TouchableOpacity
            className="flex flex-row items-center gap-x-1"
            onPress={() => router.push(`/user/${user?.screenName}/followers`)}
            disabled={counts === null || counts.followers === null}
          >
            <Text className="font-bold text-sm text-light-text dark:text-dark-text">
              {counts === null || counts.followers === null ? "-" : counts.followers}
            </Text>
            <SecondaryText className="text-sm">フォロワー</SecondaryText>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
