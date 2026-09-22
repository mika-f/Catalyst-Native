import { boostTextContrastAtom, reduceMotionPreferenceAtom, underlineLinksAtom } from "@/atoms/accessibility";
import { SettingsGroup, SettingsOption, SettingsPage, SettingsSwitch, type SettingsPageProps } from "@/components/settings-ui";
import {
  type ReduceMotionPreference,
  saveBoostTextContrast,
  saveReduceMotionPreference,
  saveUnderlineLinks,
} from "@/models/accessibility-settings";
import { useAtom } from "jotai";

const MOTION_OPTIONS: { key: ReduceMotionPreference; title: string; description: string }[] = [
  {
    key: "system",
    title: "システム設定に従う",
    description: "macOS の「視差効果を減らす」を使用します",
  },
  {
    key: "on",
    title: "常に減らす",
    description: "画面の切り替えやスワイプの動きを最小限にします",
  },
  {
    key: "off",
    title: "減らさない",
    description: "常に通常のアニメーションを使用します",
  },
];

export const AccessibilityPage = ({ onBack }: SettingsPageProps) => {
  const [reduceMotion, setReduceMotion] = useAtom(reduceMotionPreferenceAtom);
  const [underlineLinks, setUnderlineLinks] = useAtom(underlineLinksAtom);
  const [boostTextContrast, setBoostTextContrast] = useAtom(boostTextContrastAtom);

  return (
    <SettingsPage title="アクセシビリティ" onBack={onBack}>
      <SettingsGroup
        title="動きを減らす"
        footer="画像のスワイプや画面の切り替えなど、アプリ内のアニメーションを抑えます。"
      >
        {MOTION_OPTIONS.map((option) => (
          <SettingsOption
            key={option.key}
            title={option.title}
            description={option.description}
            selected={reduceMotion === option.key}
            onPress={() => {
              const previous = reduceMotion;
              setReduceMotion(option.key);
              saveReduceMotionPreference(option.key).catch((error) => {
                console.error(error);
                setReduceMotion(previous);
              });
            }}
          />
        ))}
      </SettingsGroup>
      <SettingsGroup title="読みやすさ">
        <SettingsSwitch
          title="リンクに下線を表示"
          description="URL・ハッシュタグ・メンションを色だけでなく下線でも区別します"
          value={underlineLinks}
          onValueChange={(value) => {
            setUnderlineLinks(value);
            saveUnderlineLinks(value).catch((error) => {
              console.error(error);
              setUnderlineLinks(!value);
            });
          }}
        />
        <SettingsSwitch
          title="文字のコントラストを上げる"
          description="日付やユーザー名などの補助的な文字を、より濃い色で表示します"
          value={boostTextContrast}
          onValueChange={(value) => {
            setBoostTextContrast(value);
            saveBoostTextContrast(value).catch((error) => {
              console.error(error);
              setBoostTextContrast(!value);
            });
          }}
        />
      </SettingsGroup>
    </SettingsPage>
  );
};
