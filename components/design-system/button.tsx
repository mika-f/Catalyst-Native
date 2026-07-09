import { cn } from "@/lib/utils";
import React, { createContext, useContext } from "react";
import { Pressable, Text, View } from "react-native";
import {
  catalystButtonBase,
  catalystButtonSize,
  catalystButtonTextSize,
  catalystButtonTextTone,
  catalystButtonTone,
  catalystIconSize,
  type CatalystSize,
  type CatalystTone,
} from "./shared";

type CatalystButtonContextValue = {
  disabled?: boolean;
  size: CatalystSize;
  tone: CatalystTone;
};

const CatalystButtonContext = createContext<CatalystButtonContextValue>({
  size: "md",
  tone: "primary",
});

export type CatalystButtonProps = React.ComponentProps<typeof Pressable> & {
  size?: CatalystSize;
  tone?: CatalystTone;
};

export const CatalystButton = ({
  children,
  className,
  disabled,
  size = "md",
  tone = "primary",
  ...props
}: CatalystButtonProps) => {
  const isDisabled = !!disabled;

  return (
    <CatalystButtonContext.Provider value={{ disabled: isDisabled, size, tone }}>
      <Pressable
        accessibilityRole="button"
        className={cn(catalystButtonBase, catalystButtonTone[tone], catalystButtonSize[size], className)}
        disabled={isDisabled}
        {...props}
      >
        {children}
      </Pressable>
    </CatalystButtonContext.Provider>
  );
};

export type CatalystButtonTextProps = React.ComponentProps<typeof Text>;

export const CatalystButtonText = ({ className, ...props }: CatalystButtonTextProps) => {
  const { size, tone } = useContext(CatalystButtonContext);

  return (
    <Text
      className={cn("font-semibold", catalystButtonTextTone[tone], catalystButtonTextSize[size], className)}
      numberOfLines={1}
      {...props}
    />
  );
};

export type CatalystButtonIconProps = React.ComponentProps<typeof View> & {
  size?: number;
};

export const CatalystButtonIcon = ({
  children,
  className,
  size: iconSize,
  ...props
}: CatalystButtonIconProps) => {
  const { size, tone } = useContext(CatalystButtonContext);
  const iconClassName = cn(catalystButtonTextTone[tone], className);

  return (
    <View className="items-center justify-center" {...props}>
      {React.isValidElement<{ className?: string; size?: number }>(children)
        ? React.cloneElement(children, {
            className: cn(iconClassName, children.props.className),
            size: iconSize ?? children.props.size ?? catalystIconSize[size],
          })
        : children}
    </View>
  );
};
