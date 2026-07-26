import { hapticsEnabledAtom } from "@/models/atoms/accessibility";
import * as Haptics from "expo-haptics";
import { useAtomValue } from "jotai";
import { useMemo } from "react";

export type CatalystHaptics = {
  impact: (style?: Haptics.ImpactFeedbackStyle) => void;
  notification: (type?: Haptics.NotificationFeedbackType) => void;
};

/**
 * アクセシビリティ設定の「触覚フィードバック」に従う Haptics のラッパー。
 * 設定がオフのときは何もしない。
 */
export function useHaptics(): CatalystHaptics {
  const isEnabled = useAtomValue(hapticsEnabledAtom);

  return useMemo(
    () => ({
      impact: (style = Haptics.ImpactFeedbackStyle.Light) => {
        if (!isEnabled) return;
        Haptics.impactAsync(style);
      },
      notification: (type = Haptics.NotificationFeedbackType.Success) => {
        if (!isEnabled) return;
        Haptics.notificationAsync(type);
      },
    }),
    [isEnabled],
  );
}
