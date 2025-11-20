"use client";

import type { ReactElement } from "react";
import SettingsCard from "../ui/settings-card";

export default function AboutCard(): ReactElement {
  return (
    <SettingsCard title="About">
      <p className="text-sm text-muted-foreground">
        Miro AI Workspace is an experimental, open-source generative workspace. This build is intended for local use
        and self-hosting; authentication and subscriptions will arrive in a future version.
      </p>
    </SettingsCard>
  );
}
