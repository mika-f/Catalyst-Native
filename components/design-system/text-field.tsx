import { cn } from "@/lib/utils";
import { TextInput } from "react-native";

export type CatalystTextFieldProps = React.ComponentProps<typeof TextInput>;

export const CatalystTextField = ({
  className,
  multiline,
  ...props
}: CatalystTextFieldProps) => {
  return (
    <TextInput
      className={cn(
        "text-base leading-6 text-light-text dark:text-dark-text",
        multiline && "min-h-[100px]",
        className,
      )}
      cursorColorClassName="accent-light-tint dark:accent-dark-tint"
      multiline={multiline}
      placeholderTextColorClassName="accent-light-text-subtle dark:accent-dark-text-subtle"
      selectionColorClassName="accent-light-tint dark:accent-dark-tint"
      selectionHandleColorClassName="accent-light-tint dark:accent-dark-tint"
      underlineColorAndroidClassName="accent-transparent"
      textAlignVertical={multiline ? "top" : undefined}
      {...props}
    />
  );
};
