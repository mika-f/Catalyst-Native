import {
  CatalystBadge,
  CatalystBadgeText,
  CatalystButton,
  CatalystButtonText,
  CatalystText,
} from "@/components/design-system";
import { useAsyncEffect } from "@/hooks/use-async-effect";
import { getCdnUrl } from "@/lib/media";
import { accountAtom } from "@/models/atoms/account";
import { clientAtom } from "@/models/atoms/credential";
import { openUrlWithBrowser } from "@/models/browser-settings";
import { ProfileEmoji } from "@/components/user/profile-emoji";
import { CatalystRelationships, EgeriaUser, ProfileTag } from "@natsuneko-laboratory/catalyst-sdk";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { LinkIcon } from "lucide-react-native";
import { useCallback, useMemo, useState } from "react";
import { LayoutChangeEvent, Pressable, View, useWindowDimensions } from "react-native";
import { withUniwind } from "uniwind";
import { StatusText } from "../status/text";

type RelationshipCounts = {
  followers: number | null;
  followings: number | null;
};
const UniImage = withUniwind(Image);
const UniLinkIcon = withUniwind(LinkIcon);

type Props = {
  user: EgeriaUser | null;
  relationships: CatalystRelationships | null;
  tags: ProfileTag[];
  onUpdateRelationships?: (rel: CatalystRelationships) => void;
  onLayout: (e: LayoutChangeEvent) => void;
};

export const ProfileHeader = ({ user, relationships, tags, onUpdateRelationships, onLayout }: Props) => {
  const { width: screenWidth } = useWindowDimensions();
  const bannerHeight = Math.max(136, screenWidth / 3);
  const account = useAtomValue(accountAtom);
  const client = useAtomValue(clientAtom);
  const router = useRouter();
  const isLoggedIn = !!account?.user;
  const isMyself = account?.user.screenName === user?.screenName;
  const [counts, setCounts] = useState<RelationshipCounts | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
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
        await client.catalyst.remove(user.id);
      } else if (relationships?.isBlocking) {
        await client.catalyst.unblock(user.id);
      } else {
        await client.catalyst.follow(user.id);
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
      const c = await client.catalyst.relationshipCounts(user.screenName);
      setCounts(c);
    }
  }, [user]);

  return (
    <View className="bg-light-background dark:bg-dark-surface" onLayout={onLayout}>
      <View>
        {user?.profile?.bannerUrl ? (
          <UniImage
            source={{
              uri: getCdnUrl({
                src: user.profile.bannerUrl,
                variant: "header",
                width: screenWidth,
              }),
            }}
            contentFit="cover"
            style={{ width: screenWidth, height: bannerHeight }}
          />
        ) : (
          <View
            className="bg-light-surface-muted dark:bg-dark-surface-muted"
            style={{ width: screenWidth, height: bannerHeight }}
          />
        )}
      </View>

      <View className="-mt-12 flex-row items-end px-5">
        <View className="rounded-full border-4 border-light-background bg-light-surface-muted dark:border-dark-surface dark:bg-dark-surface-muted">
          {user?.profile?.iconUrl ? (
            <UniImage
              source={{
                uri: getCdnUrl({
                  src: user.profile.iconUrl,
                  variant: "icon",
                  width: 128,
                }),
              }}
              className="size-24 rounded-full"
              contentFit="cover"
            />
          ) : (
            <View className="size-24 rounded-full bg-light-surface-elevated dark:bg-dark-surface-elevated" />
          )}
        </View>

        <View className="flex-1" />

        <View className="pb-2">
          {isLoggedIn &&
            (isMyself || relationships?.isMyself ? (
              <CatalystButton
                size="sm"
                tone="secondary"
                onPress={() => router.push("/profile/edit")}
              >
                <CatalystButtonText>編集</CatalystButtonText>
              </CatalystButton>
            ) : (
              <View className="flex-row items-center gap-2">
                {relationships?.isFollowed && (
                  <CatalystBadge tone="neutral" className="h-7">
                    <CatalystBadgeText>フォローされています</CatalystBadgeText>
                  </CatalystBadge>
                )}
                <CatalystButton
                  size="sm"
                  tone={relationships?.isFollowing ? "secondary" : "primary"}
                  onPress={handleFollow}
                  disabled={isLoading || relationships === null}
                >
                  <CatalystButtonText>{actionText}</CatalystButtonText>
                </CatalystButton>
              </View>
            ))}
        </View>
      </View>

      <View className="px-5 pb-5 pt-3">
        <View className="flex-row items-center gap-1.5">
          <CatalystText variant="title" className="shrink text-[21px]" numberOfLines={1}>
            {user?.displayName}
          </CatalystText>
          <ProfileEmoji emoji={user?.profileEmoji} size={20} />
        </View>
        <CatalystText variant="body" tone="muted" className="mt-0.5">
          @{user?.screenName}
        </CatalystText>

        {user?.profile?.bio ? (
          <View className="mt-3">
            <StatusText status={user.profile.bio} />
          </View>
        ) : null}

        {tags.length > 0 && (
          <View className="mt-3 flex-row flex-wrap gap-2">
            {tags.map((tag) => (
              <Pressable
                key={tag.id}
                onPress={() => router.push(`/tags/${encodeURIComponent(tag.name)}`)}
                className="rounded-full border border-light-toggle-border bg-light-toggle px-3 py-1.5 active:opacity-80 dark:border-dark-toggle-border dark:bg-dark-toggle"
              >
                <CatalystText variant="caption" tone="tint" className="font-semibold">
                  #{tag.name}
                </CatalystText>
              </Pressable>
            ))}
          </View>
        )}

        <View className="mt-3 gap-1.5">
          {user?.profile?.website ? (
            <Pressable
              className="flex-row items-center active:opacity-80"
              onPress={() => openUrlWithBrowser(user.profile!.website)}
            >
              <UniLinkIcon size={14} className="text-light-icon dark:text-dark-icon" />
              <CatalystText variant="body" tone="tint" className="ml-1" numberOfLines={1}>
                {user.profile.website}
              </CatalystText>
            </Pressable>
          ) : null}

          {user?.profile?.additionalWebsites
            ?.filter((w) => !!w.trim())
            .map((website, i) => {
              return (
                <Pressable
                  className="flex-row items-center active:opacity-80"
                  key={`${website}-${i}`}
                  onPress={() => openUrlWithBrowser(website)}
                >
                  <UniLinkIcon size={14} className="text-light-icon dark:text-dark-icon" />
                  <CatalystText variant="body" tone="tint" className="ml-1" numberOfLines={1}>
                    {website}
                  </CatalystText>
                </Pressable>
              );
            })}
        </View>

        <View className="mt-4 flex-row gap-5">
          <Pressable
            className="flex-row items-baseline gap-1 active:opacity-80"
            onPress={() => router.push(`/user/${user?.screenName}/followings`)}
            disabled={counts === null || counts.followings === null}
          >
            <CatalystText variant="label">
              {counts === null || counts.followings === null ? "-" : counts.followings}
            </CatalystText>
            <CatalystText variant="body" tone="muted">フォロー</CatalystText>
          </Pressable>
          <Pressable
            className="flex-row items-baseline gap-1 active:opacity-80"
            onPress={() => router.push(`/user/${user?.screenName}/followers`)}
            disabled={counts === null || counts.followers === null}
          >
            <CatalystText variant="label">
              {counts === null || counts.followers === null ? "-" : counts.followers}
            </CatalystText>
            <CatalystText variant="body" tone="muted">フォロワー</CatalystText>
          </Pressable>
        </View>
      </View>
    </View>
  );
};
