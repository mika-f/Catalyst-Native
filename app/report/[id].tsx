import { cn } from "@/lib/utils";
import { accountAtom } from "@/models/atoms/account";
import type { ReportRequest } from "@/models/sdk-types";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAtomValue } from "jotai";
import { Check } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, useColorScheme, View } from "react-native";

import "@/global.css";
import { KeyboardAwareScrollView } from "react-native-keyboard-controller";

const REPORT_OPTIONS: { value: ReportRequest["reason"]; label: string; description: string }[] = [
  {
    value: "nsfw",
    label: "性的・過激なコンテンツ",
    description: "センシティブまたは NSFW なコンテンツが含まれています",
  },
  { value: "harassment", label: "嫌がらせ・いじめ", description: "特定の人物への嫌がらせや攻撃的な内容です" },
  { value: "spam", label: "スパム", description: "不審なリンクや無関係な宣伝が含まれています" },
  { value: "tos_violation", label: "利用規約違反", description: "Catalyst の利用規約に違反していると思われます" },
  { value: "other", label: "その他", description: "上記に当てはまらないその他の問題です" },
];

export default function ReportStatusPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useColorScheme() ?? "light";
  const account = useAtomValue(accountAtom);

  const [reportType, setReportType] = useState<ReportRequest["reason"] | null>(null);
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = reportType !== null && !isSubmitting;

  const handleSubmit = useCallback(async () => {
    if (!account?.credential.client || !id || !reportType) return;
    setIsSubmitting(true);
    try {
      await account.credential.client.catalyst.v1.status.id.report.create({
        path: { id },
        body: {
          reason: reportType,
          description: reportDescription.trim() || undefined,
        },
        throwOnError: true,
      });
      router.back();
      Alert.alert("報告を送信しました", "ご報告ありがとうございます。内容は24時間以内に確認されます。");
    } catch {
      Alert.alert("エラー", "報告の送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  }, [account, id, reportType, reportDescription, router]);

  return (
    <>
      <Stack.Screen
        options={{
          title: "投稿を報告",
          headerBackTitle: "キャンセル",
          headerRight: () => (
            <Pressable onPress={handleSubmit} disabled={!canSubmit}>
              <Text
                className={cn(
                  "text-base font-semibold",
                  canSubmit
                    ? "text-light-error dark:text-dark-error"
                    : "text-light-text-subtle dark:text-dark-text-subtle",
                )}
              >
                送信
              </Text>
            </Pressable>
          ),
        }}
      />
      {isSubmitting && (
        <View className="absolute inset-0 z-50 items-center justify-center bg-light-overlay dark:bg-dark-overlay">
          <ActivityIndicator size="large" />
        </View>
      )}
      <View className="px-2 py-3">
        <KeyboardAwareScrollView bottomOffset={82}>
          <View className="flex gap-3">
            <View className="">
              <Text className="text-base font-semibold text-light-text dark:text-dark-text">報告の理由</Text>
              <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
                この投稿を報告する理由を選択してください
              </Text>
              <View className="gap-2">
                {REPORT_OPTIONS.map(({ value, label, description }) => (
                  <Pressable
                    key={value}
                    onPress={() => setReportType(value)}
                    className={cn(
                      "rounded-lg border px-4 py-3 gap-0.5",
                      reportType === value
                        ? "bg-light-error-background dark:bg-dark-error-background border-light-error dark:border-dark-error"
                        : "bg-light-surface dark:bg-dark-surface border-light-border dark:border-dark-border",
                    )}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text
                        className={cn(
                          "text-sm font-semibold",
                          reportType === value
                            ? "text-light-error-foreground dark:text-dark-error-foreground"
                            : "text-light-text dark:text-dark-text",
                        )}
                      >
                        {label}
                      </Text>
                      {reportType === value && <Check size={16} color={theme === "dark" ? "#ef4444" : "#dc2626"} />}
                    </View>
                    <Text
                      className={cn(
                        "text-xs",
                        reportType === value
                          ? "text-light-error-foreground/70 dark:text-dark-error-foreground/70"
                          : "text-light-text-muted dark:text-dark-text-muted",
                      )}
                    >
                      {description}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            <View className="h-px bg-light-divider dark:bg-dark-divider" />

            <View className="gap-3">
              <Text className="text-base font-semibold text-light-text dark:text-dark-text">詳細（任意）</Text>
              <Text className="text-xs text-light-text-muted dark:text-dark-text-muted">
                報告の詳細を入力すると、モデレーターが迅速に対応できます
              </Text>
              <TextInput
                value={reportDescription}
                onChangeText={setReportDescription}
                multiline
                placeholder="詳細を入力..."
                placeholderTextColor={theme === "dark" ? "#666" : "#999"}
                className="min-h-24 rounded-lg border border-light-border bg-light-surface p-3 text-base text-light-text dark:border-dark-border dark:bg-dark-surface dark:text-dark-text"
                textAlignVertical="top"
              />
            </View>
          </View>
        </KeyboardAwareScrollView>
      </View>
    </>
  );
}
