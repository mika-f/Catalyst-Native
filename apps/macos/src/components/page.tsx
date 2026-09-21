import { cn } from "cn";
import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { RightRail } from "./right-rails";

// 右カラムを表示できるコンテンツ領域の最小幅 (メインカラム + 右カラム + 余白)
const RIGHT_RAIL_BREAKPOINT = 980;

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
};

// 透過タイトルバーの下に潜り込むため、上部に余白を取った半透明のスティッキーヘッダー
export const PageHeader = ({ title, subtitle, actions, children }: PageHeaderProps) => {
  return (
    <View className="border-b border-light-divider bg-light-background/95 dark:border-dark-divider dark:bg-dark-background/95">
      <View className="min-h-14 flex-row items-center gap-3 px-5 pb-2 pt-4">
        <View className="flex-1">
          <Text accessibilityRole="header" className="text-xl font-bold text-light-text dark:text-dark-text">
            {title}
          </Text>
          {subtitle && (
            <Text className="mt-0.5 text-xs text-light-text-muted dark:text-dark-text-muted">{subtitle}</Text>
          )}
        </View>
        {actions && <View className="flex-row items-center gap-1">{actions}</View>}
      </View>
      {children}
    </View>
  );
};

type PageProps = {
  header: React.ReactNode;
  children: React.ReactNode;
  // ギャラリーなど一覧を広く見せたいページはメインカラムの最大幅を外す
  wide?: boolean;
  rightRail?: boolean;
  // Tabs ナビゲータのように children 自身が flex:1 で高さを管理する場合、外側の ScrollView に入れると潰れるため無効化する
  scroll?: boolean;
};

export const Page = ({ header, children, wide = false, rightRail = true, scroll = true }: PageProps) => {
  const [width, setWidth] = useState(0);
  const showRightRail = rightRail && width >= RIGHT_RAIL_BREAKPOINT;

  return (
    <View
      className="flex-1 flex-row bg-light-background dark:bg-dark-background"
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
    >
      <View
        className={cn(
          "flex-1 border-light-divider dark:border-dark-divider",
          !wide && "max-w-[640px]",
          showRightRail && "border-r",
        )}
      >
        {scroll ? (
          <ScrollView stickyHeaderIndices={[0]} contentContainerClassName="pb-10">
            {header}
            {children}
          </ScrollView>
        ) : (
          <View className="flex-1">
            {header}
            {children}
          </View>
        )}
      </View>
      {showRightRail && <RightRail />}
    </View>
  );
};
