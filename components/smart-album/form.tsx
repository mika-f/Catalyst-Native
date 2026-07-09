import {
  CatalystBadge,
  CatalystBadgeText,
  CatalystButton,
  CatalystButtonIcon,
  CatalystButtonText,
  CatalystDivider,
  CatalystSegmentedControl,
  CatalystSwitch,
  CatalystText,
  CatalystTextField,
} from "@/components/design-system";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import type { CatalystAlbumDisplayMode } from "@natsuneko-laboratory/catalyst-sdk";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import dayjs from "dayjs";
import { Plus, X } from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, Text, View, useColorScheme } from "react-native";
import { withUniwind } from "uniwind";

import "@/global.css";

function mergeDatePart(base: Date, newDate: Date): Date {
  return new Date(newDate.getFullYear(), newDate.getMonth(), newDate.getDate(), base.getHours(), base.getMinutes(), 0);
}

function mergeTimePart(base: Date, newTime: Date): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate(), newTime.getHours(), newTime.getMinutes(), 0);
}

const UniPlus = withUniwind(Plus);
const UniX = withUniwind(X);

export type ConditionType = "hashtag" | "takenBy" | "contest" | "user";

export type SmartAlbumCondition = {
  id: string;
  type: ConditionType;
  value: string;
  isExclude: boolean;
};

export const MAX_CONDITIONS = 20;

const CONDITION_TYPE_LABELS: Record<ConditionType, string> = {
  hashtag: "タグ / キーワード",
  takenBy: "撮影者ID",
  contest: "コンテスト",
  user: "ユーザー",
};

const CONDITION_TYPE_BADGE: Record<ConditionType, string> = {
  hashtag: "tag",
  takenBy: "takenBy",
  contest: "contest",
  user: "user",
};

const CONDITION_PLACEHOLDERS: Record<ConditionType, string> = {
  hashtag: "例: landscape",
  takenBy: "例: usr_xxxxx",
  contest: "例: コンテストのslug",
  user: "例: screen_name",
};

const DISPLAY_MODE_OPTIONS: { value: CatalystAlbumDisplayMode; label: string }[] = [
  { value: "timeline", label: "タイムライン" },
  { value: "grid", label: "グリッド" },
  { value: "gallery", label: "ギャラリー" },
];

export function hashtagsToConditions(hashtags: string[]): SmartAlbumCondition[] {
  return hashtags
    .map((raw, index) => {
      const trimmed = raw.trim();
      if (!trimmed) return null;

      const isExclude = trimmed.startsWith("-");
      const without = isExclude ? trimmed.slice(1) : trimmed;

      let type: ConditionType = "hashtag";
      let value = without;

      if (without.startsWith("takenBy:")) {
        type = "takenBy";
        value = without.slice("takenBy:".length);
      } else if (without.startsWith("contest:")) {
        type = "contest";
        value = without.slice("contest:".length);
      } else if (without.startsWith("user:")) {
        type = "user";
        value = without.slice("user:".length);
      }

      if (!value) return null;

      return {
        id: `${isExclude ? "ex-" : ""}${type}-init-${index}`,
        type,
        value,
        isExclude,
      } satisfies SmartAlbumCondition;
    })
    .filter((c): c is SmartAlbumCondition => c !== null);
}

export function conditionToHashtag(condition: SmartAlbumCondition): string {
  const prefix = condition.isExclude ? "-" : "";
  if (condition.type === "takenBy") return `${prefix}takenBy:${condition.value}`;
  if (condition.type === "contest") return `${prefix}contest:${condition.value}`;
  if (condition.type === "user") return `${prefix}user:${condition.value}`;
  return `${prefix}${condition.value}`;
}

type Props = {
  title: string;
  onChangeTitle: (v: string) => void;
  description: string;
  onChangeDescription: (v: string) => void;
  conditions: SmartAlbumCondition[];
  onChangeConditions: (v: SmartAlbumCondition[]) => void;
  since: string | null;
  onChangeSince: (v: string | null) => void;
  until: string | null;
  onChangeUntil: (v: string | null) => void;
  isAllowNsfw: boolean;
  onChangeIsAllowNsfw: (v: boolean) => void;
  isAllowOthers: boolean;
  onChangeIsAllowOthers: (v: boolean) => void;
  isPublic: boolean;
  onChangeIsPublic: (v: boolean) => void;
  displayMode: CatalystAlbumDisplayMode;
  onChangeDisplayMode: (v: CatalystAlbumDisplayMode) => void;
  footer?: React.ReactNode;
};

