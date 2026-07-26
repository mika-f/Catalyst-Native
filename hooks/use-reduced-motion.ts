import { reduceMotionPreferenceAtom, systemReduceMotionAtom } from "@/models/atoms/accessibility";
import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * OS のアクセシビリティ設定 (iOS: 視差効果を減らす / Android: アニメーションの削除) を
 * 購読して atom に反映する。アプリ全体で 1 回だけ (ルートレイアウトで) 呼び出すこと。
 */
export function useSystemReducedMotionSync(): void {
  const setSystemReduceMotion = useSetAtom(systemReduceMotionAtom);

  useEffect(() => {
    let isMounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) setSystemReduceMotion(enabled);
    });

    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
      setSystemReduceMotion(enabled);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [setSystemReduceMotion]);
}

/**
 * アプリの「動きを減らす」設定と OS 設定を合成した、実際に適用すべき値を返す。
 * アニメーションの長さや Spring の有無を切り替える用途で使う。
 */
export function useReducedMotion(): boolean {
  const preference = useAtomValue(reduceMotionPreferenceAtom);
  const systemReduceMotion = useAtomValue(systemReduceMotionAtom);

  if (preference === "on") return true;
  if (preference === "off") return false;

  return systemReduceMotion;
}
