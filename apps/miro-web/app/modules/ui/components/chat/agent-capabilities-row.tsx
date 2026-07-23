"use client";

import type { ReactElement } from "react";
import { Brain, Globe } from "lucide-react";
import UiKickerLabel from "../../../../ui/kicker-label";
import PillButton from "../../../../ui/pill-button";

interface AgentCapabilitiesRowProps {
  readonly enableWebSearch: boolean;
  readonly enableMemory: boolean;
  readonly onToggleWebSearch: (enabled: boolean) => void;
  readonly onToggleMemory: (enabled: boolean) => void;
}

export default function AgentCapabilitiesRow(props: AgentCapabilitiesRowProps): ReactElement {
  const { enableWebSearch, enableMemory, onToggleWebSearch, onToggleMemory } = props;

  return (
    <div className="mt-1 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <UiKickerLabel text="Agent" tone="muted" />
        <span>Capabilities</span>
      </div>
      <div className="mt-1 flex flex-wrap gap-1.5">
        <PillButton
          variant="primary"
          size="xs"
          active={enableWebSearch}
          onClick={(): void => onToggleWebSearch(!enableWebSearch)}
          ariaPressed={enableWebSearch}
        >
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Globe className="h-3 w-3" aria-hidden="true" />
            <span>Web search</span>
          </span>
        </PillButton>
        <PillButton
          variant="primary"
          size="xs"
          active={enableMemory}
          onClick={(): void => onToggleMemory(!enableMemory)}
          ariaPressed={enableMemory}
        >
          <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
            <Brain className="h-3 w-3" aria-hidden="true" />
            <span>Memory</span>
          </span>
        </PillButton>
      </div>
    </div>
  );
}
