import { forView } from "@natsuneko-laboratory/react-native-desktop-window-size";
import React, { useMemo, useRef } from "react";
import { View } from "react-native";

interface WindowContextValue {
  getWindowSize: () => Promise<{ width: number; height: number }>;
  setWindowSize: (width: number, height: number) => Promise<void>;
  setMaximumWindowSize: (width: number, height: number) => Promise<void>;
  setMinimumWindowSize: (width: number, height: number) => Promise<void>;
}

export const WindowContext = React.createContext<WindowContextValue | undefined>(undefined);

export const WindowContextProvider = ({ children }: { children: React.ReactNode }) => {
  const root = useRef<View>(null);
  const func = useMemo<WindowContextValue>(() => ({
    getWindowSize: async () => {
      if (root.current) {
        const view = forView(root.current);
        return view.getSize();
      }

      return { width: 0, height: 0 };
    },
    setWindowSize: async (width: number, height: number) => {
      if (root.current) {
        const view = forView(root.current);
        await view.setSize({ width, height });
      }
    },
    setMaximumWindowSize: async (width: number, height: number) => {
      if (root.current) {
        const view = forView(root.current);
        await view.setMaxSize({ width, height });
      }
    },
    setMinimumWindowSize: async (width: number, height: number) => {
      if (root.current) {
        const view = forView(root.current);
        await view.setMinSize({ width, height });
      }
    }
  }), []);

  return (
    <View ref={root} className="flex-1">
      <WindowContext.Provider value={func}>
        {children}
      </WindowContext.Provider>
    </View>
  );
};

export const useWindowContext = () => React.useContext(WindowContext);