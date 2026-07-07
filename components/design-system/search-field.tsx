import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react-native";
import { useState } from "react";
import { Pressable, TextInput, View } from "react-native";
import { withUniwind } from "uniwind";

const UniSearch = withUniwind(Search);
const UniX = withUniwind(X);

export type CatalystSearchFieldProps = Omit<React.ComponentProps<typeof TextInput>, "className"> & {
  className?: string;
  onClear?: () => void;
  value: string;
};

export const CatalystSearchField = ({
  className,
  onBlur,
  onChangeText,
  onClear,
  onFocus,
  placeholder = "検索...",
  value,
  ...props
}: CatalystSearchFieldProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const showClear = isFocused && value.length > 0;

  return (
    <View
      className={cn(
        "min-h-10 flex-row items-center gap-2 rounded-full bg-light-surface-muted px-3 dark:bg-dark-surface-muted",
        className,
      )}
    >
      <UniSearch size={20} className="text-light-icon dark:text-dark-icon" />
      <TextInput
        className="h-10 min-w-0 flex-1 text-base text-light-text dark:text-dark-text"
        cursorColorClassName="accent-light-tint dark:accent-dark-tint"
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        onChangeText={onChangeText}
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        placeholder={placeholder}
        placeholderTextColorClassName="accent-light-text-subtle dark:accent-dark-text-subtle"
        selectionColorClassName="accent-light-tint dark:accent-dark-tint"
        value={value}
        {...props}
      />
      {showClear ? (
        <Pressable
          accessibilityLabel="検索語を消去"
          className="size-7 items-center justify-center rounded-full bg-light-surface dark:bg-dark-surface active:opacity-70"
          onPress={() => {
            onChangeText?.("");
            onClear?.();
          }}
        >
          <UniX size={18} className="text-light-icon dark:text-dark-icon" />
        </Pressable>
      ) : null}
    </View>
  );
};
