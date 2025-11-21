"use client";

import type { ReactElement, ChangeEvent } from "react";
import { Filter, Search, ChevronDown, Image as ImageIcon, Sparkles, Zap, Server } from "lucide-react";
import PillButton from "../../../../ui/pill-button";
import type { AiModelFilterTag } from "../../../../_settings-store";
import type { ModelSwitcherOption } from "../../../../shell/types";
import type { ModelSwitcherPanelProps } from "../../lib/model-switcher-types";

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

function handleChangeSearchInternal(
  event: ChangeEvent<HTMLInputElement>,
  onChangeSearch: (value: string) => void,
): void {
  const nextQuery: string = event.target.value;
  onChangeSearch(nextQuery);
}

export default function ModelSwitcherPanel(props: ModelSwitcherPanelProps): ReactElement | null {
  const {
    state,
    handlers,
    providers,
    featureOptions,
    providerFilterId,
    featureFilter,
    visibleOptions,
    value,
    imageModelId,
    getProviderIcon,
    headerProviderIcon,
  } = props;
  const { open, searchQuery, filtersOpen, providerSummaryLabel, featureSummaryLabel } = state;
  if (!open) {
    return null;
  }
  const { onChangeSearch, onToggleFilters, onSelectProvider, onSelectFeature, onSelectOption } = handlers;
  return (
    <div
      className="model-switcher-panel fixed inset-x-3 top-20 bottom-28 z-40 mx-auto flex flex-col rounded-2xl bg-surface border border-surface text-xs shadow-xl ring-1 ring-slate-950/70 sm:absolute sm:inset-auto sm:left-auto sm:right-0 sm:top-full sm:bottom-auto sm:mt-2 sm:w-72 sm:mx-0 sm:flex-none"
      role="listbox"
      aria-label="Select model"
    >
      <div className="border-b border-surface-muted px-3 py-2">
        <label className="mb-2 flex items-center gap-2 rounded-xl bg-surface px-2 py-1.5 text-[11px] text-muted-foreground">
          <Search className="h-3.5 w-3.5" aria-hidden="true" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event: ChangeEvent<HTMLInputElement>): void => handleChangeSearchInternal(event, onChangeSearch)}
            placeholder="Search models..."
            className="h-6 flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </label>
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          <div className="relative inline-flex">
            <button
              type="button"
              onClick={onToggleFilters}
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
          </div>
          <span className="hidden sm:inline">
            {providerSummaryLabel} · {featureSummaryLabel}
          </span>
        </div>
        <p className="mt-1 text-[10px] text-muted-foreground">
          Select a text model and an optional image model. Miro can use both based on the mode.
        </p>
        {filtersOpen && (
          <div className="mt-2 sm:hidden">
            <div className="space-y-1">
              <div className="flex flex-wrap gap-1">
                <PillButton
                  variant="primary"
                  size="xs"
                  active={providerFilterId === "all"}
                  onClick={(): void => onSelectProvider("all")}
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
                    return (
                      <PillButton
                        key={provider.id}
                        variant="primary"
                        size="xs"
                        active={active}
                        onClick={(): void => onSelectProvider(provider.id)}
                        ariaPressed={active}
                      >
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
                    const isActiveTag: boolean = feature.id !== "all" && feature.id === featureFilter;
                    const active: boolean = isActiveAll || isActiveTag;
                    return (
                      <PillButton
                        key={feature.id}
                        variant="primary"
                        size="xs"
                        active={active}
                        onClick={(): void => onSelectFeature(feature.id)}
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
          </div>
        )}
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto py-1 scroll-area chat-scroll-touch sm:max-h-72">
        {visibleOptions.length === 0 ? (
          <div className="px-3 py-2 text-[11px] text-muted-foreground">
            No models found. Try a different search or filter.
          </div>
        ) : (
          visibleOptions.map((option: ModelSwitcherOption): ReactElement => {
            const isActiveText: boolean = option.id === value;
            const isActiveImage: boolean =
              imageModelId !== undefined && option.id === imageModelId && option.tags.includes("image");
            const active: boolean = isActiveText || isActiveImage;
            const baseClasses: string =
              "flex w-full items-center justify-between rounded-2xl px-3 py-2 text-left transition-colors";
            const activeClasses: string = "bg-sky-500/15 text-foreground";
            const inactiveClasses: string = "text-muted-foreground hover:bg-surface-muted";
            const providerIcon: ReactElement | null = getProviderIcon(option.providerId) ?? headerProviderIcon;
            const providerLabelClass: string = active
              ? "text-[10px] text-slate-800 dark:text-sky-200"
              : "text-[10px] text-muted-foreground";
            return (
              <button
                key={option.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={(): void => onSelectOption(option.id)}
                className={`${baseClasses} ${active ? activeClasses : inactiveClasses}`}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-surface" aria-hidden="true">
                    {providerIcon ?? <Sparkles className="h-3 w-3" aria-hidden="true" />}
                  </span>
                  <div className="flex flex-col text-xs">
                    <span className="font-medium">{option.label}</span>
                    <span className={providerLabelClass}>{option.providerLabel}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <div className="flex gap-0.5 text-[10px] text-muted-foreground" aria-hidden="true">
                    {option.tags.includes("text") && <Sparkles className="h-3 w-3" />}
                    {option.tags.includes("image") && <ImageIcon className="h-3 w-3" />}
                    {option.tags.includes("fast") && <Zap className="h-3 w-3" />}
                    {option.tags.includes("quality") && !option.tags.includes("fast") && (
                      <Sparkles className="h-3 w-3" />
                    )}
                    {option.tags.includes("local") && <Server className="h-3 w-3" />}
                  </div>
                  {isActiveText && (
                    <span className="rounded-full bg-sky-500/20 px-1.5 py-0.5 text-[10px] text-sky-200">
                      Text
                    </span>
                  )}
                  {isActiveImage && (
                    <span className="rounded-full bg-emerald-500/20 px-1.5 py-0.5 text-[10px] text-emerald-200">
                      Image
                    </span>
                  )}
                  {active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400" aria-hidden="true" />
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
