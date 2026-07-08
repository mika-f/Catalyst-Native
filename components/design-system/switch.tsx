import { cn } from "@/lib/utils";
import { Switch } from "react-native";

export type CatalystSwitchProps = React.ComponentProps<typeof Switch> & {
  className?: string;
};

export const CatalystSwitch = ({ className, ...props }: CatalystSwitchProps) => {
  return (
    <Switch
      className={cn("shrink-0 disabled:opacity-50", className)}
      thumbColorClassName="accent-light-background dark:accent-dark-text"
      trackColorOffClassName="accent-light-border-strong dark:accent-dark-border-strong"
      trackColorOnClassName="accent-light-tint dark:accent-dark-accent"
      ios_backgroundColorClassName="accent-light-border-strong dark:accent-dark-border-strong"
      {...props}
    />
  );
};
