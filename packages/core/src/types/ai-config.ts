export interface AiModelsConfig {
  readonly fast: string;
  readonly balanced: string;
  readonly creative: string;
}

export interface AiRuntimeModel {
  readonly id: string;
  readonly alias?: string;
  readonly kind: "text" | "image";
  readonly label: string;
  readonly tags?: readonly string[];
}

export interface AiRuntimeProvider {
  readonly id: string;
  readonly label: string;
  readonly baseUrl: string;
  readonly models: readonly AiRuntimeModel[];
  readonly ready: boolean;
  readonly supportsByok: boolean;
}

export interface AiRuntimeConfig {
  readonly defaultProviderId: string;
  readonly providers: readonly AiRuntimeProvider[];
}

export interface AiModelsListRequest {
  readonly provider: string;
  readonly byokKey?: string;
  readonly baseUrl?: string;
}

export interface AiDiscoveredModel {
  readonly id: string;
  readonly label: string;
  readonly kind: "text" | "image";
  readonly tags?: readonly string[];
}

export interface AiModelsListResponse {
  readonly provider: string;
  readonly models: readonly AiDiscoveredModel[];
  readonly cached: boolean;
  readonly error?: string;
}

export interface AiConfigResponse {
  readonly provider: string;
  readonly models: AiModelsConfig;
  readonly ready: boolean;
  readonly runtime?: AiRuntimeConfig;
}
