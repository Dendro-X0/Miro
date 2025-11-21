"use client";

import type { ReactElement } from "react";
import { useMemo, useState } from "react";
import type { ModelSwitcherOption, ModelSwitcherProps } from "./types";
import type { AiModelFilterTag } from "../_settings-store";
import UiKickerLabel from "../ui/kicker-label";
import ModelSwitcherPanelMobile from "../modules/ui/components/model/model-switcher-panel-mobile";
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
  return null;
}

export default function MobileModelSelector(props: ModelSwitcherProps): ReactElement {
  const { value, onChange, imageModelId, onChangeImageModel, options, ready } = props;
  const [open, setOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [filtersOpen, setFiltersOpen] = useState<boolean>(false);
  const [providerFilterId, setProviderFilterId] = useState<string>("all");
  const [featureFilter, setFeatureFilter] = useState<AiModelFilterTag | "all">("all");

  const providers: readonly { readonly id: string; readonly label: string }[] = useMemo(
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

  function handleToggle(): void {
    setOpen((previous: boolean): boolean => !previous);
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
    onChangeSearch: (valueSearch: string): void => {
      setSearchQuery(valueSearch);
    },
    onToggleFilters: (): void => {
      setFiltersOpen((previous: boolean): boolean => !previous);
    },
    onSelectProvider: handleSelectProvider,
    onSelectFeature: handleSelectFeature,
    onSelectOption: handleSelect,
  };

  const currentLabel: string = currentTextModel ? currentTextModel.label : "Choose a model";

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={handleToggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={currentTextModel ? `Change model (${currentLabel})` : "Choose model"}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-surface bg-surface-muted px-3 text-[11px] text-foreground hover:border-sky-400/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
      >
        <UiKickerLabel text="Model" tone="muted" />
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-surface" aria-hidden="true">
          {currentProviderIcon ?? <span className="h-2 w-2 rounded-full bg-sky-400" />}
        </span>
      </button>
      {open && (
        <ModelSwitcherPanelMobile
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
      )}
    </div>
  );
}
