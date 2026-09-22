import { SettingsGroup, SettingsInfo, SettingsLink, SettingsPage, type SettingsPageProps } from "@/components/settings-ui";
import { Linking } from "react-native";

const LINKS: { title: string; url: string }[] = [
  { title: "広告ポリシー", url: "https://docs.natsuneko.com/ja-jp/catalyst/ads/" },
  { title: "Cookie ポリシー", url: "https://docs.natsuneko.com/ja-jp/catalyst/cookies/" },
  { title: "プライバシーポリシー", url: "https://docs.natsuneko.com/ja-jp/catalyst/privacy/" },
  { title: "利用規約", url: "https://docs.natsuneko.com/ja-jp/catalyst/terms/" },
  { title: "オープンソースライセンス", url: "https://github.com/mika-f/Catalyst-Native/blob/main/LICENSE" },
];

const open = (url: string) => {
  Linking.openURL(url).catch((error) => console.error(error));
};

export const LegalPage = ({ onBack }: SettingsPageProps) => {
  return (
    <SettingsPage title="法的情報" onBack={onBack}>
      <SettingsGroup>
        <SettingsInfo title="バージョン" value="0.0.1" />
      </SettingsGroup>
      <SettingsGroup title="ポリシー">
        {LINKS.map((item) => (
          <SettingsLink key={item.url} title={item.title} external onPress={() => open(item.url)} />
        ))}
      </SettingsGroup>
    </SettingsPage>
  );
};
