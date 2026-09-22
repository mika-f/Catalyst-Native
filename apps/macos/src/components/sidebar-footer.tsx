import type { SidebarFooterProps } from "@natsuneko-laboratory/react-native-desktop-navigation/native";
import { boostTextContrastAtom } from "@/atoms/accessibility";
import { cn } from "cn";
import { useAtomValue } from "jotai";
import { LogIn, Settings, SquarePen } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { Avatar, Button, IconButton, useHover } from "./ui";

const UniLogIn = withUniwind(LogIn);
const UniSettings = withUniwind(Settings);
const UniSquarePen = withUniwind(SquarePen);

export type SidebarAccount = {
  displayName: string;
  screenName: string;
};

type Props = SidebarFooterProps & {
  account: SidebarAccount | null;
  onCompose?: () => void;
  onLogin?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
};

const AccountButton = ({ account, onPress }: { account: SidebarAccount | null; onPress?: () => void }) => {
  const { hovered, hoverProps } = useHover();
  const boostContrast = useAtomValue(boostTextContrastAtom);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={account ? `${account.displayName} のプロフィール` : "アカウント"}
      focusable
      className={cn(
        "flex-1 flex-row items-center gap-2.5 rounded-xl p-1.5",
        hovered && "bg-light-overlay dark:bg-dark-overlay",
      )}
      onPress={onPress}
      {...hoverProps}
    >
      <Avatar name={account?.displayName ?? "?"} size="sm" />
      <View className="flex-1">
        <Text numberOfLines={1} className="text-[13px] font-semibold text-light-text dark:text-dark-text">
          {account?.displayName ?? "ゲスト"}
        </Text>
        <Text
          numberOfLines={1}
          className={
            boostContrast
              ? "text-[11px] text-light-text dark:text-dark-text"
              : "text-[11px] text-light-text-muted dark:text-dark-text-muted"
          }
        >
          {account ? `@${account.screenName}` : "ログインしていません"}
        </Text>
      </View>
    </Pressable>
  );
};

// サイドバー下部: 主要 CTA (投稿 / ログイン) とアカウント切り替え・設定
export const SidebarFooter = ({ account, onCompose, onLogin, onOpenProfile, onOpenSettings }: Props) => {
  return (
    <View className="gap-3 px-3 pb-3 pt-2">
      {account ? (
        <Button
          size="lg"
          label="投稿する"
          icon={<UniSquarePen size={16} className="text-light-accent-foreground dark:text-dark-accent-foreground" />}
          onPress={onCompose}
        />
      ) : (
        <Button
          size="lg"
          label="ログイン"
          icon={<UniLogIn size={16} className="text-light-accent-foreground dark:text-dark-accent-foreground" />}
          onPress={onLogin}
        />
      )}
      <View className="flex-row items-center gap-1">
        <AccountButton account={account} onPress={onOpenProfile} />
        <IconButton label="設定" onPress={onOpenSettings}>
          <UniSettings size={18} className="text-light-icon dark:text-dark-icon" />
        </IconButton>
      </View>
    </View>
  );
};
