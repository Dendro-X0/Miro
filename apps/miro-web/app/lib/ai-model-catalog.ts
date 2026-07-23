import type {
  AiCustomModel,
  AiDiscoveredModel,
  AiModelFilterTag,
  AiRuntimeConfig,
  AiRuntimeModel,
} from "@miro/core";
import type { ModelSwitcherOption } from "../shell/types";

export interface CatalogModelOption {
  readonly id: string;
  readonly providerId: string;
  readonly label: string;
  readonly description: string;
  readonly tier: "default" | "fast" | "quality" | "local";
  readonly tags: readonly AiModelFilterTag[];
  readonly source: "discovered" | "runtime" | "custom";
}

export interface BuildModelCatalogInput {
  readonly runtime: AiRuntimeConfig | null;
  readonly discoveredByProvider: Readonly<Record<string, readonly AiDiscoveredModel[]>>;
  readonly customModels: readonly AiCustomModel[];
}

/** Stable React list key — model IDs repeat across providers (e.g. openai vs openai-compatible). */
export function modelOptionKey(providerId: string, modelId: string): string {
  return `${providerId}:${modelId}`;
}

function providerLabelFromRuntime(
  runtime: AiRuntimeConfig | null,
  providerId: string,
): string {
  const provider = runtime?.providers.find((entry) => entry.id === providerId);
  if (providerId === "openai") {
    return "OpenAI";
  }
  if (providerId === "openai-compatible") {
    return "Custom";
  }
  if (providerId === "local") {
    return "Local";
  }
  if (providerId === "comfyui") {
    return "ComfyUI";
  }
  if (providerId === "anthropic") {
    return "Anthropic";
  }
  if (providerId === "google") {
    return "Google";
  }
  if (provider) {
    return provider.label;
  }
  return providerId;
}

function runtimeModelToOption(
  providerId: string,
  providerLabel: string,
  model: AiRuntimeModel,
): CatalogModelOption {
  const kindTag: AiModelFilterTag = model.kind === "image" ? "image" : "text";
  const tags: AiModelFilterTag[] = [];
  for (const tag of model.tags ?? []) {
    if (
      tag === "text" ||
      tag === "image" ||
      tag === "fast" ||
      tag === "quality" ||
      tag === "local"
    ) {
      tags.push(tag);
    }
  }
  if (!tags.includes(kindTag)) {
    tags.push(kindTag);
  }
  let tier: CatalogModelOption["tier"] = "quality";
  if (model.alias === "balanced") {
    tier = "default";
  } else if (model.alias === "fast") {
    tier = "fast";
  } else if (tags.includes("local")) {
    tier = "local";
  }
  return {
    id: model.id,
    providerId,
    label: model.label,
    description: model.label,
    tier,
    tags,
    source: "runtime",
  };
}

function discoveredModelToOption(
  providerId: string,
  providerLabel: string,
  model: AiDiscoveredModel,
): CatalogModelOption {
  const tags: AiModelFilterTag[] = [];
  for (const tag of model.tags ?? []) {
    if (
      tag === "text" ||
      tag === "image" ||
      tag === "fast" ||
      tag === "quality" ||
      tag === "local"
    ) {
      tags.push(tag);
    }
  }
  const kindTag: AiModelFilterTag = model.kind === "image" ? "image" : "text";
  if (!tags.includes(kindTag)) {
    tags.push(kindTag);
  }
  let tier: CatalogModelOption["tier"] = "quality";
  if (tags.includes("fast")) {
    tier = "fast";
  } else if (tags.includes("local")) {
    tier = "local";
  }
  return {
    id: model.id,
    providerId,
    label: model.label,
    description: `${model.label} · ${providerLabel}`,
    tier,
    tags,
    source: "discovered",
  };
}

function customModelToOption(model: AiCustomModel): CatalogModelOption {
  return {
    id: model.id,
    providerId: model.providerId,
    label: model.label,
    description: model.description,
    tier: model.tier,
    tags: model.tags,
    source: "custom",
  };
}

function dedupeCatalogOptions(options: readonly CatalogModelOption[]): CatalogModelOption[] {
  const seen = new Set<string>();
  const result: CatalogModelOption[] = [];
  for (const option of options) {
    const key = `${option.providerId}:${option.id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(option);
  }
  return result;
}

export function buildModelCatalog(input: BuildModelCatalogInput): readonly CatalogModelOption[] {
  const { runtime, discoveredByProvider, customModels } = input;
  const options: CatalogModelOption[] = [];

  const providerIds = new Set<string>();
  for (const provider of runtime?.providers ?? []) {
    providerIds.add(provider.id);
  }
  for (const providerId of Object.keys(discoveredByProvider)) {
    providerIds.add(providerId);
  }
  for (const model of customModels) {
    providerIds.add(model.providerId);
  }

  for (const providerId of providerIds) {
    const providerLabel = providerLabelFromRuntime(runtime, providerId);
    const discovered = discoveredByProvider[providerId] ?? [];
    if (discovered.length > 0) {
      for (const model of discovered) {
        options.push(discoveredModelToOption(providerId, providerLabel, model));
      }
      continue;
    }
    const runtimeProvider = runtime?.providers.find((entry) => entry.id === providerId);
    for (const model of runtimeProvider?.models ?? []) {
      options.push(runtimeModelToOption(providerId, providerLabel, model));
    }
  }

  for (const model of customModels) {
    options.push(customModelToOption(model));
  }

  return dedupeCatalogOptions(options);
}

export function toModelSwitcherOptions(
  catalog: readonly CatalogModelOption[],
  runtime: AiRuntimeConfig | null,
): readonly ModelSwitcherOption[] {
  return catalog.map((option) => ({
    id: option.id,
    label: option.label,
    providerId: option.providerId,
    providerLabel: providerLabelFromRuntime(runtime, option.providerId),
    tags: option.tags,
  }));
}

export function findProviderRuntime(
  runtime: AiRuntimeConfig | null,
  providerId: string,
): { readonly ready: boolean; readonly baseUrl: string } {
  const provider = runtime?.providers.find((entry) => entry.id === providerId);
  return {
    ready: provider?.ready ?? (providerId === "local" || providerId === "comfyui" || providerId === "mock"),
    baseUrl: provider?.baseUrl ?? "",
  };
}

export function providerHasCredentials(
  runtime: AiRuntimeConfig | null,
  providerId: string,
  byokKey: string,
  byokProvider: string | null,
): boolean {
  if (providerId === "mock" || providerId === "local" || providerId === "comfyui") {
    return true;
  }
  if (byokKey.trim().length > 0 && (!byokProvider || byokProvider === providerId)) {
    return true;
  }
  const provider = runtime?.providers.find((entry) => entry.id === providerId);
  return provider?.ready ?? false;
}
