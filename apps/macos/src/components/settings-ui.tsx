import { cn } from "cn";
import { Check, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react-native";
import { Children, isValidElement } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, Switch, Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { useHover } from "./ui";

const UniCheck = withUniwind(Check);
const UniChevronLeft = withUniwind(ChevronLeft);
const UniChevronRight = withUniwind(ChevronRight);
const UniExternalLink = withUniwind(ExternalLink);

const ICON = "text-light-icon dark:text-dark-icon";
const TITLE = "text-[13px] font-medium text-light-text dark:text-dark-text";
const DETAIL = "text-xs leading-4 text-light-text-muted dark:text-dark-text-muted";

export type SettingsPageProps = {
  onBack?: () => void;
};

export const confirm = (title: string, message: string | undefined, confirmLabel: string, destructive = false) =>
  new Promise<boolean>((resolve) => {
    Alert.alert(title, message, [
      { text: "キャンセル", style: "cancel", onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? "destructive" : "default",
        onPress: () => resolve(true),
      },
    ]);
  });

const BackButton = ({ onPress }: { onPress: () => void }) => {
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="設定の一覧"
      focusable
      className={cn(
        "flex-row items-center gap-0.5 self-start rounded-md px-1 py-0.5",
        hovered && "bg-light-overlay dark:bg-dark-overlay",
      )}
      onPress={onPress}
      {...hoverProps}
    >
      <UniChevronLeft size={16} className="text-light-tint dark:text-dark-tint" />
      <Text className="text-[13px] text-light-tint dark:text-dark-tint">設定</Text>
    </Pressable>
  );
};

const SettingsHeading = ({ title, onBack }: SettingsPageProps & { title: string }) => (
  <View className="gap-2">
    {onBack && <BackButton onPress={onBack} />}
    <Text accessibilityRole="header" className="text-[26px] font-bold text-light-text dark:text-dark-text">
      {title}
    </Text>
  </View>
);

