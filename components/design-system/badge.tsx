import { cn } from "@/lib/utils";
import React, { createContext, useContext } from "react";
import { Text, View } from "react-native";
import {
  catalystBadgeTextTone,
  catalystBadgeTone,
  type CatalystBadgeTone,
} from "./shared";

const CatalystBadgeContext = createContext<{ tone: CatalystBadgeTone }>({ tone: "neutral" });

export type CatalystBadgeProps = React.ComponentProps<typeof View> & {
  tone?: CatalystBadgeTone;
};

export const CatalystBadge = ({
  children,
  className,
  tone = "neutral",
  ...props
}: CatalystBadgeProps) => {
  return (
    <CatalystBadgeContext.Provider value={{ tone }}>
      <View
        className={cn("min-h-6 flex-row items-center rounded-full px-2", catalystBadgeTone[tone], className)}
        {...props}
      >
        {children}
      </View>
    </CatalystBadgeContext.Provider>
  );
};

export type CatalystBadgeTextProps = React.ComponentProps<typeof Text>;

export const CatalystBadgeText = ({ className, ...props }: CatalystBadgeTextProps) => {
  const { tone } = useContext(CatalystBadgeContext);

  return (
    <Text
      className={cn("text-xs font-semibold", catalystBadgeTextTone[tone], className)}
      numberOfLines={1}
      {...props}
    />
  );
};
