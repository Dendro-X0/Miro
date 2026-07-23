"use client";

import type { AiRuntimeConfig } from "@miro/core";
import type { ChangeEvent, ReactElement } from "react";
import { useState } from "react";
import { Filter, Image as ImageIcon, Server, Sparkles, Zap } from "lucide-react";
import type {
  AiCustomModel,
  AiModelFilterTag,
  SettingsState,
  SettingsUpdateInput,
} from "@miro/core";
import type { CatalogModelOption } from "../lib/ai-model-catalog";
import { modelOptionKey, providerHasCredentials } from "../lib/ai-model-catalog";
import PillButton from "../ui/pill-button";
import UiBadge from "../ui/badge";
import SettingsCard from "../ui/settings-card";

type BaseUrlMode = "hidden" | "optional" | "required";

interface AiSourceOption {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly supportsByok: boolean;
  readonly baseUrlMode: BaseUrlMode;
  readonly keyRequired: boolean;
}

interface AiModelOption {
  readonly id: string;
  readonly providerId: string;
  readonly label: string;
  readonly description: string;
  readonly tier: "default" | "fast" | "quality" | "local";
  readonly tags: readonly AiModelFilterTag[];
}

export type { AiRuntimeConfig };

interface AiKeysCardProps {
  readonly aiView: SettingsState["aiView"];
  readonly aiRuntime: AiRuntimeConfig | null;
  readonly catalog: readonly CatalogModelOption[];
  readonly catalogLoading: boolean;
  readonly discoveryError: string | null;
  readonly discoveredCount: number;
  readonly onRefreshCatalog: () => void;
  readonly onUpdate: (input: SettingsUpdateInput) => void;
}

const PRIMARY_SOURCES: readonly AiSourceOption[] = [
  {
    id: "openai",
    label: "OpenAI",
    description: "Official OpenAI API",
    supportsByok: true,
    baseUrlMode: "optional",
    keyRequired: true,
  },
  {
    id: "anthropic",
    label: "Anthropic",
    description: "Claude models",
    supportsByok: true,
    baseUrlMode: "hidden",
    keyRequired: true,
  },
  {
    id: "google",
    label: "Google",
    description: "Gemini and Imagen",
    supportsByok: true,
    baseUrlMode: "hidden",
    keyRequired: true,
  },
  {
    id: "openai-compatible",
    label: "Custom",
    description: "OpenAI-compatible gateway",
    supportsByok: true,
    baseUrlMode: "required",
    keyRequired: true,
  },
  {
    id: "local",
    label: "Local",
    description: "Ollama on this machine",
    supportsByok: true,
    baseUrlMode: "required",
    keyRequired: false,
  },
];

function buildSourceOptions(runtime: AiRuntimeConfig | null): readonly AiSourceOption[] {
  const runtimeProviders = runtime?.providers ?? [];
  const onlyMock =
    runtimeProviders.length > 0 && runtimeProviders.every((provider) => provider.id === "mock");

  if (onlyMock) {
    return [
      {
        id: "mock",
        label: "Mock",
        description: "Local demo provider",
        supportsByok: false,
        baseUrlMode: "hidden",
        keyRequired: false,
      },
      ...PRIMARY_SOURCES,
    ];
  }

  return PRIMARY_SOURCES;
}

function catalogToModelOptions(catalog: readonly CatalogModelOption[]): readonly AiModelOption[] {
  return catalog.map((model) => ({
    id: model.id,
    providerId: model.providerId,
    label: model.label,
    description: model.description,
    tier: model.tier,
    tags: model.tags,
  }));
}

function getModelFilterIcon(tag: AiModelFilterTag | "all"): ReactElement {
  if (tag === "all") {
    return <Filter className="h-3 w-3" aria-hidden="true" />;
  }
  if (tag === "image") {
    return <ImageIcon className="h-3 w-3" aria-hidden="true" />;
  }
  if (tag === "fast") {
    return <Zap className="h-3 w-3" aria-hidden="true" />;
  }
  if (tag === "quality") {
    return <Sparkles className="h-3 w-3" aria-hidden="true" />;
  }
  if (tag === "local") {
    return <Server className="h-3 w-3" aria-hidden="true" />;
  }
  return <Sparkles className="h-3 w-3" aria-hidden="true" />;
}

