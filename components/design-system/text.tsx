import { cn } from "@/lib/utils";
import { Text as RNText } from "react-native";

type CatalystTextVariant = "body" | "title" | "subtitle" | "label" | "caption" | "mono";
type CatalystTextTone = "default" | "muted" | "subtle" | "accent" | "tint" | "danger" | "success";

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
  danger: "text-light-error dark:text-dark-error",
  success: "text-light-success dark:text-dark-success",
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
  return <RNText className={cn(variantClassName[variant], toneClassName[tone], className)} {...props} />;
};
