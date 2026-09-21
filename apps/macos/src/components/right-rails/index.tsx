import { ScrollView, Text } from "react-native";
import { SearchField } from "../ui";
import { Contests } from "./contests";
import { Theme } from "./theme";
import { Trends } from "./trends";

// トレンド・コンテスト・今週のお題を並べる右カラム。幅が足りないときは Page 側で非表示にする
export const RightRail = () => {
  return (
    <ScrollView className="w-[320px] grow-0" contentContainerClassName="gap-4 px-5 pb-8 pt-4">
      <SearchField placeholder="Catalyst を検索" />
      <Contests />
      <Theme />
      <Trends />
      <Text className="px-1 text-[11px] leading-4 text-light-text-subtle dark:text-dark-text-subtle">
        利用規約 · プライバシーポリシー · © Natsuneko Laboratory
      </Text>
    </ScrollView>
  );
};