function getTierIcon(tier: "default" | "fast" | "quality" | "local"): ReactElement | null {
  if (tier === "fast") {
    return <Zap className="h-3 w-3" aria-hidden="true" />;
  }
  if (tier === "quality" || tier === "default") {
    return <Sparkles className="h-3 w-3" aria-hidden="true" />;
  }
  if (tier === "local") {
    return <Server className="h-3 w-3" aria-hidden="true" />;
  }
  return null;
}

function getProviderLogoIcon(providerId: string): ReactElement | null {
  const logoClassName: string = "h-3.5 w-3.5";
  if (providerId === "openai" || providerId === "openai-compatible") {
    return (
      <>
        <img
          src="/logos/OpenAI_light.svg"
          alt=""
          className={`${logoClassName} block dark:hidden`}
          aria-hidden="true"
        />
        <img
          src="/logos/OpenAI_dark.svg"
          alt=""
          className={`${logoClassName} hidden dark:block`}
          aria-hidden="true"
        />
      </>
    );
  }
  if (providerId === "anthropic") {
    return (
      <>
        <img
          src="/logos/Anthropic_light.svg"
          alt=""
          className={`${logoClassName} block dark:hidden`}
          aria-hidden="true"
        />
        <img
          src="/logos/Anthropic_dark.svg"
          alt=""
          className={`${logoClassName} hidden dark:block`}
          aria-hidden="true"
        />
      </>
    );
  }
  if (providerId === "google") {
    return <img src="/logos/gemini.svg" alt="" className={logoClassName} aria-hidden="true" />;
  }
  if (providerId === "local") {
    return (
      <>
        <img
          src="/logos/Ollama_light.svg"
          alt=""
          className={`${logoClassName} block dark:hidden`}
          aria-hidden="true"
        />
        <img
          src="/logos/Ollama_dark.svg"
          alt=""
          className={`${logoClassName} hidden dark:block`}
          aria-hidden="true"
        />
      </>
    );
  }
  if (providerId === "mock") {
    return <Sparkles className={logoClassName} aria-hidden="true" />;
  }
  return null;
}

function connectionStatusCopy(source: AiSourceOption, connected: boolean): string {
  if (connected) {
    return "Connected — refresh to reload the model list.";
  }
  if (source.id === "local") {
    return "Refresh to load models from your Ollama host.";
  }
  if (source.baseUrlMode === "required") {
    return "Add a key and base URL, then refresh to load models.";
  }
  return "Add a key and refresh to load models.";
}