export const SmartAlbumForm = ({
  title,
  onChangeTitle,
  description,
  onChangeDescription,
  conditions,
  onChangeConditions,
  since,
  onChangeSince,
  until,
  onChangeUntil,
  isAllowNsfw,
  onChangeIsAllowNsfw,
  isAllowOthers,
  onChangeIsAllowOthers,
  isPublic,
  onChangeIsPublic,
  displayMode,
  onChangeDisplayMode,
  footer,
}: Props) => {
  const theme = useColorScheme() ?? "light";
  const addConditionSheetRef = useRef<BottomSheetModal>(null);

  const [conditionType, setConditionType] = useState<ConditionType>("hashtag");
  const [conditionValue, setConditionValue] = useState("");
  const [conditionIsExclude, setConditionIsExclude] = useState(false);

  const openAddConditionSheet = useCallback(() => {
    setConditionType("hashtag");
    setConditionValue("");
    setConditionIsExclude(false);
    addConditionSheetRef.current?.present();
  }, []);

  const handleAddCondition = useCallback(() => {
    const value = conditionValue.trim();
    if (!value) return;

    const normalizedValue = conditionType === "user" ? value.replace(/^@/, "") : value;
    const next: SmartAlbumCondition = {
      id: `${conditionIsExclude ? "ex-" : ""}${conditionType}-${Date.now()}`,
      type: conditionType,
      value: normalizedValue,
      isExclude: conditionIsExclude,
    };

    const existingHashtags = new Set(conditions.map(conditionToHashtag));
    if (existingHashtags.has(conditionToHashtag(next))) {
      addConditionSheetRef.current?.dismiss();
      return;
    }

    const updated = [...conditions, next];
    if (updated.length > MAX_CONDITIONS) return;

    onChangeConditions(updated);
    setConditionValue("");
    setConditionIsExclude(false);
    addConditionSheetRef.current?.dismiss();
  }, [conditionType, conditionValue, conditionIsExclude, conditions, onChangeConditions]);

  const handleRemoveCondition = useCallback(
    (id: string) => {
      onChangeConditions(conditions.filter((c) => c.id !== id));
    },
    [conditions, onChangeConditions],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} />,
    [],
  );

  const now = new Date().toISOString();

  const openAndroidDateTimePicker = useCallback((current: string, onChange: (v: string | null) => void) => {
    const currentDate = new Date(current);
    DateTimePickerAndroid.open({
      value: currentDate,
      mode: "date",
      onChange: (_, date) => {
        if (!date) return;
        const merged = mergeDatePart(currentDate, date);
        DateTimePickerAndroid.open({
          value: merged,
          mode: "time",
          is24Hour: true,
          onChange: (_, time) => {
            if (time) onChange(mergeTimePart(merged, time).toISOString());
          },
        });
      },
    });
  }, []);

  return (
    <>
      <ScrollView
        className="flex-1 bg-light-surface-muted dark:bg-dark-background"
        contentContainerClassName="pb-8"
      >
        {/* 基本情報 */}
        <View className="pt-2">
          <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
            基本情報
          </CatalystText>
          <View className="bg-light-background dark:bg-dark-surface">
            <View className="min-h-14 px-5 py-3">
              <CatalystTextField value={title} onChangeText={onChangeTitle} placeholder="タイトル" />
            </View>
            <CatalystDivider className="ml-5 w-auto" />
            <View className="px-5 py-3">
              <CatalystTextField
                value={description}
                onChangeText={onChangeDescription}
                multiline
                placeholder="説明（任意）"
              />
            </View>
          </View>
        </View>

        {/* 条件 */}
        <View className="mt-6">
          <View className="flex-row items-center justify-between px-5 pb-2">
            <CatalystText variant="caption" tone="subtle">
              条件
            </CatalystText>
            <CatalystButton
              size="sm"
              tone="secondary"
              onPress={openAddConditionSheet}
              disabled={conditions.length >= MAX_CONDITIONS}
            >
              <CatalystButtonIcon>
                <UniPlus />
              </CatalystButtonIcon>
              <CatalystButtonText>条件を追加</CatalystButtonText>
            </CatalystButton>
          </View>

          {conditions.length === 0 ? (
            <View className="bg-light-background px-5 py-6 dark:bg-dark-surface">
              <CatalystText tone="muted" className="text-center">
                条件がありません。追加してください。
              </CatalystText>
            </View>
          ) : (
            <View className="bg-light-background dark:bg-dark-surface">
              {conditions.map((condition, index) => (
                <View key={condition.id}>
                <View className="min-h-14 flex-row items-center justify-between px-5 py-3">
                  <View className="flex-1 flex-row items-center gap-2">
                    {condition.isExclude && (
                      <CatalystBadge tone="danger">
                        <CatalystBadgeText>除外</CatalystBadgeText>
                      </CatalystBadge>
                    )}
                    <CatalystBadge tone="neutral">
                      <CatalystBadgeText>{CONDITION_TYPE_BADGE[condition.type]}</CatalystBadgeText>
                    </CatalystBadge>
                    <CatalystText className="flex-1" numberOfLines={1}>
                      {condition.value}
                    </CatalystText>
                  </View>
                  <Pressable onPress={() => handleRemoveCondition(condition.id)} className="p-1">
                    <UniX size={16} className="text-light-text-muted dark:text-dark-text-muted" />
                  </Pressable>
                </View>
                  {index < conditions.length - 1 && <CatalystDivider className="ml-5 w-auto" />}
                </View>
              ))}
            </View>
          )}
          <CatalystText variant="caption" tone="subtle" className="px-5 pt-2 leading-4">
            登録された条件で投稿を収集します（最大{MAX_CONDITIONS}件）
          </CatalystText>
        </View>

        {/* 期間設定 */}
        <View className="mt-6">
          <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
            期間設定
          </CatalystText>
          <View className="bg-light-background dark:bg-dark-surface">
          <View className="min-h-14 flex-row items-center justify-between px-5 py-3">
            <CatalystText variant="subtitle" className="text-[15px] font-semibold">開始日時を設定</CatalystText>
            <CatalystSwitch value={since !== null} onValueChange={(enabled) => onChangeSince(enabled ? now : null)} />
          </View>
          {since !== null &&
            (Platform.OS === "ios" ? (
              <View className="px-5 pb-3">
              <DateTimePicker
                value={new Date(since)}
                mode="datetime"
                display="compact"
                onChange={(_, date) => date && onChangeSince(date.toISOString())}
              />
              </View>
            ) : (
              <Pressable
                onPress={() => openAndroidDateTimePicker(since, onChangeSince)}
                className="mx-5 mb-3 rounded-lg bg-light-surface-muted p-3 dark:bg-dark-surface-muted"
              >
                <CatalystText>
                  {dayjs(since).format("YYYY/MM/DD HH:mm")}
                </CatalystText>
              </Pressable>
            ))}
          <CatalystDivider className="ml-5 w-auto" />
          <View className="min-h-14 flex-row items-center justify-between px-5 py-3">
            <CatalystText variant="subtitle" className="text-[15px] font-semibold">終了日時を設定</CatalystText>
            <CatalystSwitch value={until !== null} onValueChange={(enabled) => onChangeUntil(enabled ? now : null)} />
          </View>
          {until !== null &&
            (Platform.OS === "ios" ? (
              <View className="px-5 pb-3">
                <DateTimePicker
                  value={new Date(until)}
                  mode="datetime"
                  display="compact"
                  onChange={(_, date) => date && onChangeUntil(date.toISOString())}
                />
              </View>
            ) : (
              <Pressable
                onPress={() => openAndroidDateTimePicker(until, onChangeUntil)}
                className="mx-5 mb-3 rounded-lg bg-light-surface-muted p-3 dark:bg-dark-surface-muted"
              >
                <CatalystText>
                  {dayjs(until).format("YYYY/MM/DD HH:mm")}
                </CatalystText>
              </Pressable>
            ))}
          </View>
        </View>

        {/* 表示モード */}
        <View className="mt-6">
          <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
            表示モード
          </CatalystText>
          <View className="bg-light-background px-5 py-3 dark:bg-dark-surface">
            <CatalystSegmentedControl
              options={DISPLAY_MODE_OPTIONS}
              value={displayMode}
              onValueChange={onChangeDisplayMode}
            />
          </View>
          <CatalystText variant="caption" tone="subtle" className="px-5 pt-2 leading-4">
            アルバム内の投稿の表示方法を選択します
          </CatalystText>
        </View>

        {/* 投稿設定 */}
        <View className="mt-6">
          <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
            投稿設定
          </CatalystText>
          <View className="bg-light-background dark:bg-dark-surface">
          <View className="min-h-14 flex-row items-center justify-between px-5 py-3">
            <CatalystText variant="subtitle" className="flex-1 text-[15px] font-semibold">NSFWコンテンツを許可</CatalystText>
            <CatalystSwitch value={isAllowNsfw} onValueChange={onChangeIsAllowNsfw} />
          </View>
          <CatalystDivider className="ml-5 w-auto" />
          <View className="min-h-14 flex-row items-center justify-between px-5 py-3">
            <CatalystText variant="subtitle" className="flex-1 text-[15px] font-semibold">他人の投稿を許可</CatalystText>
            <CatalystSwitch value={isAllowOthers} onValueChange={onChangeIsAllowOthers} />
          </View>
          </View>
        </View>

        {/* 公開設定 */}
        <View className="mt-6">
          <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
            公開設定
          </CatalystText>
          <View className="min-h-16 flex-row items-center bg-light-background px-5 py-3 dark:bg-dark-surface">
            <View className="mr-4 flex-1">
              <CatalystText variant="subtitle" className="text-[15px] font-semibold">
                公開アルバム
              </CatalystText>
              <CatalystText variant="caption" tone="muted">
                {isPublic ? "すべてのユーザーがこのアルバムを閲覧できます" : "自分のみがこのアルバムを閲覧できます"}
              </CatalystText>
            </View>
            <CatalystSwitch value={isPublic} onValueChange={onChangeIsPublic} />
          </View>
        </View>

        {footer}
      </ScrollView>

      {/* 条件追加シート */}
      <BottomSheetModal
        ref={addConditionSheetRef}
        snapPoints={["80%", "90%"]}
        index={1}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme === "dark" ? "#1C1C1E" : "#FFFFFF" }}
        handleIndicatorStyle={{ backgroundColor: theme === "dark" ? "#48484A" : "#C7C7CC" }}
      >
        <BottomSheetScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
          <CatalystText variant="subtitle">条件を追加</CatalystText>
          <CatalystText variant="caption" tone="muted">
            種類を選んで条件を1件ずつ追加します。
          </CatalystText>

          {/* 条件タイプ選択 */}
          <View className="gap-2">
            <CatalystText variant="label">条件タイプ</CatalystText>
            <View className="flex-row flex-wrap gap-2">
              {(["hashtag", "takenBy", "contest", "user"] as ConditionType[]).map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setConditionType(type)}
                  className={`rounded-full border px-3 py-1.5 ${
                    conditionType === type
                      ? "border-light-accent bg-light-accent dark:border-dark-accent dark:bg-dark-accent"
                      : "border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface"
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      conditionType === type
                        ? "font-medium text-light-accent-foreground dark:text-dark-accent-foreground"
                        : "text-light-text dark:text-dark-text"
                    }`}
                  >
                    {CONDITION_TYPE_LABELS[type]}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 値入力 */}
          <View className="gap-2">
            <CatalystText variant="label">値</CatalystText>
            <CatalystTextField
              value={conditionValue}
              onChangeText={setConditionValue}
              placeholder={CONDITION_PLACEHOLDERS[conditionType]}
              className="rounded-lg bg-light-surface p-3 dark:bg-dark-surface"
            />
          </View>

          {/* 除外条件トグル */}
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <CatalystText variant="label">除外条件にする</CatalystText>
              <CatalystText variant="caption" tone="muted" className="mt-0.5">
                この条件に一致する投稿を結果から除外します
              </CatalystText>
            </View>
            <CatalystSwitch value={conditionIsExclude} onValueChange={setConditionIsExclude} />
          </View>

          {/* 追加ボタン */}
          <CatalystButton
            onPress={handleAddCondition}
            disabled={!conditionValue.trim()}
            tone={conditionValue.trim() ? "primary" : "secondary"}
          >
            <CatalystButtonText>
              追加
            </CatalystButtonText>
          </CatalystButton>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </>
  );
};
