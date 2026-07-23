"use client";

import type { ReactElement } from "react";
import { useState } from "react";
import { Bot, Brain, Database, Info, Palette, User } from "lucide-react";
import type { SettingsState, SettingsUpdateInput } from "@miro/core";
import ProfileCard from "./profile-card";
import AiKeysCard from "./ai-keys-card";
import DataCard from "./data-card";
import AboutCard from "./about-card";
import MemoryCard from "./memory-card";
import AppearanceCard from "./appearance-card";
import PillButton from "../ui/pill-button";
import PageFrame from "../shell/page-frame";
import { useAiModelCatalog } from "../lib/use-ai-model-catalog";

interface SettingsViewProps {
  readonly settings: SettingsState;
  readonly onUpdate: (input: SettingsUpdateInput) => void;
  readonly onReset: () => void;
}

type SettingsTabId = "profile" | "aiKeys" | "agent" | "appearance" | "dataStorage" | "about";

interface SettingsTab {
  readonly id: SettingsTabId;
  readonly label: string;
}

const settingsTabs: readonly SettingsTab[] = [
  { id: "aiKeys", label: "AI & keys" },
  { id: "agent", label: "Agent" },
  { id: "appearance", label: "Appearance" },
  { id: "profile", label: "Profile" },
  { id: "dataStorage", label: "Data & storage" },
  { id: "about", label: "About" },
];

const defaultSettingsTabId: SettingsTabId = "aiKeys";

function getSettingsTabIcon(id: SettingsTabId): ReactElement {
  if (id === "aiKeys") {
    return <Bot className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  if (id === "agent") {
    return <Brain className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  if (id === "appearance") {
    return <Palette className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  if (id === "profile") {
    return <User className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  if (id === "dataStorage") {
    return <Database className="h-3.5 w-3.5" aria-hidden="true" />;
  }
  return <Info className="h-3.5 w-3.5" aria-hidden="true" />;
}

export default function SettingsView(props: SettingsViewProps): ReactElement {
  const { settings, onUpdate, onReset } = props;
  const { profile, appearance, aiView, agent, data } = settings;
  const [activeTab, setActiveTab] = useState<SettingsTabId>(defaultSettingsTabId);
  const {
    runtime: aiRuntime,
    catalog,
    loading: catalogLoading,
    discoveryError,
    discoveredCount,
    refresh,
  } = useAiModelCatalog(aiView);

  function handleTabChange(nextId: SettingsTabId): void {
    setActiveTab(nextId);
  }

  return (
    <PageFrame
      title="Settings"
      description="Control AI providers, appearance, profile details, and workspace data."
      className="lg:mx-auto lg:w-full lg:max-w-5xl xl:max-w-6xl"
    >
      <div className="-mx-1 overflow-x-auto pb-1 text-sm md:text-base">
        <div className="flex min-w-max gap-3 px-1">
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
      </div>
      <div className="mt-1 flex flex-1 flex-col gap-3 border-t border-surface pt-3 text-sm">
        {activeTab === "aiKeys" && (
          <AiKeysCard
            aiView={aiView}
            aiRuntime={aiRuntime}
            catalog={catalog}
            catalogLoading={catalogLoading}
            discoveryError={discoveryError}
            discoveredCount={discoveredCount}
            onRefreshCatalog={refresh}
            onUpdate={onUpdate}
          />
        )}
        {activeTab === "agent" && <MemoryCard agent={agent} onUpdate={onUpdate} />}
        {activeTab === "appearance" && (
          <AppearanceCard appearance={appearance} onUpdate={onUpdate} />
        )}
        {activeTab === "profile" && <ProfileCard profile={profile} onUpdate={onUpdate} />}
        {activeTab === "dataStorage" && (
          <DataCard data={data} onUpdate={onUpdate} onReset={onReset} />
        )}
        {activeTab === "about" && <AboutCard />}
      </div>
    </PageFrame>
  );
}
