"use client";

import type { ChangeEvent, ReactElement } from "react";
import { useMemo, useState } from "react";
import { ChevronDown, Filter, Image as ImageIcon, Search, Server, Sparkles, Zap } from "lucide-react";
import type { ModelSwitcherOption, ModelSwitcherProps } from "./types";
import type { AiModelFilterTag } from "../_settings-store";
import UiKickerLabel from "../ui/kicker-label";
import PillButton from "../ui/pill-button";

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

function getFeatureIcon(tag: AiModelFilterTag | "all"): ReactElement {
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

  const current: ModelSwitcherOption | undefined =
    options.find((option: ModelSwitcherOption): boolean => option.id === value) || options[0];

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

  function handleChangeSearch(event: ChangeEvent<HTMLInputElement>): void {
    const nextQuery: string = event.target.value;
    setSearchQuery(nextQuery);
  }

  const providerSummaryLabel: string =
    providerFilterId === "all"
      ? "All providers"
      : providers.find(
          (provider: { readonly id: string; readonly label: string }): boolean => {
            return provider.id === providerFilterId;
          },
        )?.label ?? "Filtered";

  const featureSummaryLabel: string =
    featureFilter === "all"
      ? "All capabilities"
      : featureOptions.find(
          (feature: { readonly id: AiModelFilterTag | "all"; readonly label: string }): boolean => {
            return feature.id === featureFilter;
          },
        )?.label ?? "Filtered";

  if (!current) {
    return (
      <div className="relative inline-flex items-center gap-2 rounded-full border border-surface bg-surface px-3.5 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur">
        <UiKickerLabel text="Model" tone="muted" />
        <span className="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-red-300">
          Model not found
        </span>
      </div>
    );
  }

  const currentProviderIcon: ReactElement | null = getProviderIcon(current.providerId);

  return (
    <div
      className={`relative inline-flex items-center rounded-full border border-surface bg-surface px-3.5 py-2 text-xs font-medium text-foreground shadow-lg backdrop-blur transition-colors ${
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
        <span className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-semibold text-foreground">
          {currentProviderIcon && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-surface" aria-hidden="true">
              {currentProviderIcon}
            </span>
          )}
          <span
            className={
              open
                ? "inline max-w-40 truncate"
                : "hidden max-w-40 truncate sm:inline"
            }
          >
            {current.label}
          </span>
        </span>
        <ChevronDown
          className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {ready === false && (
        <p className="ml-2 text-[10px] font-medium text-red-400">AI provider not connected</p>
      )}
      {open && (
        <div
          className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl bg-surface border border-surface text-xs shadow-xl ring-1 ring-slate-950/70"
          role="listbox"
          aria-label="Select model"
        >
          <div className="border-b border-surface-muted px-3 py-2">
            <label className="mb-2 flex items-center gap-2 rounded-xl bg-surface px-2 py-1.5 text-[11px] text-muted-foreground">
              <Search className="h-3.5 w-3.5" aria-hidden="true" />
              <input
                type="search"
                value={searchQuery}
                onChange={handleChangeSearch}
                placeholder="Search models..."
                className="h-6 flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
            </label>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <button
                type="button"
                onClick={handleToggleFilters}
                className="inline-flex items-center gap-1 rounded-full bg-surface px-2 py-0.5 hover:bg-surface-muted"
                aria-expanded={filtersOpen}
                aria-label="Toggle model filters"
              >
                <Filter className="h-3 w-3" aria-hidden="true" />
                <span>Filters</span>
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              <span className="hidden sm:inline">
                {providerSummaryLabel} · {featureSummaryLabel}
              </span>
            </div>
            {filtersOpen && (
              <div className="mt-2 space-y-1">
                <div className="flex flex-wrap gap-1">
                  <PillButton
                    variant="primary"
                    size="xs"
                    active={providerFilterId === "all"}
                    onClick={(): void => handleSelectProvider("all")}
                    ariaPressed={providerFilterId === "all"}
                  >
                    <span aria-hidden="true">
                      <Filter className="h-3 w-3" aria-hidden="true" />
                    </span>
                    <span className="hidden sm:inline">All</span>
                  </PillButton>
                  {providers.map(
                    (
                      provider: { readonly id: string; readonly label: string },
                    ): ReactElement => {
                      const active: boolean = provider.id === providerFilterId;
                      const icon: ReactElement | null = getProviderIcon(provider.id);
                      return (
                        <PillButton
                          key={provider.id}
                          variant="primary"
                          size="xs"
                          active={active}
                          onClick={(): void => handleSelectProvider(provider.id)}
                          ariaPressed={active}
                        >
                          {icon && <span aria-hidden="true">{icon}</span>}
                          <span className="hidden sm:inline">{provider.label}</span>
                        </PillButton>
                      );
                    },
                  )}
                </div>
                <div className="flex flex-wrap gap-1">
                  {featureOptions.map(
                    (
                      feature: { readonly id: AiModelFilterTag | "all"; readonly label: string },
                    ): ReactElement => {
                      const isActiveAll: boolean = feature.id === "all" && featureFilter === "all";
                      const isActiveTag: boolean =
                        feature.id !== "all" && feature.id === featureFilter;
                      const active: boolean = isActiveAll || isActiveTag;
                      return (
                        <PillButton
                          key={feature.id}
                          variant="primary"
                          size="xs"
                          active={active}
                          onClick={(): void => handleSelectFeature(feature.id)}
                          ariaPressed={active}
                        >
                          <span aria-hidden="true">{getFeatureIcon(feature.id)}</span>
                          <span className="hidden sm:inline">{feature.label}</span>
                        </PillButton>
                      );
                    },
                  )}
                </div>
              </div>
            )}
          </div>
          <div className="max-h-72 space-y-0.5 overflow-y-auto py-1">
            {visibleOptions.length === 0 ? (
              <div className="px-3 py-2 text-[11px] text-muted-foreground">
                No models found. Try a different search or filter.
              </div>
            ) : (
              visibleOptions.map((option: ModelSwitcherOption) => {
                const isActiveText: boolean = option.id === value;
                const isActiveImage: boolean =
                  imageModelId !== undefined &&
                  option.id === imageModelId &&
                  option.tags.includes("image");
                const active: boolean = isActiveText || isActiveImage;
                const baseClasses: string =
                  "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition-colors";
                const activeClasses: string = "bg-sky-500/15 text-foreground";
                const inactiveClasses: string =
                  "text-muted-foreground hover:bg-surface-muted";
                const providerIcon: ReactElement | null = getProviderIcon(option.providerId);
                const providerLabelClass: string = active
                  ? "text-[10px] text-slate-800 dark:text-sky-200"
                  : "text-[10px] text-muted-foreground";
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={(): void => handleSelect(option.id)}
                    className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface" aria-hidden="true">
                        {providerIcon ?? <Sparkles className="h-3 w-3" aria-hidden="true" />}
                      </span>
                      <div className="flex flex-col text-xs">
                        <span className="font-medium">{option.label}</span>
                        <span className={providerLabelClass}>
                          {option.providerLabel}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="flex gap-0.5 text-[10px] text-muted-foreground" aria-hidden="true">
                        {option.tags.includes("text") && (
                          <Sparkles className="h-3 w-3" />
                        )}
                        {option.tags.includes("image") && (
                          <ImageIcon className="h-3 w-3" />
                        )}
                        {option.tags.includes("fast") && <Zap className="h-3 w-3" />}
                        {option.tags.includes("quality") && !option.tags.includes("fast") && (
                          <Sparkles className="h-3 w-3" />
                        )}
                        {option.tags.includes("local") && <Server className="h-3 w-3" />}
                      </div>
                      {active && (
                        <span
                          className="h-1.5 w-1.5 rounded-full bg-sky-400"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
