import {
  CatalystDivider,
  CatalystListItem,
  CatalystListItemContent,
  CatalystSwitch,
  CatalystText,
} from "@/components/design-system";
import {
  boostTextContrastAtom,
  fleetPaceAtom,
  hapticsEnabledAtom,
  reduceMotionPreferenceAtom,
  underlineLinksAtom,
} from "@/models/atoms/accessibility";
import {
  type FleetPace,
  type ReduceMotionPreference,
  loadBoostTextContrast,
  loadFleetPace,
  loadHapticsEnabled,
  loadReduceMotionPreference,
  loadUnderlineLinks,
  saveBoostTextContrast,
  saveFleetPace,
  saveHapticsEnabled,
  saveReduceMotionPreference,
  saveUnderlineLinks,
} from "@/models/accessibility-settings";
import { useAtom } from "jotai";
import { Check } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ScrollView, View } from "react-native";
import { withUniwind } from "uniwind";

const CheckIcon = withUniwind(Check);

type Option<T> = {
  key: T;
  displayName: string;
  description: string;
};

const REDUCE_MOTION_OPTIONS: Option<ReduceMotionPreference>[] = [
  {
    key: "system",
    displayName: "システム設定に従う",
    description: "端末の「視差効果を減らす」設定をそのまま使用します",
  },
  {
    key: "on",
    displayName: "常に減らす",
    description: "画面の切り替えやスワイプの動きを最小限にします",
  },
  {
    key: "off",
    displayName: "減らさない",
    description: "常に通常のアニメーションを使用します",
  },
];

const FLEET_PACE_OPTIONS: Option<FleetPace>[] = [
  {
    key: "standard",
    displayName: "標準 (6秒)",
    description: "6 秒ごとに次の Fleet へ進みます",
  },
  {
    key: "slow",
    displayName: "長め (12秒)",
    description: "ゆっくり読めるように表示時間を長くします",
  },
  {
    key: "manual",
    displayName: "自動で進めない",
    description: "画面をタップしたときだけ次の Fleet へ進みます",
  },
];

type OptionListProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onSelect: (key: T) => void;
};

const OptionList = <T extends string>({ options, value, onSelect }: OptionListProps<T>) => (
  <View className="bg-light-background dark:bg-dark-surface">
    {options.map((option, index) => (
      <View key={option.key}>
        <CatalystListItem
          divided={false}
          className="min-h-16 px-5 py-3"
          onPress={() => onSelect(option.key)}
        >
          <CatalystListItemContent>
            <CatalystText variant="subtitle" className="text-[15px] font-semibold">
              {option.displayName}
            </CatalystText>
            <CatalystText variant="caption" tone="muted">
              {option.description}
            </CatalystText>
          </CatalystListItemContent>
          {value === option.key && (
            <CheckIcon className="text-light-tint dark:text-dark-tint" size={18} />
          )}
        </CatalystListItem>
        {index < options.length - 1 && <CatalystDivider className="ml-5 w-auto" />}
      </View>
    ))}
  </View>
);

