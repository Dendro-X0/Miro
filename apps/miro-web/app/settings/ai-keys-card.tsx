"use client";

import type { ChangeEvent, ReactElement } from "react";
import { useState } from "react";
import { Filter, Image as ImageIcon, Server, Sparkles, Zap } from "lucide-react";
import type {
  AiCustomModel,
  AiModelFilterTag,
  SettingsState,
  SettingsUpdateInput,
} from "../_settings-store";
import aiModelConfig from "./ai-model-presets";
import PillButton from "../ui/pill-button";
import UiBadge from "../ui/badge";
import SettingsCard from "../ui/settings-card";

interface AiProviderOption {
  readonly id: string;
  readonly label: string;
  readonly description: string;
  readonly supportsByok: boolean;
  readonly badge?: string;
}

interface AiModelOption {
  readonly id: string;
  readonly providerId: string;
  readonly label: string;
  readonly description: string;
  readonly tier: "default" | "fast" | "quality" | "local";
  readonly tags: readonly AiModelFilterTag[];
}

interface AiRuntimeModel {
  readonly id: string;
  readonly alias?: string;
  readonly kind: "text" | "image";
  readonly label: string;
  readonly tags?: readonly string[];
}

interface AiRuntimeProvider {
  readonly id: string;
  readonly label: string;
  readonly baseUrl: string;
  readonly models: readonly AiRuntimeModel[];
  readonly ready: boolean;
  readonly supportsByok: boolean;
}

export interface AiRuntimeConfig {
  readonly defaultProviderId: string;
  readonly providers: readonly AiRuntimeProvider[];
}

interface AiKeysCardProps {
  readonly aiView: SettingsState["aiView"];
  readonly aiRuntime: AiRuntimeConfig | null;
  readonly onUpdate: (input: SettingsUpdateInput) => void;
}

const fallbackProviderOptions: readonly AiProviderOption[] = aiModelConfig.providers.map(
  (provider) => ({
    id: provider.id,
    label: provider.label,
    description: provider.description,
    supportsByok: provider.supportsByok,
    badge: provider.badge,
  }),
);

const fallbackModelOptions: readonly AiModelOption[] = aiModelConfig.models.map((model) => ({
  id: model.id,
  providerId: model.providerId,
  label: model.label,
  description: model.description,
  tier: model.tier,
  tags: model.tags,
}));

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
  if (providerId === "openai-compatible") {
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
    return (
      <img src="/logos/gemini.svg" alt="" className={logoClassName} aria-hidden="true" />
    );
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
  return null;
}

function getAiOptionsFromRuntime(
  runtime: AiRuntimeConfig | null,
): { readonly providers: readonly AiProviderOption[]; readonly models: readonly AiModelOption[] } {
  if (!runtime || runtime.providers.length === 0) {
    return { providers: fallbackProviderOptions, models: fallbackModelOptions };
  }
  const providers: AiProviderOption[] = runtime.providers.map((provider) => {
    const badge: string | undefined =
      provider.id === runtime.defaultProviderId ? "Default" : undefined;
    const description: string = `Models configured for ${provider.label}.`;
    const option: AiProviderOption = {
      id: provider.id,
      label: provider.label,
      description,
      supportsByok: provider.supportsByok,
      badge,
    };
    return option;
  });
  const models: AiModelOption[] = [];
  for (const provider of runtime.providers) {
    for (const model of provider.models) {
      const id: string = model.alias ?? model.id;
      const kindTag: AiModelFilterTag = model.kind === "image" ? "image" : "text";
      const rawTags: readonly string[] = model.tags ?? [];
      const tags: AiModelFilterTag[] = [];
      for (const tag of rawTags) {
        if (tag === "text" || tag === "image" || tag === "fast" || tag === "quality" || tag === "local") {
          tags.push(tag);
        }
      }
      if (!tags.includes(kindTag)) {
        tags.push(kindTag);
      }
      let tier: "default" | "fast" | "quality" | "local" = "quality";
      if (model.alias === "balanced") {
        tier = "default";
      } else if (model.alias === "fast") {
        tier = "fast";
      } else if (tags.includes("local")) {
        tier = "local";
      }
      const option: AiModelOption = {
        id,
        providerId: provider.id,
        label: model.label,
        description: model.label,
        tier,
        tags,
      };
      models.push(option);
    }
  }
  return { providers, models };
}