export default function AiKeysCard(props: AiKeysCardProps): ReactElement {
  const {
    aiView,
    aiRuntime,
    catalog,
    catalogLoading,
    discoveryError,
    discoveredCount,
    onRefreshCatalog,
    onUpdate,
  } = props;
  const [customModelId, setCustomModelId] = useState<string>("");
  const [customModelLabel, setCustomModelLabel] = useState<string>("");
  const [customKind, setCustomKind] = useState<"text" | "image">("text");
  const [customTier, setCustomTier] = useState<"default" | "fast" | "quality" | "local">("quality");

  const sourceOptions = buildSourceOptions(aiRuntime);
  const modelOptions: readonly AiModelOption[] = catalogToModelOptions(catalog);
  const fallbackSourceId: string = sourceOptions[0]?.id ?? "google";
  const selectedProviderId: string =
    sourceOptions.some((source) => source.id === aiView.selectedProviderId)
      ? aiView.selectedProviderId
      : fallbackSourceId;
  const source: AiSourceOption =
    sourceOptions.find((option) => option.id === selectedProviderId) ??
    sourceOptions[0] ?? {
      id: selectedProviderId,
      label: selectedProviderId,
      description: "Provider",
      supportsByok: true,
      baseUrlMode: "optional",
      keyRequired: true,
    };

  const connected: boolean = providerHasCredentials(
    aiRuntime,
    source.id,
    aiView.byokKey,
    aiView.byokProvider,
  );

  const modelsForProvider: readonly AiModelOption[] = modelOptions.filter(
    (model) => model.providerId === source.id,
  );
  const firstTextModel: AiModelOption | undefined = modelsForProvider.find((model) =>
    model.tags.includes("text"),
  );
  const hasSelectedModel: boolean = modelsForProvider.some(
    (model) => model.id === aiView.selectedModelId && model.tags.includes("text"),
  );
  const fallbackModelId: string = firstTextModel?.id ?? aiView.selectedModelId;
  const selectedModelId: string =
    hasSelectedModel && aiView.selectedModelId ? aiView.selectedModelId : fallbackModelId;
  const selectedImageModelId: string = aiView.selectedImageModelId;
  const activeFilterTag: AiModelFilterTag | null = aiView.modelFilterTag;
  const filteredModels: readonly AiModelOption[] = modelsForProvider.filter((model) => {
    if (!activeFilterTag) {
      return true;
    }
    return model.tags.includes(activeFilterTag);
  });
  const showModelList: boolean =
    connected || aiView.customModels.some((model) => model.providerId === source.id);
  const emptyModelsCopy: string =
    source.id === "local"
      ? "Connect this source to load available models from Ollama."
      : "Connect this source to load available models.";

  function handleSelectSource(nextSourceId: string): void {
    const nextSource: AiSourceOption | undefined = sourceOptions.find(
      (option) => option.id === nextSourceId,
    );
    if (!nextSource) {
      return;
    }
    const firstModel: AiModelOption | undefined = modelOptions.find(
      (model) => model.providerId === nextSource.id,
    );
    const nextModelId: string = firstModel?.id ?? selectedModelId;
    onUpdate({
      aiView: {
        selectedProviderId: nextSource.id,
        selectedModelId: nextModelId,
        byokProvider: nextSource.id,
      },
    });
  }

  function handleSelectModel(nextModel: AiModelOption): void {
    const isTextModel: boolean = nextModel.tags.includes("text");
    const isImageModel: boolean = nextModel.tags.includes("image") && !isTextModel;
    if (isImageModel) {
      onUpdate({ aiView: { selectedImageModelId: nextModel.id } });
      return;
    }
    onUpdate({ aiView: { selectedModelId: nextModel.id } });
  }

  function handleToggleShowProviderDetails(event: ChangeEvent<HTMLInputElement>): void {
    onUpdate({ aiView: { showProviderDetails: event.target.checked } });
  }

  function handleToggleShowModelIds(event: ChangeEvent<HTMLInputElement>): void {
    onUpdate({ aiView: { showModelIds: event.target.checked } });
  }

  function handleByokKeyChange(event: ChangeEvent<HTMLInputElement>): void {
    onUpdate({ aiView: { byokKey: event.target.value, byokProvider: source.id } });
  }

  function handleByokLabelChange(event: ChangeEvent<HTMLInputElement>): void {
    onUpdate({ aiView: { byokLabel: event.target.value } });
  }

  function handleModelFilterTagChange(nextTag: AiModelFilterTag | null): void {
    onUpdate({ aiView: { modelFilterTag: nextTag } });
  }

  function buildCustomModelTags(): readonly AiModelFilterTag[] {
    const tags: AiModelFilterTag[] = [];
    tags.push(customKind);
    if (customTier === "fast" && !tags.includes("fast")) {
      tags.push("fast");
    }
    if ((customTier === "quality" || customTier === "default") && !tags.includes("quality")) {
      tags.push("quality");
    }
    if (customTier === "local" && !tags.includes("local")) {
      tags.push("local");
    }
    return tags;
  }

  function handleAddCustomModel(): void {
    const trimmedId: string = customModelId.trim();
    if (!trimmedId) {
      return;
    }
    const trimmedLabel: string = customModelLabel.trim() || trimmedId;
    const tags: readonly AiModelFilterTag[] = buildCustomModelTags();
    const existing: readonly AiCustomModel[] = aiView.customModels;
    const withoutDuplicate: AiCustomModel[] = existing.filter(
      (model: AiCustomModel): boolean => !(model.id === trimmedId && model.providerId === source.id),
    );
    const nextModel: AiCustomModel = {
      id: trimmedId,
      providerId: source.id,
      label: trimmedLabel,
      description: trimmedLabel,
      tier: customTier,
      tags,
    };
    onUpdate({ aiView: { customModels: [...withoutDuplicate, nextModel] } });
    setCustomModelId("");
    setCustomModelLabel("");
  }

  const baseUrlPlaceholder: string =
    source.id === "local"
      ? "http://127.0.0.1:11434"
      : source.id === "openai-compatible"
        ? "https://openrouter.ai/api/v1"
        : "https://api.openai.com/v1";

  return (
    <SettingsCard
      title="AI &amp; keys"
      description="Connect a source, discover its models, then choose what Miro should use. Personal keys stay on this device."
    >
      <div className="space-y-5">
        <section aria-labelledby="ai-sources-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p id="ai-sources-heading" className="text-sm font-semibold text-foreground">
                Sources
              </p>
              <p className="text-xs text-muted-foreground">
                OpenAI, Anthropic, and Google are ready placeholders. Custom and Local cover gateways and
                Ollama.
              </p>
            </div>
            <UiBadge tone={connected ? "primary" : "muted"}>
              {connected ? "Connected" : "Not connected"}
            </UiBadge>
          </div>
          <div
            className="mt-3 flex flex-wrap gap-1.5"
            role="group"
            aria-label="AI sources"
          >
            {sourceOptions.map((option) => {
              const active: boolean = option.id === source.id;
              const logo: ReactElement | null = getProviderLogoIcon(option.id);
              const baseClasses: string =
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors";
              const activeClasses: string =
                `${baseClasses} border-sky-500/80 bg-sky-500/10 text-foreground`;
              const inactiveClasses: string =
                `${baseClasses} border-surface bg-surface-muted text-muted-foreground hover:border-sky-400/60`;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={(): void => handleSelectSource(option.id)}
                  className={active ? activeClasses : inactiveClasses}
                  aria-pressed={active}
                >
                  {logo && <span aria-hidden="true">{logo}</span>}
                  <span>{option.label}</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{source.description}</p>
        </section>

        {source.supportsByok ? (
          <section
            aria-labelledby="ai-connection-heading"
            className="rounded-2xl border border-surface bg-surface-muted/60 px-4 py-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p id="ai-connection-heading" className="text-sm font-semibold text-foreground">
                  Connection
                </p>
                <p className="text-xs text-muted-foreground">
                  {connectionStatusCopy(source, connected)}
                </p>
              </div>
              <button
                type="button"
                onClick={onRefreshCatalog}
                disabled={
                  catalogLoading ||
                  (!connected && source.keyRequired) ||
                  (source.id === "openai-compatible" && !(aiView.byokBaseUrl ?? "").trim())
                }
                className="rounded-full border border-surface bg-surface px-3 py-1 text-[11px] text-muted-foreground hover:border-sky-400/80 hover:text-sky-200 disabled:opacity-60"
              >
                {catalogLoading ? "Refreshing…" : "Refresh models"}
              </button>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              {source.keyRequired ? (
                <label className="block text-sm font-medium text-foreground">
                  Personal API key
                  <input
                    type="password"
                    defaultValue={aiView.byokKey}
                    onChange={handleByokKeyChange}
                    autoComplete="off"
                    className="mt-1 w-full rounded-xl border border-surface bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  />
                </label>
              ) : (
                <div className="text-xs text-muted-foreground md:col-span-1">
                  No API key required for local Ollama. Ensure the daemon is running, then refresh.
                </div>
              )}
              <label className="block text-sm font-medium text-foreground">
                Label
                <input
                  type="text"
                  defaultValue={aiView.byokLabel}
                  onChange={handleByokLabelChange}
                  placeholder="Optional label for this key"
                  className="mt-1 w-full rounded-xl border border-surface bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                />
              </label>
            </div>
            {source.baseUrlMode !== "hidden" ? (
              <label className="mt-3 block text-sm font-medium text-foreground">
                API base URL
                {source.baseUrlMode === "required" ? (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(required)</span>
                ) : (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">(optional)</span>
                )}
                <input
                  type="url"
                  value={aiView.byokBaseUrl ?? ""}
                  onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                    onUpdate({ aiView: { byokBaseUrl: event.target.value } })
                  }
                  placeholder={baseUrlPlaceholder}
                  className="mt-1 w-full rounded-xl border border-surface bg-surface px-4 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                />
              </label>
            ) : null}
            {discoveryError ? (
              <p className="mt-2 text-xs text-amber-300">
                Discovery issue: {discoveryError}. Check your key or base URL, or add a model ID under
                Advanced.
              </p>
            ) : null}
          </section>
        ) : null}

        <section aria-labelledby="ai-models-heading">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p id="ai-models-heading" className="text-sm font-semibold text-foreground">
                Models
              </p>
              <p className="text-xs text-muted-foreground">
                {discoveredCount > 0
                  ? `${discoveredCount} models loaded for ${source.label}.`
                  : "Models appear here after a successful connection."}
              </p>
            </div>
          </div>
          {!showModelList ? (
            <p className="mt-3 rounded-2xl border border-dashed border-surface bg-surface-muted/40 px-4 py-6 text-center text-xs text-muted-foreground">
              {emptyModelsCopy}
            </p>
          ) : (
            <>
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                <PillButton
                  variant="primary"
                  size="xs"
                  active={!activeFilterTag}
                  onClick={(): void => handleModelFilterTagChange(null)}
                  ariaPressed={!activeFilterTag}
                >
                  <span aria-hidden="true">{getModelFilterIcon("all")}</span>
                  <span className="hidden sm:inline">All</span>
                </PillButton>
                {(["text", "image", "fast", "quality", "local"] as const).map(
                  (tagId: AiModelFilterTag) => {
                    const active: boolean = activeFilterTag === tagId;
                    const label: string =
                      tagId === "text"
                        ? "Text"
                        : tagId === "image"
                          ? "Image"
                          : tagId === "fast"
                            ? "Fast"
                            : tagId === "quality"
                              ? "Quality"
                              : "Local";
                    return (
                      <PillButton
                        key={tagId}
                        variant="primary"
                        size="xs"
                        active={active}
                        onClick={(): void => handleModelFilterTagChange(tagId)}
                        ariaPressed={active}
                      >
                        <span aria-hidden="true">{getModelFilterIcon(tagId)}</span>
                        <span className="hidden sm:inline">{label}</span>
                      </PillButton>
                    );
                  },
                )}
              </div>
              {filteredModels.length === 0 ? (
                <p className="mt-3 rounded-2xl border border-dashed border-surface bg-surface-muted/40 px-4 py-6 text-center text-xs text-muted-foreground">
                  No models match this filter. Try Refresh models or add an ID under Advanced.
                </p>
              ) : (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {filteredModels.map((model) => {
                    const isTextModel: boolean = model.tags.includes("text");
                    const isImageModel: boolean = model.tags.includes("image") && !isTextModel;
                    const activeText: boolean = isTextModel && model.id === selectedModelId;
                    const hasImageSelection: boolean = selectedImageModelId.trim().length > 0;
                    const activeImage: boolean =
                      isImageModel && hasImageSelection && model.id === selectedImageModelId;
                    const active: boolean = activeText || activeImage;
                    const baseClasses: string =
                      "flex items-start justify-between rounded-2xl border px-4 py-3 text-left text-sm transition-colors";
                    const activeClasses: string =
                      `${baseClasses} border-sky-500/80 bg-sky-500/10 text-foreground`;
                    const inactiveClasses: string =
                      `${baseClasses} border-surface bg-surface-muted text-muted-foreground hover:border-sky-400/60`;
                    const providerLogo: ReactElement | null = getProviderLogoIcon(model.providerId);
                    const tierLabel: string =
                      model.tier === "default"
                        ? "Balanced"
                        : model.tier === "fast"
                          ? "Fast"
                          : model.tier === "quality"
                            ? "Quality"
                            : "Local";
                    const tierIcon: ReactElement | null = getTierIcon(model.tier);
                    return (
                      <button
                        key={modelOptionKey(model.providerId, model.id)}
                        type="button"
                        onClick={(): void => handleSelectModel(model)}
                        className={active ? activeClasses : inactiveClasses}
                        aria-pressed={active}
                      >
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            {providerLogo && (
                              <span
                                className="flex h-5 w-5 items-center justify-center rounded-full bg-surface"
                                aria-hidden="true"
                              >
                                {providerLogo}
                              </span>
                            )}
                            <span className="text-sm font-semibold">
                              {aiView.showModelIds ? model.id : model.label}
                            </span>
                          </div>
                          <span className="mt-0.5 text-xs text-muted-foreground">
                            {model.description}
                          </span>
                        </div>
                        <UiBadge tone="muted" className="ml-2">
                          {tierIcon && <span aria-hidden="true">{tierIcon}</span>}
                          <span>{tierLabel}</span>
                        </UiBadge>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>

        <details className="rounded-2xl border border-surface bg-surface-muted/40 px-4 py-3">
          <summary className="cursor-pointer text-sm font-semibold text-foreground">
            Advanced
          </summary>
          <div className="mt-3 space-y-4 border-t border-surface pt-3">
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={aiView.showProviderDetails}
                  onChange={handleToggleShowProviderDetails}
                  className="h-4 w-4 rounded border-surface bg-surface text-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400"
                />
                <span>Show provider details in the header</span>
              </label>
              <label className="inline-flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={aiView.showModelIds}
                  onChange={handleToggleShowModelIds}
                  className="h-4 w-4 rounded border-surface bg-surface text-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400"
                />
                <span>Show model IDs instead of friendly names</span>
              </label>
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                Custom models for {source.label}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                Add model IDs when discovery is incomplete. They appear in the list above and in the model
                menu.
              </p>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block text-xs font-medium text-muted-foreground">
                  Model ID
                  <input
                    type="text"
                    value={customModelId}
                    onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                      setCustomModelId(event.target.value)
                    }
                    className="mt-1 w-full rounded-xl border border-surface bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  />
                </label>
                <label className="block text-xs font-medium text-muted-foreground">
                  Label
                  <input
                    type="text"
                    value={customModelLabel}
                    onChange={(event: ChangeEvent<HTMLInputElement>): void =>
                      setCustomModelLabel(event.target.value)
                    }
                    className="mt-1 w-full rounded-xl border border-surface bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                  />
                </label>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <div className="block text-xs font-medium text-muted-foreground">
                  <p>Type</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {(["text", "image"] as const).map((kind: "text" | "image") => {
                      const active: boolean = customKind === kind;
                      return (
                        <PillButton
                          key={kind}
                          variant="primary"
                          size="xs"
                          active={active}
                          onClick={(): void => setCustomKind(kind)}
                          ariaPressed={active}
                        >
                          <span aria-hidden="true">{getModelFilterIcon(kind)}</span>
                          <span>{kind === "text" ? "Text" : "Image"}</span>
                        </PillButton>
                      );
                    })}
                  </div>
                </div>
                <div className="block text-xs font-medium text-muted-foreground">
                  <p>Profile</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {(
                      [
                        { id: "default" as const, label: "Balanced" },
                        { id: "fast" as const, label: "Fast" },
                        { id: "quality" as const, label: "Quality" },
                        { id: "local" as const, label: "Local" },
                      ] as const
                    ).map((option) => {
                      const active: boolean = customTier === option.id;
                      const icon: ReactElement | null = getTierIcon(option.id);
                      return (
                        <PillButton
                          key={option.id}
                          variant="primary"
                          size="xs"
                          active={active}
                          onClick={(): void => setCustomTier(option.id)}
                          ariaPressed={active}
                        >
                          {icon && <span aria-hidden="true">{icon}</span>}
                          <span>{option.label}</span>
                        </PillButton>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={handleAddCustomModel}
                  className="inline-flex items-center justify-center rounded-full border border-surface bg-surface px-4 py-2 text-xs font-medium text-foreground hover:border-sky-400/80 hover:text-sky-200"
                >
                  Add custom model
                </button>
              </div>
            </div>
          </div>
        </details>

        <div className="rounded-2xl border border-surface bg-surface-muted px-4 py-3">
          <label className="block text-xs font-medium text-muted-foreground">
            Default system prompt
            <textarea
              value={aiView.defaultSystemPrompt ?? ""}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>): void =>
                onUpdate({ aiView: { defaultSystemPrompt: event.target.value } })
              }
              rows={4}
              placeholder="Optional instructions applied to every new chat."
              className="mt-2 w-full resize-y rounded-xl border border-surface bg-surface px-3 py-2 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            />
          </label>
        </div>
      </div>
    </SettingsCard>
  );
}
