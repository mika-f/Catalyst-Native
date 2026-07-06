import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
import { cn } from "@/lib/utils";
import { accountAtom } from "@/models/atoms/account";
import { streamingEnabledAtom } from "@/models/atoms/streaming";
import {
  PUSH_NOTIFICATION_TYPES,
  getAuthorizationStatus,
  getFcmToken,
  loadEnabledTypes,
  loadPushEnabled,
  loadSavedFcmToken,
  onTokenRefresh,
  openSystemSettings,
  registerTokenToBackend,
  requestAuthorization,
  saveEnabledTypes,
  saveFcmToken,
  savePushEnabled,
  showPermissionDeniedAlert,
  unregisterTokenFromBackend,
} from "@/models/notification-settings";
import { saveStreamingEnabled } from "@/models/streaming-settings";
import { useAtom, useAtomValue } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, Switch, Text, View } from "react-native";

export default function NotificationSettingsPage() {
  const account = useAtomValue(accountAtom);
  const isLoggedIn = !!account;

  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [authStatus, setAuthStatus] = useState<string>("notDetermined");
  const [enabledTypes, setEnabledTypes] = useState<Set<string>>(new Set());
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreamingEnabled, setIsStreamingEnabled] = useAtom(streamingEnabledAtom);

  // 初期化
  useAsyncOneTimeEffect(async () => {
    try {
      const [pushEnabled, types, status, savedToken] = await Promise.all([
        loadPushEnabled(),
        loadEnabledTypes(),
        getAuthorizationStatus(),
        loadSavedFcmToken(),
      ]);

      setIsPushEnabled(pushEnabled);
      setEnabledTypes(types);
      setAuthStatus(status);
      setFcmToken(savedToken);
    } finally {
      setIsLoading(false);
    }
  });

  // FCMトークンのリフレッシュを監視
  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    onTokenRefresh(async (token) => {
      setFcmToken(token);
      await saveFcmToken(token);
      if (isPushEnabled && account) {
        await registerTokenToBackend(token, account.credential.accessToken);
      }
    }).then((unsub) => {
      unsubscribe = unsub;
    });

    return () => {
      unsubscribe?.();
    };
  }, [isPushEnabled, account]);

  const isEffectivelyEnabled = isPushEnabled && (authStatus === "authorized" || authStatus === "provisional");

  // Push通知トグル
  const handlePushToggle = useCallback(
    async (newValue: boolean) => {
      if (!isLoggedIn) return;

      if (newValue) {
        // ONにする場合
        if (authStatus === "authorized" || authStatus === "provisional") {
          // 既に許可済み
          setIsPushEnabled(true);
          await savePushEnabled(true);
          const token = await getFcmToken();
          if (token && account) {
            setFcmToken(token);
            await saveFcmToken(token);
            await registerTokenToBackend(token, account.credential.accessToken);
          }
        } else if (authStatus === "denied") {
          // 拒否済み → 設定画面へ誘導
          showPermissionDeniedAlert();
        } else {
          // 未決定 → 許可リクエスト
          const granted = await requestAuthorization();
          const newStatus = await getAuthorizationStatus();
          setAuthStatus(newStatus);

          if (granted) {
            setIsPushEnabled(true);
            await savePushEnabled(true);
            const token = await getFcmToken();
            if (token && account) {
              setFcmToken(token);
              await saveFcmToken(token);
              await registerTokenToBackend(token, account.credential.accessToken);
            }
          }
        }
      } else {
        // OFFにする場合
        setIsPushEnabled(false);
        await savePushEnabled(false);
        const savedToken = await loadSavedFcmToken();
        if (savedToken && account) {
          await unregisterTokenFromBackend(savedToken, account.credential.accessToken);
        }
      }
    },
    [isLoggedIn, authStatus, account],
  );

  // 通知タイプのトグル
  const handleTypeToggle = useCallback(
    async (key: string, newValue: boolean) => {
      const newTypes = new Set(enabledTypes);
      if (newValue) {
        newTypes.add(key);
      } else {
        newTypes.delete(key);
      }
      setEnabledTypes(newTypes);
      await saveEnabledTypes(newTypes);
    },
    [enabledTypes],
  );

  const handleStreamingToggle = useCallback(
    async (newValue: boolean) => {
      if (!isLoggedIn) return;

      setIsStreamingEnabled(newValue);
      await saveStreamingEnabled(newValue);
    },
    [isLoggedIn, setIsStreamingEnabled],
  );

  const footerText = (() => {
    if (!isLoggedIn) return "ログインするとPush通知を受け取ることができます。";
    if (authStatus === "denied") return null; // 「設定を開く」ボタンを表示
    if (isPushEnabled && !fcmToken) return "通知の設定中です...";
    if (isPushEnabled) return "通知を受け取る準備ができました。";
    return "通知をオンにすると、重要な情報をすぐに確認できます。";
  })();

  if (isLoading) {
    return <View className="flex-1" />;
  }

  return (
    <ScrollView className="flex-1" contentContainerClassName="pb-8">
      {/* セクション1: 全体設定 */}
      <View className="mt-4 mx-4">
        <Text className="px-4 pb-1.5 text-xs text-light-gray dark:text-dark-gray uppercase">通知設定</Text>
        <View className="rounded-xl bg-light-surface dark:bg-dark-surface overflow-hidden">
          <View className="px-4 py-3 flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-base text-light-text dark:text-dark-text">Push通知</Text>
              {isPushEnabled && <Text className="text-xs text-light-gray dark:text-dark-gray mt-1">有効</Text>}
            </View>
            <Switch value={isPushEnabled} onValueChange={handlePushToggle} disabled={!isLoggedIn} />
          </View>
        </View>

        {/* フッター */}
        {authStatus === "denied" && isLoggedIn ? (
          <View className="px-4 pt-1.5">
            <Pressable onPress={openSystemSettings}>
              <Text className="text-sm text-light-tint dark:text-dark-tint">設定を開く</Text>
            </Pressable>
            <Text className="text-xs text-orange-500 mt-1">
              通知がオフになっています。端末の設定から通知を有効にしてください。
            </Text>
          </View>
        ) : footerText ? (
          <Text className="px-4 pt-1.5 text-xs text-light-gray dark:text-dark-gray">{footerText}</Text>
        ) : null}
      </View>

      <View className="mt-6 mx-4">
        <Text className="px-4 pb-1.5 text-xs text-light-gray dark:text-dark-gray uppercase">リアルタイム更新</Text>
        <View className="rounded-xl bg-light-surface dark:bg-dark-surface overflow-hidden">
          <View className="px-4 py-3 flex-row items-center justify-between">
            <View className="flex-1 mr-3">
              <Text className="text-base text-light-text dark:text-dark-text">ストリーミング接続</Text>
              <Text className="text-xs text-light-gray dark:text-dark-gray mt-1">
                投稿のリアクションを開いている間に自動更新します
              </Text>
            </View>
            <Switch value={isStreamingEnabled} onValueChange={handleStreamingToggle} disabled={!isLoggedIn} />
          </View>
        </View>
        <Text className="px-4 pt-1.5 text-xs text-light-gray dark:text-dark-gray">
          streaming.natsuneko.com への WebSocket 接続を使用します。
        </Text>
      </View>

      {/* セクション2: 通知タイプ別設定 */}
      {isPushEnabled && (
        <View className="mt-6 mx-4">
          <Text className="px-4 pb-1.5 text-xs text-light-gray dark:text-dark-gray uppercase">通知の種類</Text>
          <View className="rounded-xl bg-white dark:bg-neutral-800 overflow-hidden">
            {PUSH_NOTIFICATION_TYPES.map((type, index) => (
              <View
                key={type.key}
                className={cn(
                  "px-4 py-3 flex-row items-center justify-between",
                  index < PUSH_NOTIFICATION_TYPES.length - 1 && "border-b border-light-border dark:border-dark-border",
                )}
              >
                <View className="flex-1 mr-3">
                  <Text className="text-base text-light-text dark:text-dark-text">{type.displayName}</Text>
                  <Text className="text-xs text-light-gray dark:text-dark-gray mt-1">{type.description}</Text>
                </View>
                <Switch
                  value={enabledTypes.has(type.key)}
                  onValueChange={(v) => handleTypeToggle(type.key, v)}
                  disabled={!isEffectivelyEnabled}
                />
              </View>
            ))}
          </View>
          <Text className="px-4 pt-1.5 text-xs text-light-gray dark:text-dark-gray">
            受け取りたい通知の種類を選択してください。
          </Text>
        </View>
      )}

      {/* デバッグ情報 */}
      {__DEV__ && (
        <View className="mt-6 mx-4">
          <Text className="px-4 pb-1.5 text-xs text-light-gray dark:text-dark-gray uppercase">デバッグ情報</Text>
          <View className="rounded-xl bg-white dark:bg-neutral-800 overflow-hidden">
            <View className="px-4 py-3 flex-row items-center justify-between border-b border-light-border dark:border-dark-border">
              <Text className="text-sm text-light-gray dark:text-dark-gray">システム許可状態</Text>
              <Text className="text-sm text-light-gray dark:text-dark-gray">
                {authStatus === "notDetermined"
                  ? "未決定"
                  : authStatus === "denied"
                    ? "拒否"
                    : authStatus === "authorized"
                      ? "許可"
                      : "暫定許可"}
              </Text>
            </View>
            <View className="px-4 py-3">
              {fcmToken ? (
                <View>
                  <Text className="text-xs text-light-gray dark:text-dark-gray mb-1">FCMトークン</Text>
                  <Text className="text-xs text-light-gray dark:text-dark-gray font-mono" selectable>
                    {fcmToken}
                  </Text>
                </View>
              ) : (
                <Text className="text-xs text-light-gray dark:text-dark-gray">FCMトークン: 未取得</Text>
              )}
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
