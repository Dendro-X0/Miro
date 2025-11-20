"use client";

import type { ChangeEvent, ReactElement } from "react";
import { useEffect, useState } from "react";
import { Bot, Database, Info, User } from "lucide-react";
import type { SettingsState, SettingsUpdateInput } from "../_settings-store";
import ProfileCard from "./profile-card";
import AiKeysCard, { type AiRuntimeConfig } from "./ai-keys-card";
import DataCard from "./data-card";
import AboutCard from "./about-card";
import PillButton from "../ui/pill-button";
import UiKickerLabel from "../ui/kicker-label";

interface SettingsViewProps {
  readonly settings: SettingsState;
  readonly onUpdate: (input: SettingsUpdateInput) => void;
  readonly onReset: () => void;
}

type SettingsTabId = "profile" | "aiKeys" | "dataStorage" | "about";

interface SettingsTab {
  readonly id: SettingsTabId;
  readonly label: string;
}

const settingsTabs: readonly SettingsTab[] = [
  { id: "aiKeys", label: "AI & keys" },
  { id: "profile", label: "Profile" },
  { id: "dataStorage", label: "Data & storage" },
  { id: "about", label: "About" },
];

const defaultSettingsTabId: SettingsTabId = "aiKeys";

function getSettingsTabIcon(id: SettingsTabId): ReactElement {
  if (id === "aiKeys") {
    return <Bot className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  if (id === "profile") {
    return <User className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  if (id === "dataStorage") {
    return <Database className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  return <Info className="h-3.5 w-3.5" aria-hidden="true" />;
}

interface AiConfigResponseApi {
  readonly provider: string;
  readonly baseUrl: string;
  readonly models: {
    readonly fast: string;
    readonly balanced: string;
    readonly creative: string;
  };
  readonly ready: boolean;
  readonly runtime?: AiRuntimeConfig;
}

export default function SettingsView(props: SettingsViewProps): ReactElement {
  const { settings, onUpdate, onReset } = props;
  const { profile, aiView, data } = settings;
  const [activeTab, setActiveTab] = useState<SettingsTabId>(defaultSettingsTabId);
  const [aiRuntime, setAiRuntime] = useState<AiRuntimeConfig | null>(null);
  const apiBaseUrl: string =
		process.env.NEXT_PUBLIC_MIRO_API_BASE_URL ?? "http://localhost:8787";

  function handleTabChange(nextId: SettingsTabId): void {
    setActiveTab(nextId);
  }

  useEffect(() => {
    let active: boolean = true;
    async function loadAiConfig(): Promise<void> {
      try {
				const response: Response = await fetch(`${apiBaseUrl}/ai/config`);
        if (!response.ok) {
          return;
        }
        const body: AiConfigResponseApi = (await response.json()) as AiConfigResponseApi;
        if (!active) {
          return;
        }
        if (body.runtime) {
          setAiRuntime(body.runtime);
        }
      } catch {
        return;
      }
    }
    void loadAiConfig();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      className="flex min-h-0 flex-1 flex-col gap-3 pb-4 lg:mx-auto lg:w-full lg:max-w-5xl xl:max-w-6xl"
      aria-label="Settings"
    >
      <div className="flex items-baseline justify-between">
        <div>
          <UiKickerLabel as="p" text="Workspace" />
          <h2 className="text-lg font-semibold text-foreground">Settings</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Control AI providers, profile details, and workspace data.
          </p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-sm md:text-base">
        {settingsTabs.map((tab) => {
          const active: boolean = tab.id === activeTab;
          const icon: ReactElement = getSettingsTabIcon(tab.id);
          return (
            <PillButton
              key={tab.id}
              variant="surface"
              size="sm"
              active={active}
              onClick={(): void => handleTabChange(tab.id)}
              ariaCurrent={active ? "page" : undefined}
            >
              <span
                className={
                  active
                    ? "mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[11px] text-sky-500 dark:text-sky-200"
                    : "mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface text-[11px] text-muted-foreground"
                }
              >
                {icon}
              </span>
              <span>{tab.label}</span>
            </PillButton>
          );
        })}
      </div>
      <div className="mt-2 flex flex-1 flex-col gap-3 border-t border-surface pt-3 text-sm">
        {activeTab === "aiKeys" && (
          <AiKeysCard aiView={aiView} aiRuntime={aiRuntime} onUpdate={onUpdate} />
        )}
        {activeTab === "profile" && <ProfileCard profile={profile} onUpdate={onUpdate} />}
        {activeTab === "dataStorage" && (
          <DataCard data={data} onUpdate={onUpdate} onReset={onReset} />
        )}
        {activeTab === "about" && <AboutCard />}
      </div>
    </section>
  );
}
