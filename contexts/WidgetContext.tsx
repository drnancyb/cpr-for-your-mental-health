import * as React from "react";
import { createContext, useCallback, useContext } from "react";
import { Platform } from "react-native";

type WidgetContextType = {
  refreshWidget: () => void;
};

const WidgetContext = createContext<WidgetContextType | null>(null);

export function WidgetProvider({ children }: { children: React.ReactNode }) {
  const refreshWidget = useCallback(() => {
    // Widget refresh is only available in native builds with @bacons/apple-targets configured
    if (Platform.OS !== "ios") return;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { ExtensionStorage } = require("@bacons/apple-targets");
      ExtensionStorage.reloadWidget();
    } catch {
      // Not available in Expo Go or if not configured
    }
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
