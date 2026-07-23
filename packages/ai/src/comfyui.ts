import type { AiImageClient, AiImageParams, AiImageResult, ImageClientConfig } from "./image";

export const DEFAULT_COMFYUI_BASE_URL = "http://127.0.0.1:8188";

const POLL_INTERVAL_MS = 750;
const MAX_POLL_MS = 180_000;

interface ComfyHistoryImage {
  readonly filename: string;
  readonly subfolder?: string;
  readonly type?: string;
}

interface ComfyHistoryEntry {
  readonly outputs?: Record<
    string,
    {
      readonly images?: readonly ComfyHistoryImage[];
    }
  >;
  readonly status?: {
    readonly status_str?: string;
    readonly completed?: boolean;
  };
}

function toDataUrl(buffer: ArrayBuffer, mime = "image/png"): string {
  const b64 = Buffer.from(buffer).toString("base64");
  return `data:${mime};base64,${b64}`;
}

function resolveComfyBaseUrl(baseUrl: string | undefined): string {
  const trimmed = baseUrl?.trim();
  if (trimmed) {
    return trimmed.replace(/\/$/, "");
  }
  return DEFAULT_COMFYUI_BASE_URL;
}

function parseSize(size: string | undefined): { readonly width: number; readonly height: number } {
  const raw = (size ?? "512x512").trim().toLowerCase();
  const match = /^(\d+)\s*x\s*(\d+)$/.exec(raw);
  if (!match) {
    return { width: 512, height: 512 };
  }
  const width = Math.min(Math.max(Number(match[1]), 64), 2048);
  const height = Math.min(Math.max(Number(match[2]), 64), 2048);
  return { width, height };
}

/** Curated txt2img graph — CheckpointLoader → CLIP → KSampler → VAE → SaveImage. */
export function buildTxt2ImgWorkflow(input: {
  readonly checkpoint: string;
  readonly prompt: string;
  readonly negativePrompt?: string;
  readonly width: number;
  readonly height: number;
  readonly seed: number;
  readonly steps?: number;
  readonly cfg?: number;
}): Record<string, unknown> {
  const checkpoint = input.checkpoint.trim() || "v1-5-pruned-emaonly.safetensors";
  const steps = input.steps ?? 20;
  const cfg = input.cfg ?? 7;
  const negative =
    input.negativePrompt?.trim() ||
    "lowres, bad anatomy, bad hands, text, error, cropped, worst quality, low quality";

  return {
    "3": {
      class_type: "KSampler",
      inputs: {
        seed: input.seed,
        steps,
        cfg,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1,
        model: ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0],
      },
    },
    "4": {
      class_type: "CheckpointLoaderSimple",
      inputs: {
        ckpt_name: checkpoint,
      },
    },
    "5": {
      class_type: "EmptyLatentImage",
      inputs: {
        width: input.width,
        height: input.height,
        batch_size: 1,
      },
    },
    "6": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: input.prompt,
        clip: ["4", 1],
      },
    },
    "7": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: negative,
        clip: ["4", 1],
      },
    },
    "8": {
      class_type: "VAEDecode",
      inputs: {
        samples: ["3", 0],
        vae: ["4", 2],
      },
    },
    "9": {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: "miro",
        images: ["8", 0],
      },
    },
  };
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function queuePrompt(
  baseUrl: string,
  workflow: Record<string, unknown>,
  clientId: string,
): Promise<string> {
  const response = await fetch(`${baseUrl}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: workflow,
      client_id: clientId,
    }),
  });
  const json = (await response.json()) as {
    readonly prompt_id?: string;
    readonly error?: { readonly message?: string } | string;
    readonly node_errors?: unknown;
  };
  if (!response.ok || !json.prompt_id) {
    const message =
      typeof json.error === "string"
        ? json.error
        : json.error?.message ?? `ComfyUI /prompt failed (${response.status})`;
    throw new Error(message);
  }
  return json.prompt_id;
}

async function waitForHistory(
  baseUrl: string,
  promptId: string,
): Promise<ComfyHistoryEntry> {
  const started = Date.now();
  while (Date.now() - started < MAX_POLL_MS) {
    const response = await fetch(`${baseUrl}/history/${encodeURIComponent(promptId)}`);
    if (!response.ok) {
      throw new Error(`ComfyUI /history failed (${response.status})`);
    }
    const json = (await response.json()) as Record<string, ComfyHistoryEntry>;
    const entry = json[promptId];
    if (entry?.outputs && Object.keys(entry.outputs).length > 0) {
      return entry;
    }
    if (entry?.status?.status_str === "error") {
      throw new Error("ComfyUI reported an execution error");
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error("Timed out waiting for ComfyUI generation");
}

async function fetchViewImage(
  baseUrl: string,
  image: ComfyHistoryImage,
): Promise<string> {
  const params = new URLSearchParams({
    filename: image.filename,
    subfolder: image.subfolder ?? "",
    type: image.type ?? "output",
  });
  const response = await fetch(`${baseUrl}/view?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`ComfyUI /view failed (${response.status})`);
  }
  const contentType = response.headers.get("content-type") ?? "image/png";
  const mime = contentType.split(";")[0]?.trim() || "image/png";
  return toDataUrl(await response.arrayBuffer(), mime);
}

export async function listComfyCheckpoints(baseUrl?: string): Promise<readonly string[]> {
  const root = resolveComfyBaseUrl(baseUrl);
  const response = await fetch(`${root}/object_info/CheckpointLoaderSimple`);
  if (!response.ok) {
    throw new Error(
      `Cannot reach ComfyUI at ${root}. Start ComfyUI and enable API access (${response.status}).`,
    );
  }
  const json = (await response.json()) as {
    readonly CheckpointLoaderSimple?: {
      readonly input?: {
        readonly required?: {
          readonly ckpt_name?: readonly [readonly string[]];
        };
      };
    };
  };
  const names = json.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0];
  if (!Array.isArray(names)) {
    return [];
  }
  return names.filter((name): name is string => typeof name === "string" && name.length > 0);
}

export function createComfyUiImageClient(config: ImageClientConfig): AiImageClient {
  const baseUrl = resolveComfyBaseUrl(config.baseUrl);

  async function generateImages(params: AiImageParams): Promise<readonly AiImageResult[]> {
    const prompt = params.prompt.trim();
    if (!prompt) {
      throw new Error("prompt is required");
    }
    const checkpoint = params.model.trim();
    if (!checkpoint) {
      throw new Error(
        "Select a ComfyUI checkpoint (Settings → AI & keys → ComfyUI), or add a custom image model id matching a .safetensors / .ckpt filename.",
      );
    }
    const { width, height } = parseSize(params.size);
    const seed = Math.floor(Math.random() * 2_147_483_647);
    const clientId = crypto.randomUUID();
    const workflow = buildTxt2ImgWorkflow({
      checkpoint,
      prompt,
      width,
      height,
      seed,
    });

    const promptId = await queuePrompt(baseUrl, workflow, clientId);
    const history = await waitForHistory(baseUrl, promptId);
    const images: AiImageResult[] = [];
    for (const nodeOutput of Object.values(history.outputs ?? {})) {
      for (const image of nodeOutput.images ?? []) {
        images.push({ url: await fetchViewImage(baseUrl, image) });
      }
    }
    if (images.length === 0) {
      throw new Error("ComfyUI finished but returned no images");
    }
    return images.slice(0, Math.min(params.count ?? 1, 4));
  }

  return { generateImages };
}
