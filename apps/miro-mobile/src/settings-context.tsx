import type { ReactElement, ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  defaultMobileAiSettings,
  loadMobileAiSettings,
  saveMobileAiSettings,
  type MobileAiSettings,
  type MobileAiSettingsUpdate,
} from "./lib/mobile-settings";

interface MobileSettingsContextValue {
  readonly settings: MobileAiSettings;
  readonly ready: boolean;
  readonly updateSettings: (update: MobileAiSettingsUpdate) => Promise<void>;
}

const MobileSettingsContext = createContext<MobileSettingsContextValue | null>(null);

export function MobileSettingsProvider(props: {
  readonly children: ReactNode;
}): ReactElement {
  const { children } = props;
  const [settings, setSettings] = useState<MobileAiSettings>(defaultMobileAiSettings());
  const [ready, setReady] = useState(false);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  useEffect(() => {
    let active = true;
    void (async () => {
      const loaded = await loadMobileAiSettings();
      if (!active) {
        return;
      }
      settingsRef.current = loaded;
      setSettings(loaded);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const updateSettings = useCallback(async (update: MobileAiSettingsUpdate): Promise<void> => {
    const next = { ...settingsRef.current, ...update };
    settingsRef.current = next;
    setSettings(next);
    await saveMobileAiSettings(next);
  }, []);

  const value = useMemo(
    (): MobileSettingsContextValue => ({ settings, ready, updateSettings }),
    [ready, settings, updateSettings],
  );

  return (
    <MobileSettingsContext.Provider value={value}>{children}</MobileSettingsContext.Provider>
  );
}

export function useMobileSettings(): MobileSettingsContextValue {
  const value = useContext(MobileSettingsContext);
  if (!value) {
    throw new Error("useMobileSettings must be used within MobileSettingsProvider");
  }
  return value;
}