export const SettingsPage = ({
  title,
  onBack,
  scroll = true,
  children,
}: SettingsPageProps & { title: string; scroll?: boolean; children: React.ReactNode }) => {
  if (!scroll) {
    return (
      <View className="flex-1 bg-light-surface-muted dark:bg-dark-background">
        <View className="w-full max-w-[720px] px-8 pt-5 pb-2">
          <SettingsHeading title={title} onBack={onBack} />
        </View>
        {children}
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-light-surface-muted dark:bg-dark-background"
      contentContainerClassName="w-full max-w-[720px] gap-6 px-8 pt-5 pb-12"
    >
      <SettingsHeading title={title} onBack={onBack} />
      {children}
    </ScrollView>
  );
};

type GroupProps = {
  title?: string;
  footer?: string;
  footerTone?: "subtle" | "danger";
  children: React.ReactNode;
};

export const SettingsGroup = ({ title, footer, footerTone = "subtle", children }: GroupProps) => {
  const rows = Children.toArray(children).filter(Boolean);
  if (rows.length === 0) return null;

  return (
    <View className="gap-1.5">
      {title && <Text className="px-1 text-xs font-medium text-light-text-muted dark:text-dark-text-muted">{title}</Text>}
      <View className="overflow-hidden rounded-xl border-hairline border-light-divider bg-light-background dark:border-dark-divider dark:bg-dark-surface">
        {rows.map((row, index) => (
          <View key={isValidElement(row) && row.key != null ? String(row.key) : index}>
            {index > 0 && <View className="ml-4 h-hairline bg-light-divider dark:bg-dark-divider" />}
            {row}
          </View>
        ))}
      </View>
      {footer && (
        <Text
          className={cn(
            "px-1 text-xs leading-4",
            footerTone === "danger"
              ? "text-light-error dark:text-dark-error"
              : "text-light-text-subtle dark:text-dark-text-subtle",
          )}
        >
          {footer}
        </Text>
      )}
    </View>
  );
};

const RowBody = ({ title, description }: { title: string; description?: string }) => (
  <View className="flex-1 gap-0.5">
    <Text className={TITLE}>{title}</Text>
    {description && <Text className={DETAIL}>{description}</Text>}
  </View>
);

type SwitchProps = {
  title: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

export const SettingsSwitch = ({ title, description, value, onValueChange, disabled }: SwitchProps) => {
  return (
    <View className={cn("min-h-14 flex-row items-center gap-4 px-4 py-3", disabled && "opacity-50")}>
      <RowBody title={title} description={description} />
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColorOnClassName="accent-light-accent dark:accent-dark-accent"
        trackColorOffClassName="accent-light-border dark:accent-dark-border"
      />
    </View>
  );
};

type OptionProps = {
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
};

export const SettingsOption = ({ title, description, selected, onPress }: OptionProps) => {
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      focusable
      className={cn(
        "min-h-14 flex-row items-center gap-3 px-4 py-3",
        hovered && "bg-light-surface-muted dark:bg-dark-surface-muted",
      )}
      onPress={onPress}
      {...hoverProps}
    >
      <RowBody title={title} description={description} />
      {selected && <UniCheck size={16} className="text-light-tint dark:text-dark-tint" />}
    </Pressable>
  );
};

type LinkProps = {
  title: string;
  description?: string;
  onPress: () => void;
  external?: boolean;
};

export const SettingsLink = ({ title, description, onPress, external }: LinkProps) => {
  const { hovered, hoverProps } = useHover();
  const Icon = external ? UniExternalLink : UniChevronRight;

  return (
    <Pressable
      accessibilityRole={external ? "link" : "button"}
      focusable
      className={cn(
        "min-h-12 flex-row items-center gap-3 px-4 py-3",
        hovered && "bg-light-surface-muted dark:bg-dark-surface-muted",
      )}
      onPress={onPress}
      {...hoverProps}
    >
      <RowBody title={title} description={description} />
      <Icon size={16} className={ICON} />
    </Pressable>
  );
};

export const SettingsInfo = ({ title, value }: { title: string; value: string }) => {
  return (
    <View className="min-h-11 flex-row items-center gap-4 px-4 py-3">
      <Text className={cn(TITLE, "flex-1")}>{title}</Text>
      <Text selectable className="shrink text-right text-[13px] text-light-text-muted dark:text-dark-text-muted">
        {value}
      </Text>
    </View>
  );
};

type ActionProps = {
  label: string;
  tone?: "tint" | "danger";
  disabled?: boolean;
  busy?: boolean;
  busyLabel?: string;
  onPress: () => void;
};

export const SettingsAction = ({ label, tone = "tint", disabled, busy, busyLabel = "保存中", onPress }: ActionProps) => {
  const { hovered, hoverProps } = useHover();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      focusable
      disabled={disabled || busy}
      className={cn(
        "min-h-11 justify-center px-4 py-3",
        hovered && !disabled && !busy && "bg-light-surface-muted dark:bg-dark-surface-muted",
        (disabled || busy) && "opacity-50",
      )}
      onPress={onPress}
      {...hoverProps}
    >
      {busy ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" colorClassName="accent-light-tint dark:accent-dark-tint" />
          <Text className="text-[13px] font-medium text-light-tint dark:text-dark-tint">{busyLabel}</Text>
        </View>
      ) : (
        <Text
          className={cn(
            "text-[13px] font-medium",
            disabled
              ? "text-light-text-subtle dark:text-dark-text-subtle"
              : tone === "danger"
                ? "text-light-error dark:text-dark-error"
                : "text-light-tint dark:text-dark-tint",
          )}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
};

export const SettingsLoading = ({ title, onBack }: SettingsPageProps & { title: string }) => {
  return (
    <SettingsPage title={title} onBack={onBack} scroll={false}>
      <View className="flex-1 items-center justify-center">
        <ActivityIndicator colorClassName="accent-light-tint dark:accent-dark-tint" />
      </View>
    </SettingsPage>
  );
};

export const SettingsMessage = ({
  title,
  message,
  onBack,
}: SettingsPageProps & { title: string; message: string }) => {
  return (
    <SettingsPage title={title} onBack={onBack}>
      <Text className="text-[13px] leading-5 text-light-text-muted dark:text-dark-text-muted">{message}</Text>
    </SettingsPage>
  );
};
