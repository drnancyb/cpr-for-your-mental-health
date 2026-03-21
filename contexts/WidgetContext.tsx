import * as React from "react";
import { createContext, useCallback, useContext } from "react";
import { Platform } from "react-native";

// ExtensionStorage is a native-only module that requires a full native build.
// We lazy-require it so a missing build/ directory doesn't crash the JS bundle.
function tryReloadWidget() {
  if (Platform.OS !== "ios") return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ExtensionStorage } = require("@bacons/apple-targets");
    ExtensionStorage?.reloadWidget?.();
  } catch {
    // Not available in Expo Go or if the native module is not built
  }
}

type WidgetContextType = {
  refreshWidget: () => void;
};

const WidgetContext = createContext<WidgetContextType | null>(null);

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  const refreshWidget = useCallback(() => {
    tryReloadWidget();
  }, []);

  return (
    <WidgetContext.Provider value={{ refreshWidget }}>
      {children}
    </WidgetContext.Provider>
  );
}

export const useWidget = () => {
  const context = useContext(WidgetContext);
  if (!context) {
    throw new Error("useWidget must be used within a WidgetProvider");
  }
  return context;
};
