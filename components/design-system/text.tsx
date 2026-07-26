import { cn } from "@/lib/utils";
import { boostTextContrastAtom } from "@/models/atoms/accessibility";
import { useAtomValue } from "jotai";
import { Text as RNText } from "react-native";

type CatalystTextVariant = "body" | "title" | "subtitle" | "label" | "caption" | "mono";
type CatalystTextTone = "default" | "muted" | "subtle" | "accent" | "tint" | "link" | "danger" | "success";

const variantClassName: Record<CatalystTextVariant, string> = {
  body: "text-sm",
  title: "text-lg font-bold",
  subtitle: "text-base font-semibold",
  label: "text-sm font-semibold",
  caption: "text-xs",
  mono: "font-mono text-xs",
};

const toneClassName: Record<CatalystTextTone, string> = {
  default: "text-light-text dark:text-dark-text",
  muted: "text-light-text-muted dark:text-dark-text-muted",
  subtle: "text-light-text-subtle dark:text-dark-text-subtle",
  accent: "text-light-accent dark:text-dark-accent",
  tint: "text-light-tint dark:text-dark-tint",
  link: "text-light-link dark:text-dark-link",
  danger: "text-light-error dark:text-dark-error",
  success: "text-light-success dark:text-dark-success",
};

// アクセシビリティ設定「文字のコントラストを上げる」が有効なときに使う色。
// 補助的なトーン (muted / subtle) を 1 段階濃い色に寄せて可読性を上げる
const boostedToneClassName: Record<CatalystTextTone, string> = {
  ...toneClassName,
  muted: "text-light-text dark:text-dark-text",
  subtle: "text-light-text-muted dark:text-dark-text-muted",
};

export type CatalystTextProps = React.ComponentProps<typeof RNText> & {
  variant?: CatalystTextVariant;
  tone?: CatalystTextTone;
};

export const CatalystText = ({
  className,
  variant = "body",
  tone = "default",
  ...props
}: CatalystTextProps) => {
  const boostContrast = useAtomValue(boostTextContrastAtom);
  const tones = boostContrast ? boostedToneClassName : toneClassName;

  return <RNText className={cn(variantClassName[variant], tones[tone], className)} {...props} />;
};
