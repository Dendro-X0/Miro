import type { ReactElement } from "react";
import type { AiModelFilterTag } from "../../../_settings-store";
import type { ModelSwitcherOption } from "../../../shell/types";

export interface ModelSwitcherPanelHandlers {
  readonly onChangeSearch: (value: string) => void;
  readonly onToggleFilters: () => void;
  readonly onSelectProvider: (id: string) => void;
  readonly onSelectFeature: (tag: AiModelFilterTag | "all") => void;
  readonly onSelectOption: (id: string) => void;
}

export interface ModelSwitcherPanelState {
  readonly open: boolean;
  readonly searchQuery: string;
  readonly filtersOpen: boolean;
  readonly providerSummaryLabel: string;
  readonly featureSummaryLabel: string;
}

export interface ModelSwitcherPanelProps {
  readonly state: ModelSwitcherPanelState;
  readonly handlers: ModelSwitcherPanelHandlers;
  readonly providers: readonly { readonly id: string; readonly label: string }[];
  readonly featureOptions: readonly { readonly id: AiModelFilterTag | "all"; readonly label: string }[];
  readonly providerFilterId: string;
  readonly featureFilter: AiModelFilterTag | "all";
  readonly visibleOptions: readonly ModelSwitcherOption[];
  readonly value: string;
  readonly imageModelId?: string;
  readonly getProviderIcon: (providerId: string) => ReactElement | null;
  readonly headerProviderIcon: ReactElement | null;
}
