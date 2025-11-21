"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import { ChevronDown, Image as ImageIcon, Sparkles } from "lucide-react";
import type { ModelSwitcherOption, ModelSwitcherProps } from "./types";
import type { AiModelFilterTag } from "../_settings-store";
import UiKickerLabel from "../ui/kicker-label";
import ModelSwitcherPanel from "../modules/ui/components/model/model-switcher-panel";
import type {
  ModelSwitcherPanelHandlers,
  ModelSwitcherPanelState,
} from "../modules/ui/lib/model-switcher-types";

function getProviderIcon(providerId: string): ReactElement | null {
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

export default function ModelSwitcher(props: ModelSwitcherProps): ReactElement {
  const { value, onChange, imageModelId, onChangeImageModel, options, ready } = props;
  const [open, setOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [providerFilterId, setProviderFilterId] = useState<string>("all");
  const [featureFilter, setFeatureFilter] = useState<AiModelFilterTag | "all">("all");

  const providers = useMemo(
    (): readonly { readonly id: string; readonly label: string }[] => {
      const seen: Set<string> = new Set<string>();
      const result: { readonly id: string; readonly label: string }[] = [];
      for (const option of options) {
        if (seen.has(option.providerId)) {
          continue;
        }
        seen.add(option.providerId);
        result.push({ id: option.providerId, label: option.providerLabel });
      }
      return result;
    },
    [options],
  );

  const featureOptions: readonly { readonly id: AiModelFilterTag | "all"; readonly label: string }[] = useMemo(
    (): readonly { readonly id: AiModelFilterTag | "all"; readonly label: string }[] => {
      return [
        { id: "all", label: "All" },
        { id: "text", label: "Text" },
        { id: "image", label: "Image" },
        { id: "fast", label: "Fast" },
        { id: "quality", label: "Quality" },
        { id: "local", label: "Local" },
      ];
    },
    [],
  );

  const providerAndFeatureFilteredOptions: readonly ModelSwitcherOption[] = useMemo(
    (): readonly ModelSwitcherOption[] => {
      const byProvider: readonly ModelSwitcherOption[] = options.filter(
        (option: ModelSwitcherOption): boolean => {
          if (providerFilterId === "all") {
            return true;
          }
          return option.providerId === providerFilterId;
        },
      );
      if (featureFilter === "all") {
        return byProvider;
      }
      return byProvider.filter((option: ModelSwitcherOption): boolean => {
        return option.tags.includes(featureFilter);
      });
    },
    [featureFilter, options, providerFilterId],
  );

  const visibleOptions: readonly ModelSwitcherOption[] = useMemo(
    (): readonly ModelSwitcherOption[] => {
      const base: readonly ModelSwitcherOption[] =
        providerAndFeatureFilteredOptions.length > 0 ? providerAndFeatureFilteredOptions : options;
      const trimmedQuery: string = searchQuery.trim().toLowerCase();
      if (!trimmedQuery) {
        return base;
      }
      return base.filter((option: ModelSwitcherOption): boolean => {
        const combined: string = `${option.label} ${option.providerLabel} ${option.id}`.toLowerCase();
        return combined.includes(trimmedQuery);
      });
    },
    [options, providerAndFeatureFilteredOptions, searchQuery],
  );
  const currentTextModel: ModelSwitcherOption | undefined =
    options.find((option: ModelSwitcherOption): boolean => option.id === value) ?? undefined;
  const currentImageModel: ModelSwitcherOption | undefined =
    imageModelId !== undefined
      ? options.find(
          (option: ModelSwitcherOption): boolean =>
            option.id === imageModelId && option.tags.includes("image"),
        ) ?? undefined
      : undefined;

  const providerSummaryLabel: string =
    providerFilterId === "all"
      ? "All providers"
      : providers.find(
          (provider: { readonly id: string; readonly label: string }): boolean =>
            provider.id === providerFilterId,
        )?.label ?? "Filtered";

  const featureSummaryLabel: string =
    featureFilter === "all"
      ? "All capabilities"
      : featureOptions.find(
          (feature: { readonly id: AiModelFilterTag | "all"; readonly label: string }): boolean =>
            feature.id === featureFilter,
        )?.label ?? "Filtered";

  const providerForIcon: ModelSwitcherOption | undefined =
    currentTextModel ?? currentImageModel ?? options[0];
  const currentProviderIcon: ReactElement | null = providerForIcon
    ? getProviderIcon(providerForIcon.providerId)
    : null;

  if (!currentTextModel && !currentImageModel && options.length === 0) {
    return (
      <div className="relative inline-flex items-center gap-2 rounded-full border border-surface bg-surface px-3.5 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur">
        <UiKickerLabel text="Model" tone="muted" />
        <span className="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-red-300">
          Model not found
        </span>
      </div>
    );
  }

  function handleToggle(): void {
    setOpen((previous: boolean): boolean => !previous);
  }

  function handleToggleFilters(): void {
    setFiltersOpen((previous: boolean): boolean => !previous);
  }

  function handleSelect(id: string): void {
    const option: ModelSwitcherOption | undefined = options.find(
      (candidate: ModelSwitcherOption): boolean => candidate.id === id,
    );
    if (!option) {
      return;
    }
    const hasText: boolean = option.tags.includes("text");
    const hasImage: boolean = option.tags.includes("image");
    if (hasImage && !hasText && onChangeImageModel) {
      onChangeImageModel(id);
    } else {
      onChange(id);
    }
    setOpen(false);
  }

  function handleSelectProvider(id: string): void {
    setProviderFilterId(id);
  }

  function handleSelectFeature(tag: AiModelFilterTag | "all"): void {
    if (tag === "all") {
      setFeatureFilter("all");
      return;
    }
    setFeatureFilter(tag);
  }

  const panelState: ModelSwitcherPanelState = {
    open,
    searchQuery,
    filtersOpen,
    providerSummaryLabel,
    featureSummaryLabel,
  };

  const panelHandlers: ModelSwitcherPanelHandlers = {
    onChangeSearch: (value: string): void => {
      setSearchQuery(value);
    },
    onToggleFilters: handleToggleFilters,
    onSelectProvider: handleSelectProvider,
    onSelectFeature: handleSelectFeature,
    onSelectOption: handleSelect,
  };

  return (
    <div
      className={`relative inline-flex max-w-[min(16rem,100%)] shrink items-center rounded-full border border-surface bg-surface px-3.5 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur transition-colors sm:max-w-none sm:shrink-0 ${
        open ? "border-sky-400/80 bg-surface-muted" : "hover:border-sky-400/80"
      }`}
    >
      <button
        type="button"
        onClick={handleToggle}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      >
        <UiKickerLabel text="Model" tone="muted" />
        <span className="inline-flex items-center gap-2 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
          {currentProviderIcon && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface" aria-hidden="true">
              {currentProviderIcon}
            </span>
          )}
          <span className="hidden max-w-36 truncate sm:inline">
            {currentTextModel ? currentTextModel.label : providerForIcon.label}
          </span>
        </span>
        {currentImageModel && (
          <span className="ml-1 hidden items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[10px] text-emerald-200 sm:inline-flex">
            <ImageIcon className="h-3 w-3" aria-hidden="true" />
            <span className="hidden sm:inline">Image</span>
          </span>
        )}
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {ready === false && (
        <p className="ml-2 text-[10px] font-medium text-red-400">AI provider not connected</p>
      )}
      <ModelSwitcherPanel
        state={panelState}
        handlers={panelHandlers}
        providers={providers}
        featureOptions={featureOptions}
        providerFilterId={providerFilterId}
        featureFilter={featureFilter}
        visibleOptions={visibleOptions}
        value={value}
        imageModelId={imageModelId}
        getProviderIcon={getProviderIcon}
        headerProviderIcon={currentProviderIcon}
      />
    </div>
  );
}
