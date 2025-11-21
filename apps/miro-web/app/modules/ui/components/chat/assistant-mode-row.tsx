"use client";

import type { ReactElement } from "react";
import { Globe2, Image as ImageIcon, MessageSquareText, Sparkles } from "lucide-react";
import UiKickerLabel from "../../../../ui/kicker-label";
import PillButton from "../../../../ui/pill-button";
import type { AssistantMode } from "../../../../shell/types";

interface AssistantModeOption {
  readonly id: AssistantMode;
  readonly label: string;
}

interface AssistantModeRowProps {
  readonly mode: AssistantMode;
  readonly onChangeMode: (mode: AssistantMode) => void;
  readonly webSearchEnabled: boolean;
  readonly onToggleWebSearch: () => void;
}

const assistantModeOptions: readonly AssistantModeOption[] = [
  { id: "auto", label: "Auto" },
  { id: "text", label: "Text" },
  { id: "image", label: "Image" },
  { id: "both", label: "Text + image" },
];

function getAssistantModeIcon(mode: AssistantMode): ReactElement | null {
  if (mode === "text") {
    return <MessageSquareText className="h-3 w-3" aria-hidden="true" />;
  }
  if (mode === "image") {
    return <ImageIcon className="h-3 w-3" aria-hidden="true" />;
  }
  if (mode === "both") {
    return <Sparkles className="h-3 w-3" aria-hidden="true" />;
  }
  return <Sparkles className="h-3 w-3" aria-hidden="true" />;
}

export default function AssistantModeRow(props: AssistantModeRowProps): ReactElement {
  const { mode, onChangeMode, webSearchEnabled, onToggleWebSearch } = props;
  return (
    <div className="mt-1 text-[11px] text-muted-foreground">
      <div className="flex items-center gap-1.5">
        <UiKickerLabel text="Mode" tone="muted" />
        <span>How Miro responds</span>
      </div>
      <div className="mt-1 relative">
        <div className="flex flex-nowrap gap-1.5 overflow-x-auto pb-1 chip-scroll-area">
          {assistantModeOptions.map((option: AssistantModeOption): ReactElement => {
            const active: boolean = mode === option.id;
            return (
              <PillButton
                key={option.id}
                variant="primary"
                size="xs"
                active={active}
                onClick={(): void => onChangeMode(option.id)}
                ariaPressed={active}
              >
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                  {getAssistantModeIcon(option.id)}
                  <span>{option.label}</span>
                </span>
              </PillButton>
            );
          })}
          <PillButton
            variant="surface"
            size="xs"
            active={webSearchEnabled}
            onClick={onToggleWebSearch}
            ariaPressed={webSearchEnabled}
          >
            <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
              <Globe2 className="h-3 w-3" aria-hidden="true" />
              <span>Web search</span>
            </span>
          </PillButton>
        </div>
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 chip-scroll-fade" />
      </div>
    </div>
  );
}
