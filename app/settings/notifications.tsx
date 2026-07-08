import {
  CatalystDivider,
  CatalystListItemContent,
  CatalystSwitch,
  CatalystText,
} from "@/components/design-system";
import { useAsyncOneTimeEffect } from "@/hooks/use-async-one-time-effect";
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
import { Pressable, ScrollView, View } from "react-native";

export default function NotificationSettingsPage() {
  const account = useAtomValue(accountAtom);
  const isLoggedIn = !!account;

  const [isPushEnabled, setIsPushEnabled] = useState(false);
  const [authStatus, setAuthStatus] = useState<string>("notDetermined");
  const [enabledTypes, setEnabledTypes] = useState<Set<string>>(new Set());
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStreamingEnabled, setIsStreamingEnabled] =
    useAtom(streamingEnabledAtom);

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

  const isEffectivelyEnabled =
    isPushEnabled &&
    (authStatus === "authorized" || authStatus === "provisional");

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
              await registerTokenToBackend(
                token,
                account.credential.accessToken,
              );
            }
          }
        }
      } else {
        // OFFにする場合
        setIsPushEnabled(false);
        await savePushEnabled(false);
        const savedToken = await loadSavedFcmToken();
        if (savedToken && account) {
          await unregisterTokenFromBackend(
            savedToken,
            account.credential.accessToken,
          );
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
    return (
      <View className="flex-1 bg-light-surface-muted dark:bg-dark-background" />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-light-surface-muted dark:bg-dark-background"
      contentContainerClassName="pb-8"
    >
      {/* セクション1: 全体設定 */}
      <View className="pt-2">
        <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
          通知設定
        </CatalystText>
        <View className="bg-light-background dark:bg-dark-surface">
          <View className="min-h-16 flex-row items-center px-5 py-3">
            <CatalystListItemContent className="mr-3">
              <CatalystText
                variant="subtitle"
                className="text-[15px] font-semibold"
              >
                Push通知
              </CatalystText>
              {
                <CatalystText variant="caption" tone="muted">
                  {isPushEnabled
                    ? "通知を受け取ります"
                    : "通知を受け取りません"}
                </CatalystText>
              }
            </CatalystListItemContent>
            <CatalystSwitch
              value={isPushEnabled}
              onValueChange={handlePushToggle}
              disabled={!isLoggedIn}
            />
          </View>
        </View>

        {/* フッター */}
        {authStatus === "denied" && isLoggedIn ? (
          <View className="px-5 pt-2">
            <Pressable onPress={openSystemSettings}>
              <CatalystText variant="label" tone="tint">
                設定を開く
              </CatalystText>
            </Pressable>
            <CatalystText
              variant="caption"
              tone="danger"
              className="mt-1 leading-4"
            >
              通知がオフになっています。端末の設定から通知を有効にしてください。
            </CatalystText>
          </View>
        ) : footerText ? (
          <CatalystText
            variant="caption"
            tone="subtle"
            className="px-5 pt-2 leading-4"
          >
            {footerText}
          </CatalystText>
        ) : null}
      </View>

      {/* セクション2: 通知タイプ別設定 */}
      {
        <View className="mt-6">
          <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
            通知の種類
          </CatalystText>
          <View className="bg-light-background dark:bg-dark-surface">
            {PUSH_NOTIFICATION_TYPES.map((type, index) => (
              <View key={type.key}>
                <View className="min-h-16 flex-row items-center px-5 py-3">
                  <CatalystListItemContent className="mr-3">
                    <CatalystText
                      variant="subtitle"
                      className="text-[15px] font-semibold"
                    >
                      {type.displayName}
                    </CatalystText>
                    <CatalystText variant="caption" tone="muted">
                      {type.description}
                    </CatalystText>
                  </CatalystListItemContent>
                  <CatalystSwitch
                    value={enabledTypes.has(type.key)}
                    onValueChange={(v) => handleTypeToggle(type.key, v)}
                    disabled={!isEffectivelyEnabled}
                  />
                </View>
                {index < PUSH_NOTIFICATION_TYPES.length - 1 && (
                  <CatalystDivider className="ml-5 w-auto" />
                )}
              </View>
            ))}
          </View>
          <CatalystText
            variant="caption"
            tone="subtle"
            className="px-5 pt-2 leading-4"
          >
            受け取りたい通知の種類を選択してください。
          </CatalystText>
        </View>
      }

      <View className="mt-6">
        <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
          リアルタイム更新
        </CatalystText>
        <View className="bg-light-background dark:bg-dark-surface">
          <View className="min-h-16 flex-row items-center px-5 py-3">
            <CatalystListItemContent className="mr-3">
              <CatalystText
                variant="subtitle"
                className="text-[15px] font-semibold"
              >
                ストリーミング接続
              </CatalystText>
              <CatalystText variant="caption" tone="muted">
                投稿のリアクションを開いている間に自動更新します
              </CatalystText>
            </CatalystListItemContent>
            <CatalystSwitch
              value={isStreamingEnabled}
              onValueChange={handleStreamingToggle}
              disabled={!isLoggedIn}
            />
          </View>
        </View>
        <CatalystText
          variant="caption"
          tone="subtle"
          className="px-5 pt-2 leading-4"
        >
          streaming.natsuneko.com への WebSocket 接続を使用します。
        </CatalystText>
      </View>

      {/* デバッグ情報 */}
      {__DEV__ && (
        <View className="mt-6">
          <CatalystText variant="caption" tone="subtle" className="px-5 pb-2">
            デバッグ情報
          </CatalystText>
          <View className="bg-light-background dark:bg-dark-surface">
            <View className="flex-row items-center justify-between px-5 py-3">
              <CatalystText tone="muted">システム許可状態</CatalystText>
              <CatalystText tone="muted">
                {authStatus === "notDetermined"
                  ? "未決定"
                  : authStatus === "denied"
                    ? "拒否"
                    : authStatus === "authorized"
                      ? "許可"
                      : "暫定許可"}
              </CatalystText>
            </View>
            <CatalystDivider className="ml-5 w-auto" />
            <View className="px-5 py-3">
              {fcmToken ? (
                <View>
                  <CatalystText variant="caption" tone="muted" className="mb-1">
                    FCMトークン
                  </CatalystText>
                  <CatalystText variant="mono" tone="muted" selectable>
                    {fcmToken}
                  </CatalystText>
                </View>
              ) : (
                <CatalystText variant="caption" tone="muted">
                  FCMトークン: 未取得
                </CatalystText>
              )}
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}
