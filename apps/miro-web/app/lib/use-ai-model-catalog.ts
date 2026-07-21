"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AiDiscoveredModel, AiRuntimeConfig, AiViewSettings } from "@miro/core";
import { miroApi } from "./miro-api";
import {
  buildModelCatalog,
  findProviderRuntime,
  providerHasCredentials,
  toModelSwitcherOptions,
  type CatalogModelOption,
} from "./ai-model-catalog";
import type { ModelSwitcherOption } from "../shell/types";

export interface UseAiModelCatalogResult {
  readonly runtime: AiRuntimeConfig | null;
  readonly catalog: readonly CatalogModelOption[];
  readonly switcherOptions: readonly ModelSwitcherOption[];
  readonly loading: boolean;
  readonly discoveryError: string | null;
  readonly discoveredCount: number;
  readonly refresh: () => void;
}

export function useAiModelCatalog(aiView: AiViewSettings): UseAiModelCatalogResult {
  const [runtime, setRuntime] = useState<AiRuntimeConfig | null>(null);
  const [discoveredByProvider, setDiscoveredByProvider] = useState<
    Record<string, readonly AiDiscoveredModel[]>
  >({});
  const [loading, setLoading] = useState<boolean>(false);
  const [discoveryError, setDiscoveryError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<number>(0);

  const selectedProviderId = aiView.selectedProviderId;
  const byokKey = aiView.byokKey;
  const byokProvider = aiView.byokProvider;
  const byokBaseUrl = aiView.byokBaseUrl;
  const customModels = aiView.customModels;

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const body = await miroApi.fetchConfig();
        if (!active) {
          return;
        }
        setRuntime(body.runtime ?? null);
      } catch {
        if (active) {
          setRuntime(null);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const discoverModels = useCallback(async (): Promise<void> => {
    if (!selectedProviderId) {
      return;
    }
    if (!providerHasCredentials(runtime, selectedProviderId, byokKey, byokProvider)) {
      setDiscoveredByProvider((previous) => {
        const next = { ...previous };
        delete next[selectedProviderId];
        return next;
      });
      setDiscoveryError(null);
      return;
    }

    setLoading(true);
    setDiscoveryError(null);
    try {
      const runtimeProvider = findProviderRuntime(runtime, selectedProviderId);
      const response = await miroApi.listModels({
        provider: selectedProviderId,
        byokKey: byokKey.trim() || undefined,
        baseUrl: byokBaseUrl.trim() || runtimeProvider.baseUrl || undefined,
      });
      setDiscoveredByProvider((previous) => ({
        ...previous,
        [selectedProviderId]: response.models,
      }));
      if (response.error) {
        setDiscoveryError(response.error);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to discover models";
      setDiscoveryError(message);
      setDiscoveredByProvider((previous) => {
        const next = { ...previous };
        delete next[selectedProviderId];
        return next;
      });
    } finally {
      setLoading(false);
    }
  }, [byokBaseUrl, byokKey, byokProvider, refreshToken, runtime, selectedProviderId]);

  useEffect(() => {
    void discoverModels();
  }, [discoverModels]);

  const catalog = useMemo(
    () =>
      buildModelCatalog({
        runtime,
        discoveredByProvider,
        customModels,
      }),
    [customModels, discoveredByProvider, runtime],
  );

  const switcherOptions = useMemo(
    () => toModelSwitcherOptions(catalog, runtime),
    [catalog, runtime],
  );

  const discoveredCount = discoveredByProvider[selectedProviderId]?.length ?? 0;

  const refresh = useCallback((): void => {
    setRefreshToken((value) => value + 1);
  }, []);

  return {
    runtime,
    catalog,
    switcherOptions,
    loading,
    discoveryError,
    discoveredCount,
    refresh,
  };
}
