import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppShell } from "./AppShell";
import { parseScene } from "./scenes/scene";

import { WindowContextProvider } from "./context/window";
import "./global.css";

function App() {
  return (
    <SafeAreaProvider>
      <WindowContextProvider>
        <AppShell />
      </WindowContextProvider>
    </SafeAreaProvider>
  );
}

type SceneWindowProps = {
  // native (WindowManager) から initialProps として渡される
  scene?: string;
  windowId?: number;
};

// 2 枚目以降のウィンドウのルート。同じ JS ランタイム上の別 island として描画されるため、メインウィンドウと状態を共有できる
export function SceneWindow({ scene, windowId }: SceneWindowProps) {
  return (
    <SafeAreaProvider>
      <WindowContextProvider>
        <AppShell scene={parseScene(scene)} windowId={windowId} />
      </WindowContextProvider>
    </SafeAreaProvider>
  );
}

export default App;
