import { cn } from "@/lib/utils";
import { Pressable, View } from "react-native";
import { CatalystText } from "./text";

export type CatalystSegmentedControlOption<T extends string> = {
  label: string;
  value: T;
};

export type CatalystSegmentedControlProps<T extends string> = React.ComponentProps<typeof View> & {
  onValueChange: (value: T) => void;
  options: readonly CatalystSegmentedControlOption<T>[];
  value: T;
};

export const CatalystSegmentedControl = <T extends string>({
  className,
  onValueChange,
  options,
  value,
  ...props
}: CatalystSegmentedControlProps<T>) => {
  return (
    <View
      className={cn("flex-row overflow-hidden rounded-lg bg-light-surface-muted p-0.5 dark:bg-dark-surface-muted", className)}
      {...props}
    >
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <Pressable
            key={option.value}
            className={cn(
              "min-h-9 flex-1 items-center justify-center rounded-md px-2 active:opacity-80",
              isSelected && "bg-light-background dark:bg-dark-background",
            )}
            onPress={() => onValueChange(option.value)}
          >
            <CatalystText
              variant="caption"
              tone={isSelected ? "default" : "muted"}
              className="font-semibold"
              numberOfLines={1}
            >
              {option.label}
            </CatalystText>
          </Pressable>
        );
      })}
    </View>
  );
};
