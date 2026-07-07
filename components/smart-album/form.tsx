import { CatalystSwitch } from "@/components/design-system";
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
import { Platform, Pressable, ScrollView, Text, TextInput, View, useColorScheme } from "react-native";
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
      <ScrollView className="flex-1" contentContainerClassName="p-4 gap-6">
        {/* 基本情報 */}
        <View className="gap-3">
          <Text className="text-base font-semibold text-light-text dark:text-dark-text">基本情報</Text>
          <TextInput
            value={title}
            onChangeText={onChangeTitle}
            placeholder="タイトル"
            placeholderTextColor={theme === "dark" ? "#666" : "#999"}
            className="rounded-lg border border-light-border bg-light-surface p-3 text-base text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
            style={Platform.OS === "ios" ? { lineHeight: undefined } : undefined}
          />
          <TextInput
            value={description}
            onChangeText={onChangeDescription}
            multiline
            placeholder="説明（任意）"
            placeholderTextColor={theme === "dark" ? "#666" : "#999"}
            className="min-h-25 rounded-lg border border-light-border bg-light-surface p-3 text-base text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
            textAlignVertical="top"
          />
        </View>

        <View className="h-px bg-light-divider dark:bg-dark-divider" />

        {/* 条件 */}
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-base font-semibold text-light-text dark:text-dark-text">条件</Text>
              <Text className="mt-1 text-xs text-light-text-muted dark:text-dark-text-muted">
                登録された条件で投稿を収集します（最大{MAX_CONDITIONS}件）
              </Text>
            </View>
            <Pressable
              onPress={openAddConditionSheet}
              disabled={conditions.length >= MAX_CONDITIONS}
              className={`flex-row items-center gap-1.5 rounded-lg border px-3 py-2 ${
                conditions.length >= MAX_CONDITIONS
                  ? "border-light-border bg-light-surface-muted opacity-50 dark:border-dark-border dark:bg-dark-surface-muted"
                  : "border-light-border bg-light-surface dark:border-dark-border dark:bg-dark-surface"
              }`}
            >
              <UniPlus size={14} className="text-light-text dark:text-dark-text" />
              <Text className="text-sm text-light-text dark:text-dark-text">条件を追加</Text>
            </Pressable>
          </View>

          {conditions.length === 0 ? (
            <View className="rounded-lg border border-dashed border-light-border p-4 dark:border-dark-border">
              <Text className="text-center text-sm text-light-text-muted dark:text-dark-text-muted">
                条件がありません。追加してください。
              </Text>
            </View>
          ) : (
            <View className="gap-2">
              {conditions.map((condition) => (
                <View
                  key={condition.id}
                  className="flex-row items-center justify-between rounded-lg border border-light-border bg-light-surface p-3 dark:border-dark-border dark:bg-dark-surface"
                >
                  <View className="flex-1 flex-row items-center gap-2">
                    {condition.isExclude && (
                      <View className="rounded px-2 py-0.5 bg-light-error-background dark:bg-dark-error-background">
                        <Text className="text-xs font-medium text-light-error-foreground dark:text-dark-error-foreground">
                          除外
                        </Text>
                      </View>
                    )}
                    <View className="rounded px-2 py-0.5 bg-light-surface-muted dark:bg-dark-surface-muted">
                      <Text className="text-xs font-medium text-light-text-muted dark:text-dark-text-muted">
                        {CONDITION_TYPE_BADGE[condition.type]}
                      </Text>
                    </View>
                    <Text className="flex-1 text-sm text-light-text dark:text-dark-text" numberOfLines={1}>
                      {condition.value}
                    </Text>
                  </View>
                  <Pressable onPress={() => handleRemoveCondition(condition.id)} className="p-1">
                    <UniX size={16} className="text-light-text-muted dark:text-dark-text-muted" />
                  </Pressable>
                </View>
              ))}
            </View>
          )}
        </View>

        <View className="h-px bg-light-divider dark:bg-dark-divider" />

        {/* 期間設定 */}
        <View className="gap-3">
          <Text className="text-base font-semibold text-light-text dark:text-dark-text">期間設定</Text>
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-light-text dark:text-dark-text">開始日時を設定</Text>
            <CatalystSwitch value={since !== null} onValueChange={(enabled) => onChangeSince(enabled ? now : null)} />
          </View>
          {since !== null &&
            (Platform.OS === "ios" ? (
              <DateTimePicker
                value={new Date(since)}
                mode="datetime"
                display="compact"
                onChange={(_, date) => date && onChangeSince(date.toISOString())}
              />
            ) : (
              <Pressable
                onPress={() => openAndroidDateTimePicker(since, onChangeSince)}
                className="rounded-lg border border-light-border bg-light-surface p-3 dark:border-dark-border dark:bg-dark-surface"
              >
                <Text className="text-base text-light-text dark:text-dark-text">
                  {dayjs(since).format("YYYY/MM/DD HH:mm")}
                </Text>
              </Pressable>
            ))}
          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-light-text dark:text-dark-text">終了日時を設定</Text>
            <CatalystSwitch value={until !== null} onValueChange={(enabled) => onChangeUntil(enabled ? now : null)} />
          </View>
          {until !== null &&
            (Platform.OS === "ios" ? (
              <DateTimePicker
                value={new Date(until)}
                mode="datetime"
                display="compact"
                onChange={(_, date) => date && onChangeUntil(date.toISOString())}
              />
            ) : (
              <Pressable
                onPress={() => openAndroidDateTimePicker(until, onChangeUntil)}
                className="rounded-lg border border-light-border bg-light-surface p-3 dark:border-dark-border dark:bg-dark-surface"
              >
                <Text className="text-base text-light-text dark:text-dark-text">
                  {dayjs(until).format("YYYY/MM/DD HH:mm")}
                </Text>
              </Pressable>
            ))}
        </View>

        <View className="h-px bg-light-divider dark:bg-dark-divider" />

        {/* 表示モード */}
        <View className="gap-3">
          <Text className="text-base font-semibold text-light-text dark:text-dark-text">表示モード</Text>
          <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
            アルバム内の投稿の表示方法を選択します
          </Text>
          <View className="flex-row overflow-hidden rounded-lg border border-light-border dark:border-dark-border">
            {DISPLAY_MODE_OPTIONS.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => onChangeDisplayMode(option.value)}
                className={`flex-1 items-center py-2 ${
                  displayMode === option.value
                    ? "bg-light-accent dark:bg-dark-accent"
                    : "bg-light-surface dark:bg-dark-surface"
                }`}
              >
                <Text
                  className={`text-xs font-medium ${
                    displayMode === option.value
                      ? "text-light-accent-foreground dark:text-dark-accent-foreground"
                      : "text-light-text dark:text-dark-text"
                  }`}
                >
                  {option.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View className="h-px bg-light-divider dark:bg-dark-divider" />

        {/* 投稿設定 */}
        <View className="gap-3">
          <Text className="text-base font-semibold text-light-text dark:text-dark-text">投稿設定</Text>
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 text-sm text-light-text dark:text-dark-text">NSFWコンテンツを許可</Text>
            <CatalystSwitch value={isAllowNsfw} onValueChange={onChangeIsAllowNsfw} />
          </View>
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 text-sm text-light-text dark:text-dark-text">他人の投稿を許可</Text>
            <CatalystSwitch value={isAllowOthers} onValueChange={onChangeIsAllowOthers} />
          </View>
        </View>

        <View className="h-px bg-light-divider dark:bg-dark-divider" />

        {/* 公開設定 */}
        <View className="gap-3">
          <Text className="text-base font-semibold text-light-text dark:text-dark-text">公開設定</Text>
          <View className="flex-row items-center justify-between">
            <Text className="flex-1 text-sm text-light-text dark:text-dark-text">公開アルバム</Text>
            <CatalystSwitch value={isPublic} onValueChange={onChangeIsPublic} />
          </View>
          <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
            {isPublic ? "すべてのユーザーがこのアルバムを閲覧できます" : "自分のみがこのアルバムを閲覧できます"}
          </Text>
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
          <Text className="text-base font-semibold text-light-text dark:text-dark-text">条件を追加</Text>
          <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
            種類を選んで条件を1件ずつ追加します。
          </Text>

          {/* 条件タイプ選択 */}
          <View className="gap-2">
            <Text className="text-sm font-medium text-light-text dark:text-dark-text">条件タイプ</Text>
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
            <Text className="text-sm font-medium text-light-text dark:text-dark-text">値</Text>
            <TextInput
              // value={conditionValue}
              onChangeText={setConditionValue}
              placeholder={CONDITION_PLACEHOLDERS[conditionType]}
              placeholderTextColor={theme === "dark" ? "#666" : "#999"}
              className="rounded-lg border border-light-border bg-light-surface p-3 text-base text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
              style={Platform.OS === "ios" ? { lineHeight: undefined } : undefined}
            />
          </View>

          {/* 除外条件トグル */}
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-sm font-medium text-light-text dark:text-dark-text">除外条件にする</Text>
              <Text className="mt-0.5 text-xs text-light-text-muted dark:text-dark-text-muted">
                この条件に一致する投稿を結果から除外します
              </Text>
            </View>
            <CatalystSwitch value={conditionIsExclude} onValueChange={setConditionIsExclude} />
          </View>

          {/* 追加ボタン */}
          <Pressable
            onPress={handleAddCondition}
            disabled={!conditionValue.trim()}
            className={`items-center rounded-lg p-3 ${
              conditionValue.trim()
                ? "bg-light-accent dark:bg-dark-accent"
                : "bg-light-surface-muted opacity-50 dark:bg-dark-surface-muted"
            }`}
          >
            <Text
              className={`text-base font-semibold ${
                conditionValue.trim()
                  ? "text-light-accent-foreground dark:text-dark-accent-foreground"
                  : "text-light-text-muted dark:text-dark-text-muted"
              }`}
            >
              追加
            </Text>
          </Pressable>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </>
  );
};
