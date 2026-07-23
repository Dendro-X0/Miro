import type { ReactElement } from "react";
import type { PlaceholderViewProps } from "./types";
import PageFrame from "./page-frame";

export default function PlaceholderView(props: PlaceholderViewProps): ReactElement {
  const { title, description } = props;
  return (
    <PageFrame title={title} description={description}>
      <div className="flex flex-1 items-center justify-center rounded-2xl border border-dashed border-surface bg-surface-muted/40 px-4 text-center">
        <p className="max-w-md text-sm text-muted-foreground">
          This section is reserved for a later release.
        </p>
      </div>
    </PageFrame>
  );
}
