import { ScrollView, Text } from "react-native";
import pkg from "../../../package.json" with { type: "json" };
import { SearchField } from "../ui";
import { Contests } from "./contests";
import { Theme } from "./theme";
import { Trends } from "./trends";


// トレンドやおすすめを並べる右カラム。幅が足りない / 詳細ペインを開いている間は Page 側で非表示にする
export const RightRail = () => {

  return (
    <ScrollView
      className="w-[320px] grow-0 border-l-hairline border-light-divider dark:border-dark-divider"
      contentContainerClassName="gap-4 px-4 pb-8 pt-4"
    >
      <SearchField placeholder="Catalyst を検索" />
      <Contests />
      <Theme />
      <Trends />
      <Text className="px-1 text-[11px] leading-4 text-light-text-subtle dark:text-dark-text-subtle">
        {`Catalyst for Windows, Version ${pkg.version}`}
      </Text>
    </ScrollView>
  );
};
