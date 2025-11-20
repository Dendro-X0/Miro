import type { ReactElement } from "react";
import type { PlaceholderViewProps } from "./types";

export default function PlaceholderView(props: PlaceholderViewProps): ReactElement {
  const { title, description } = props;
  return (
    <section className="flex min-h-0 flex-1 items-center justify-center px-4 text-center">
      <div className="max-w-md">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      </div>
    </section>
  );
}