type ToggleRowProps = {
  title: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

const ToggleRow = ({ title, description, value, onValueChange }: ToggleRowProps) => (
  <View className="min-h-16 flex-row items-center bg-light-background px-5 py-3 dark:bg-dark-surface">
    <CatalystListItemContent className="mr-4">
      <CatalystText variant="subtitle" className="text-[15px] font-semibold">
        {title}
      </CatalystText>
      <CatalystText variant="caption" tone="muted">
        {description}
      </CatalystText>
    </CatalystListItemContent>
    <CatalystSwitch value={value} onValueChange={onValueChange} />
  </View>
);

export default function AccessibilitySettingsPage() {
  const [reduceMotion, setReduceMotion] = useAtom(reduceMotionPreferenceAtom);
  const [fleetPace, setFleetPace] = useAtom(fleetPaceAtom);
  const [underlineLinks, setUnderlineLinks] = useAtom(underlineLinksAtom);
  const [boostTextContrast, setBoostTextContrast] = useAtom(boostTextContrastAtom);
  const [hapticsEnabled, setHapticsEnabled] = useAtom(hapticsEnabledAtom);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      loadReduceMotionPreference(),
      loadFleetPace(),
      loadUnderlineLinks(),
      loadBoostTextContrast(),
      loadHapticsEnabled(),
    ]).then(([motion, pace, underline, contrast, haptics]) => {
      setReduceMotion(motion);
      setFleetPace(pace);
      setUnderlineLinks(underline);
      setBoostTextContrast(contrast);
      setHapticsEnabled(haptics);
      setIsLoading(false);
    });
  }, [
    setBoostTextContrast,
    setFleetPace,
    setHapticsEnabled,
    setReduceMotion,
    setUnderlineLinks,
  ]);

  const handleReduceMotionSelect = useCallback(
    async (preference: ReduceMotionPreference) => {
      setReduceMotion(preference);
      await saveReduceMotionPreference(preference);
    },
    [setReduceMotion],
  );

  const handleFleetPaceSelect = useCallback(
    async (pace: FleetPace) => {
      setFleetPace(pace);
      await saveFleetPace(pace);
    },
    [setFleetPace],
  );

  const handleUnderlineLinksChange = useCallback(
    async (enabled: boolean) => {
      setUnderlineLinks(enabled);
      await saveUnderlineLinks(enabled);
    },
    [setUnderlineLinks],
  );

  const handleBoostTextContrastChange = useCallback(
    async (enabled: boolean) => {
      setBoostTextContrast(enabled);
      await saveBoostTextContrast(enabled);
    },
    [setBoostTextContrast],
  );

  const handleHapticsChange = useCallback(
    async (enabled: boolean) => {
      setHapticsEnabled(enabled);
      await saveHapticsEnabled(enabled);
    },
    [setHapticsEnabled],
  );

  if (isLoading) {
    return <View className="flex-1 bg-light-surface-muted dark:bg-dark-background" />;
  }

  return (
    <ScrollView className="flex-1 bg-light-surface-muted dark:bg-dark-background">
      <View className="pt-2">
        <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
          動きを減らす
        </CatalystText>
        <OptionList
          options={REDUCE_MOTION_OPTIONS}
          value={reduceMotion}
          onSelect={handleReduceMotionSelect}
        />
        <CatalystText variant="caption" tone="subtle" className="px-5 pt-2 leading-4">
          画像のスワイプやタブの切り替えなど、アプリ内のアニメーションを抑えます。乗り物酔いや目の疲れが気になる場合に使用してください。
        </CatalystText>
      </View>

      <View className="mt-6">
        <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
          Fleet の表示時間
        </CatalystText>
        <OptionList options={FLEET_PACE_OPTIONS} value={fleetPace} onSelect={handleFleetPaceSelect} />
        <CatalystText variant="caption" tone="subtle" className="px-5 pt-2 leading-4">
          Fleet が自動で次に進むまでの時間を変更します。
        </CatalystText>
      </View>

      <View className="mt-6">
        <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
          読みやすさ
        </CatalystText>
        <View className="bg-light-background dark:bg-dark-surface">
          <ToggleRow
            title="リンクに下線を表示"
            description="URL・ハッシュタグ・メンションを色だけでなく下線でも区別します"
            value={underlineLinks}
            onValueChange={handleUnderlineLinksChange}
          />
          <CatalystDivider className="ml-5 w-auto" />
          <ToggleRow
            title="文字のコントラストを上げる"
            description="日付やユーザー名などの補助的な文字を、より濃い色で表示します"
            value={boostTextContrast}
            onValueChange={handleBoostTextContrastChange}
          />
        </View>
      </View>

      <View className="mt-6 mb-8">
        <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
          操作
        </CatalystText>
        <ToggleRow
          title="触覚フィードバック"
          description="タブの切り替えや画像の保存時に端末を振動させます"
          value={hapticsEnabled}
          onValueChange={handleHapticsChange}
        />
      </View>
    </ScrollView>
  );
}
