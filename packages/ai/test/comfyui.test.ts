import assert from "node:assert/strict";
import { buildTxt2ImgWorkflow, normalizeProviderId } from "../src/index";

assert.equal(normalizeProviderId("comfy"), "comfyui");
assert.equal(normalizeProviderId("comfyui"), "comfyui");

const workflow = buildTxt2ImgWorkflow({
  checkpoint: "sd_xl_base_1.0.safetensors",
  prompt: "a quiet library at dusk",
  width: 768,
  height: 512,
  seed: 42,
});

const loader = workflow["4"] as { readonly class_type: string; readonly inputs: { readonly ckpt_name: string } };
const positive = workflow["6"] as { readonly inputs: { readonly text: string } };
const latent = workflow["5"] as { readonly inputs: { readonly width: number; readonly height: number } };

assert.equal(loader.class_type, "CheckpointLoaderSimple");
assert.equal(loader.inputs.ckpt_name, "sd_xl_base_1.0.safetensors");
assert.equal(positive.inputs.text, "a quiet library at dusk");
assert.equal(latent.inputs.width, 768);
assert.equal(latent.inputs.height, 512);

console.log("comfyui workflow ok");
