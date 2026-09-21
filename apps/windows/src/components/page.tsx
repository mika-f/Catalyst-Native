import { cn } from "cn";
import { AppWindow, X } from "lucide-react-native";
import { useCallback, useContext, useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { withUniwind } from "uniwind";
import { CONTENT_BREAKPOINTS, MAIN_COLUMN_WIDTH, useContainerWidth } from "../layout/breakpoints";
import { getSceneTitle, type Scene } from "../scenes/scene";
import { SceneHostContext, useOpenScene } from "../scenes/scene-host";
import { isMultiWindowSupported } from "../scenes/window-manager";
import { SceneContent } from "../screens/scene-content";
import { ContextMenuHost } from "./context-menu";
import { RightRail } from "./right-rails";
import { SHORTCUTS, ShortcutScope } from "./shortcut-scope";
import { IconButton } from "./ui";

const UniAppWindow = withUniwind(AppWindow);
const UniX = withUniwind(X);

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  // 狭い幅では補助テキストを省いてタイムラインの表示領域を優先する
  compact?: boolean;
};

export const PageHeader = ({ title, subtitle, actions, children, compact = false }: PageHeaderProps) => {
  return (
    <View className="border-b-hairline border-light-divider bg-light-background dark:border-dark-divider dark:bg-dark-background">
      <View className={cn("flex-row items-center gap-3 px-5", compact ? "min-h-12 py-2" : "min-h-14 pt-4 pb-2")}>
        <View className="flex-1">
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            className={cn("font-semibold text-light-text dark:text-dark-text", compact ? "text-base" : "text-xl")}
          >
            {title}
          </Text>
          {subtitle && !compact && (
            <Text numberOfLines={1} className="mt-0.5 text-xs text-light-text-muted dark:text-dark-text-muted">
              {subtitle}
            </Text>
          )}
        </View>
        {actions && <View className="flex-row items-center gap-1">{actions}</View>}
      </View>
      {children}
    </View>
  );
};

type DetailPaneProps = {
  scene: Scene;
  onClose: () => void;
};

// 2 ペイン (リスト / 詳細) の右側。Windows のメールアプリの閲覧ウィンドウのように、選択した投稿やユーザーをその場で表示する
const DetailPane = ({ scene, onClose }: DetailPaneProps) => {
  const openScene = useOpenScene();

  return (
    <View className="flex-1 border-l-hairline border-light-divider bg-light-background dark:border-dark-divider dark:bg-dark-background">
      <View className="h-12 flex-row items-center gap-1 border-b-hairline border-light-divider pr-2 pl-5 dark:border-dark-divider">
        <Text
          accessibilityRole="header"
          numberOfLines={1}
          className="flex-1 text-base font-semibold text-light-text dark:text-dark-text"
        >
          {getSceneTitle(scene)}
        </Text>
        {isMultiWindowSupported && (
          <IconButton
            label="新しいウィンドウで開く"
            onPress={() => {
              openScene(scene, "window");
              onClose();
            }}
          >
            <UniAppWindow size={16} className="text-light-icon dark:text-dark-icon" />
          </IconButton>
        )}
        <IconButton label="閉じる" shortcut={SHORTCUTS.closePane} onPress={onClose}>
          <UniX size={16} className="text-light-icon dark:text-dark-icon" />
        </IconButton>
      </View>
      {/* シーンを切り替えたときにスクロール位置やタブ状態を持ち越さないよう key で作り直す */}
      <SceneContent key={JSON.stringify(scene)} scene={scene} />
    </View>
  );
};

type PageProps = {
  header: React.ReactNode | ((layout: { compact: boolean }) => React.ReactNode);
  children: React.ReactNode;
  // ギャラリーなど一覧を広く見せたいページはメインカラムの最大幅を外す
  wide?: boolean;
  rightRail?: boolean;
  // リストから詳細を右ペインで開けるページ
  detailPane?: boolean;
  // Tabs ナビゲータのように children 自身が flex:1 で高さを管理する場合、外側の ScrollView に入れると潰れるため無効化する
  scroll?: boolean;
  onRefresh?: () => void;
};

// サイドバーの各画面のルート。割り当てられた幅に応じて次のように組み替える:
// - 〜 960       : 1 カラム (最大 640 で中央寄せ)
// - 960 〜 1120 : メイン + 右カラム (トレンドなど)
// - 1120 〜     : 詳細を開いている間はメイン (600 固定) + 詳細ペイン、閉じていればメイン + 右カラム
export const Page = ({
  header,
  children,
  wide = false,
  rightRail = true,
  detailPane = true,
  scroll = true,
  onRefresh,
}: PageProps) => {
  const parent = useContext(SceneHostContext);
  const { width, onLayout } = useContainerWidth();
  const [paneScene, setPaneScene] = useState<Scene | null>(null);

  const canShowPane = detailPane && width >= CONTENT_BREAKPOINTS.detailPane;
  const showPane = canShowPane && paneScene != null;
  const showRightRail = rightRail && !showPane && width >= CONTENT_BREAKPOINTS.rightRail;
  const compact = width > 0 && width < MAIN_COLUMN_WIDTH;

  const openInPane = useCallback(
    (scene: Scene) => {
      if (!canShowPane || scene.type === "compose" || scene.type === "settings" || scene.type === "main") return false;
      setPaneScene(scene);
      return true;
    },
    [canShowPane],
  );
  const closePane = useCallback(() => setPaneScene(null), []);

  const host = useMemo(
    () => ({
      ...parent,
      openInPane,
      closePane: showPane ? closePane : undefined,
      paneScene: showPane ? paneScene : null,
    }),
    [parent, openInPane, closePane, showPane, paneScene],
  );

  const resolvedHeader = typeof header === "function" ? header({ compact }) : header;

  return (
    <SceneHostContext.Provider value={host}>
      <ContextMenuHost>
        <ShortcutScope onRefresh={onRefresh}>
          <View
            className={cn(
              "flex-1 flex-row bg-light-background dark:bg-dark-background",
              !wide && !showPane && "justify-center",
            )}
            onLayout={onLayout}
          >
            <View
              className={cn(
                "border-light-divider dark:border-dark-divider",
                wide ? "flex-1" : showPane ? "w-[600px]" : "max-w-[640px] flex-1",
                !wide && !showPane && width > 640 && "border-x-hairline",
              )}
            >
              {scroll ? (
                <ScrollView stickyHeaderIndices={[0]} contentContainerClassName="pb-10">
                  {resolvedHeader}
                  {children}
                </ScrollView>
              ) : (
                <View className="flex-1">
                  {resolvedHeader}
                  {children}
                </View>
              )}
            </View>
            {showPane && <DetailPane scene={paneScene} onClose={closePane} />}
            {showRightRail && <RightRail />}
          </View>
        </ShortcutScope>
      </ContextMenuHost>
    </SceneHostContext.Provider>
  );
};
