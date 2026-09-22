import "./lib/polyfills";

import { getDefaultStore } from "jotai";
import { useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppShell } from "./AppShell";
import { boostTextContrastAtom, reduceMotionPreferenceAtom, underlineLinksAtom } from "./atoms/accessibility";
import { hideSensitiveContentAtom } from "./atoms/sensitive-content";
import {
  loadBoostTextContrast,
  loadReduceMotionPreference,
  loadUnderlineLinks,
} from "./models/accessibility-settings";
import { applyAppearance, loadAppearance } from "./models/appearance";
import { restore } from "./models/auth";
import { loadHideSensitiveContent } from "./models/sensitive-content-settings";

import "./global.css";

function App() {
  const [ready, setReady] = useState(false);

  // Keychain のトークンと端末に保存した表示設定を復元してからシェルを描画する
  useEffect(() => {
    Promise.all([
      restore(),
      loadAppearance()
        .then(applyAppearance)
        .catch((error) => console.error(error)),
      loadHideSensitiveContent()
        .then((value) => getDefaultStore().set(hideSensitiveContentAtom, value))
        .catch((error) => console.error(error)),
      Promise.all([loadReduceMotionPreference(), loadUnderlineLinks(), loadBoostTextContrast()])
        .then(([motion, underline, contrast]) => {
          const store = getDefaultStore();
          store.set(reduceMotionPreferenceAtom, motion);
          store.set(underlineLinksAtom, underline);
          store.set(boostTextContrastAtom, contrast);
        })
        .catch((error) => console.error(error)),
    ]).finally(() => setReady(true));
  }, []);

  return <SafeAreaProvider>{ready && <AppShell />}</SafeAreaProvider>;
}

export default App;
