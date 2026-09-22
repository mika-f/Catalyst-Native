import { hideSensitiveContentAtom } from "@/atoms/sensitive-content";
import { SettingsGroup, SettingsOption, SettingsPage, SettingsSwitch, type SettingsPageProps } from "@/components/settings-ui";
import { type Appearance, saveAppearance } from "@/models/appearance";
import { saveHideSensitiveContent } from "@/models/sensitive-content-settings";
import { useAtom } from "jotai";
import { useUniwind } from "uniwind";

const APPEARANCES: { key: Appearance; title: string; description: string }[] = [
  { key: "system", title: "システム設定に従う", description: "macOS の外観モードに合わせます" },
  { key: "light", title: "ライト", description: "常に明るい配色を使います" },
  { key: "dark", title: "ダーク", description: "常に暗い配色を使います" },
];

export const DisplayPage = ({ onBack }: SettingsPageProps) => {
  const { theme, hasAdaptiveThemes } = useUniwind();
  const appearance: Appearance = hasAdaptiveThemes ? "system" : theme === "dark" ? "dark" : "light";
  const [hideSensitiveContent, setHideSensitiveContent] = useAtom(hideSensitiveContentAtom);

  const selectAppearance = (value: Appearance) => {
    saveAppearance(value).catch((error) => console.error(error));
  };

  const toggleSensitive = (value: boolean) => {
    const previous = hideSensitiveContent;
    setHideSensitiveContent(value);
    saveHideSensitiveContent(value).catch((error) => {
      console.error(error);
      setHideSensitiveContent(previous);
    });
  };

  return (
    <SettingsPage title="表示" onBack={onBack}>
      <SettingsGroup title="外観" footer="ウィンドウとサイドバーの配色を変更します。">
        {APPEARANCES.map((item) => (
          <SettingsOption
            key={item.key}
            title={item.title}
            description={item.description}
            selected={appearance === item.key}
            onPress={() => selectAppearance(item.key)}
          />
        ))}
      </SettingsGroup>
      <SettingsGroup title="センシティブ投稿" footer="ホームタイムラインの読み込みに反映されます。">
        <SettingsSwitch
          title="センシティブ投稿を表示しない"
          description="ホームタイムラインからセンシティブ投稿を除外します"
          value={hideSensitiveContent}
          onValueChange={toggleSensitive}
        />
      </SettingsGroup>
    </SettingsPage>
  );
};
