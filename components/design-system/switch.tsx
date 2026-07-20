import { Switch } from "react-native";

// NOTE: uniwind は Switch の className をサポートしない (型定義上 never)。
// 色は *ColorClassName プロパティで指定する。
export type CatalystSwitchProps = React.ComponentProps<typeof Switch>;

export const CatalystSwitch = (props: CatalystSwitchProps) => {
  return (
    <Switch
      thumbColorClassName="accent-light-background dark:accent-dark-text"
      trackColorOffClassName="accent-light-border-strong dark:accent-dark-border-strong"
      trackColorOnClassName="accent-light-tint dark:accent-dark-accent"
      ios_backgroundColorClassName="accent-light-border-strong dark:accent-dark-border-strong"
      {...props}
    />
  );
};
