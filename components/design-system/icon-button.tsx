import { cn } from "@/lib/utils";
import React from "react";
import { Pressable } from "react-native";
import {
  catalystButtonBase,
  catalystButtonTextTone,
  catalystButtonTone,
  catalystIconButtonSize,
  catalystIconSize,
  type CatalystSize,
  type CatalystTone,
} from "./shared";

export type CatalystIconButtonProps = React.ComponentProps<typeof Pressable> & {
  label: string;
  size?: CatalystSize;
  tone?: CatalystTone;
};

export const CatalystIconButton = ({
  children,
  className,
  label,
  size = "md",
  tone = "ghost",
  ...props
}: CatalystIconButtonProps) => {
  const iconClassName = catalystButtonTextTone[tone];

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      className={cn(catalystButtonBase, catalystButtonTone[tone], catalystIconButtonSize[size], className)}
      {...props}
    >
      {React.isValidElement<{ className?: string; size?: number }>(children)
        ? React.cloneElement(children, {
            className: cn(iconClassName, children.props.className),
            size: children.props.size ?? catalystIconSize[size],
          })
        : children}
    </Pressable>
  );
};
