export type CatalystSize = "sm" | "md" | "lg";
export type CatalystTone = "primary" | "secondary" | "ghost" | "tint" | "danger";
export type CatalystBadgeTone = "neutral" | "accent" | "success" | "warning" | "danger" | "info";

export const catalystButtonBase =
  "shrink-0 flex-row items-center justify-center gap-2 rounded-lg active:opacity-80 disabled:opacity-50";

export const catalystButtonTone: Record<CatalystTone, string> = {
  primary: "bg-light-accent dark:bg-dark-accent",
  secondary: "bg-light-surface-muted dark:bg-dark-surface-muted",
  ghost: "bg-transparent",
  tint: "bg-light-tint dark:bg-dark-tint",
  danger: "bg-light-error dark:bg-dark-error",
};

export const catalystButtonTextTone: Record<CatalystTone, string> = {
  primary: "text-light-accent-foreground dark:text-dark-accent-foreground",
  secondary: "text-light-text dark:text-dark-text",
  ghost: "text-light-text dark:text-dark-text",
  tint: "text-light-tint-foreground dark:text-dark-tint-foreground",
  danger: "text-light-tint-foreground dark:text-dark-tint-foreground",
};

export const catalystButtonSize: Record<CatalystSize, string> = {
  sm: "min-h-9 px-3",
  md: "min-h-11 px-4",
  lg: "min-h-12 px-5",
};

export const catalystButtonTextSize: Record<CatalystSize, string> = {
  sm: "text-sm",
  md: "text-sm",
  lg: "text-base",
};

export const catalystIconButtonSize: Record<CatalystSize, string> = {
  sm: "size-9",
  md: "size-11",
  lg: "size-12",
};

export const catalystIconSize: Record<CatalystSize, number> = {
  sm: 18,
  md: 20,
  lg: 22,
};

export const catalystBadgeTone: Record<CatalystBadgeTone, string> = {
  neutral: "bg-light-surface-muted dark:bg-dark-surface-muted",
  accent: "bg-light-toggle dark:bg-dark-toggle",
  success: "bg-light-success-background dark:bg-dark-success-background",
  warning: "bg-light-warning-background dark:bg-dark-warning-background",
  danger: "bg-light-error-background dark:bg-dark-error-background",
  info: "bg-light-info-background dark:bg-dark-info-background",
};

export const catalystBadgeTextTone: Record<CatalystBadgeTone, string> = {
  neutral: "text-light-text-muted dark:text-dark-text-muted",
  accent: "text-light-toggle-foreground dark:text-dark-toggle-foreground",
  success: "text-light-success-foreground dark:text-dark-success-foreground",
  warning: "text-light-warning-foreground dark:text-dark-warning-foreground",
  danger: "text-light-error-foreground dark:text-dark-error-foreground",
  info: "text-light-info-foreground dark:text-dark-info-foreground",
};
