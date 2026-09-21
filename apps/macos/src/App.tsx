import "./lib/polyfills";

import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppShell } from "./AppShell";
import { restore } from "./models/auth";

import "./global.css";

function App() {
  const [ready, setReady] = useState(false);

  // Keychain のトークンから前回のセッションを復元してからシェルを描画する
  useEffect(() => {
    restore().finally(() => setReady(true));
  }, []);

  return <SafeAreaProvider>{ready && <AppShell />}</SafeAreaProvider>;
}

export default App;