export default function AiKeysCard(props: AiKeysCardProps): ReactElement {
  const { aiView, aiRuntime, onUpdate } = props;
  const [customModelId, setCustomModelId] = useState<string>("");
  const [customModelLabel, setCustomModelLabel] = useState<string>("");
  const [customKind, setCustomKind] = useState<"text" | "image">("text");
  const [customTier, setCustomTier] = useState<"default" | "fast" | "quality" | "local">("quality");
  const fromRuntime = getAiOptionsFromRuntime(aiRuntime);
  const providerOptions: readonly AiProviderOption[] = fromRuntime.providers.length
    ? fromRuntime.providers
    : fallbackProviderOptions;
  const baseModelOptions: readonly AiModelOption[] = fromRuntime.models.length
    ? fromRuntime.models
    : fallbackModelOptions;
  const customModelOptions: readonly AiModelOption[] = aiView.customModels.map(
    (model: AiCustomModel): AiModelOption => ({
      id: model.id,
      providerId: model.providerId,
      label: model.label,
      description: model.description,
      tier: model.tier,
      tags: model.tags,
    }),
  );
  const modelOptions: readonly AiModelOption[] = [...baseModelOptions, ...customModelOptions];
  const baseProviderId: string = providerOptions[0]?.id ?? "";
  const selectedProviderId: string = aiView.selectedProviderId || baseProviderId;
  const provider: AiProviderOption =
    providerOptions.find((option) => option.id === selectedProviderId) ?? providerOptions[0];
  const modelsForProvider: readonly AiModelOption[] = modelOptions.filter(
    (model) => model.providerId === provider.id,
  );
  const firstTextModel: AiModelOption | undefined = modelsForProvider.find(
    (model: AiModelOption): boolean => model.tags.includes("text"),
  );
  const hasSelectedModel: boolean = modelsForProvider.some(
    (model: AiModelOption): boolean => model.id === aiView.selectedModelId && model.tags.includes("text"),
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

  function handleSelectProvider(nextProviderId: string): void {
    const nextProvider: AiProviderOption | undefined = providerOptions.find(
      (option) => option.id === nextProviderId,
    );
    if (!nextProvider) {
      return;
    }
    const firstModel: AiModelOption | undefined = modelOptions.find(
      (model) => model.providerId === nextProvider.id,
    );
    const nextModelId: string = firstModel?.id ?? selectedModelId;
    onUpdate({ aiView: { selectedProviderId: nextProvider.id, selectedModelId: nextModelId } });
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
    onUpdate({ aiView: { byokKey: event.target.value, byokProvider: provider.id } });
  }

  function handleByokLabelChange(event: ChangeEvent<HTMLInputElement>): void {
    onUpdate({ aiView: { byokLabel: event.target.value } });
  }

  function handleModelFilterTagChange(nextTag: AiModelFilterTag | null): void {
    onUpdate({ aiView: { modelFilterTag: nextTag } });
  }

  function buildCustomModelTags(): readonly AiModelFilterTag[] {
    const tags: AiModelFilterTag[] = [];
    const kindTag: AiModelFilterTag = customKind;
    tags.push(kindTag);
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
      (model: AiCustomModel): boolean => !(model.id === trimmedId && model.providerId === provider.id),
    );
    const nextModel: AiCustomModel = {
      id: trimmedId,
      providerId: provider.id,
      label: trimmedLabel,
      description: trimmedLabel,
      tier: customTier,
      tags,
    };
    onUpdate({ aiView: { customModels: [...withoutDuplicate, nextModel] } });
    setCustomModelId("");
    setCustomModelLabel("");
  }

  const supportsByok: boolean = provider.supportsByok;

  return (
    <SettingsCard
      title="AI &amp; keys"
      description="Choose which provider and model Miro should use. Personal keys are stored on this device only."
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground">Provider</p>
          <p className="text-xs text-muted-foreground">
            Select where completions are served from. Server defaults come from your backend configuration.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
            {providerOptions.map((option) => {
              const active: boolean = option.id === provider.id;
              const baseClasses: string =
                "flex h-full w-full flex-col items-start rounded-2xl border px-4 py-3 text-left text-sm transition-colors";
              const activeClasses: string =
                `${baseClasses} border-sky-500/80 bg-sky-500/10 text-foreground`;
              const inactiveClasses: string =
                `${baseClasses} border-surface bg-surface-muted text-muted-foreground hover:border-sky-400/60`;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={(): void => handleSelectProvider(option.id)}
                  className={active ? activeClasses : inactiveClasses}
                  aria-pressed={active}
                >
                  <span className="text-sm font-semibold">{option.label}</span>
                  <span className="mt-0.5 text-xs text-muted-foreground">{option.description}</span>
                  {option.badge && (
                    <UiBadge tone="primary" className="mt-1">
                      {option.badge}
                    </UiBadge>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">Models</p>
          <p className="text-xs text-muted-foreground">
            Pick a model profile for this workspace. Adjust speed versus quality as needed.
          </p>
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
            {(["text", "image", "fast", "quality", "local"] as const).map((tagId: AiModelFilterTag) => {
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
              const icon: ReactElement = getModelFilterIcon(tagId);
              return (
                <PillButton
                  key={tagId}
                  variant="primary"
                  size="xs"
                  active={active}
                  onClick={(): void => handleModelFilterTagChange(tagId)}
                  ariaPressed={active}
                >
                  <span aria-hidden="true">{icon}</span>
                  <span className="hidden sm:inline">{label}</span>
                </PillButton>
              );
            })}
          </div>
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
                  key={model.id}
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
                    <span className="mt-0.5 text-xs text-muted-foreground">{model.description}</span>
                  </div>
                  <UiBadge tone="muted" className="ml-2">
                    {tierIcon && <span aria-hidden="true">{tierIcon}</span>}
                    <span>{tierLabel}</span>
                  </UiBadge>
                </button>
              );
            })}
          </div>
        </div>
        {supportsByok && (
          <div className="mt-4 rounded-2xl border border-dashed border-surface bg-surface px-4 py-3">
            <p className="text-sm font-semibold text-foreground">Bring your own key</p>
            <p className="text-xs text-muted-foreground">
              Stored only on this device. Used when calling this provider in dev and self-hosted deployments.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="block text-sm font-medium text-foreground">
                Personal API key
                <input
                  type="password"
                  defaultValue={aiView.byokKey}
                  onChange={handleByokKeyChange}
                  className="mt-1 w-full rounded-xl border border-surface bg-surface-muted px-4 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                />
              </label>
              <label className="block text-sm font-medium text-foreground">
                Label
                <input
                  type="text"
                  defaultValue={aiView.byokLabel}
                  onChange={handleByokLabelChange}
                  className="mt-1 w-full rounded-xl border border-surface bg-surface-muted px-4 py-2.5 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                />
              </label>
            </div>
          </div>
        )}
        <div className="border-t border-surface pt-3 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-3">
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={aiView.showProviderDetails}
                onChange={handleToggleShowProviderDetails}
                className="h-4 w-4 rounded border-surface bg-surface-muted text-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400"
              />
              <span>Show provider details in the header</span>
            </label>
            <label className="inline-flex items-center gap-2">
              <input
                type="checkbox"
                checked={aiView.showModelIds}
                onChange={handleToggleShowModelIds}
                className="h-4 w-4 rounded border-surface bg-surface-muted text-sky-500 focus-visible:ring-2 focus-visible:ring-sky-400"
              />
              <span>Show model IDs instead of friendly names</span>
            </label>
          </div>
        </div>
        <div className="mt-4 rounded-2xl border border-surface bg-surface-muted px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Custom models for {provider.label}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Add additional model IDs that your provider supports. These will appear above and in the model
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
                  const label: string = kind === "text" ? "Text" : "Image";
                  const icon: ReactElement = getModelFilterIcon(kind);
                  return (
                    <PillButton
                      key={kind}
                      variant="primary"
                      size="xs"
                      active={active}
                      onClick={(): void => setCustomKind(kind)}
                      ariaPressed={active}
                    >
                      <span aria-hidden="true">{icon}</span>
                      <span>{label}</span>
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
                ).map(
                  (
                    option: { readonly id: "default" | "fast" | "quality" | "local"; readonly label: string },
                  ) => {
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
                  },
                )}
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
    </SettingsCard>
  );
}
