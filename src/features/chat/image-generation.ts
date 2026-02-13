import { env } from "@/core/config/env";
import { getLogger } from "@/core/logging";

import { IMAGE_PROMPT_SYSTEM } from "./constants";

const logger = getLogger("chat.image-generation");

/**
 * Uses a fast LLM to craft a humorous image prompt from the assistant's response text.
 */
async function createHumorousPrompt(responseText: string): Promise<string> {
  const model = env.OPENROUTER_IMAGE_PROMPT_MODEL || env.OPENROUTER_MODEL;
  const truncated = responseText.slice(0, 500);

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: IMAGE_PROMPT_SYSTEM },
        { role: "user", content: truncated },
      ],
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`Image prompt LLM error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const prompt = data.choices?.[0]?.message?.content?.trim();
  if (!prompt) {
    throw new Error("Empty image prompt from LLM");
  }

  return prompt;
}

/**
 * Calls an image generation model on OpenRouter via the chat completions endpoint
 * with modalities: ["image"]. Returns the base64 data URL of the generated image.
 */
async function generateImage(prompt: string): Promise<string> {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: env.OPENROUTER_IMAGE_MODEL,
      messages: [{ role: "user", content: prompt }],
      modalities: ["image"],
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "Unknown error");
    throw new Error(`Image generation error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string | null;
        images?: Array<{
          image_url?: { url?: string };
          url?: string;
        }>;
      };
    }>;
  };

  const imageEntry = data.choices?.[0]?.message?.images?.[0];

  // OpenRouter returns images as { image_url: { url: "data:image/..." } }
  const imageUrl = imageEntry?.image_url?.url ?? imageEntry?.url;
  if (imageUrl) {
    return imageUrl;
  }

  // Fallback: some models embed the data URL in the content field
  const content = data.choices?.[0]?.message?.content;
  if (content?.startsWith("data:image/")) {
    return content;
  }

  throw new Error("No image in response");
}

/**
 * Full pipeline: creates a humorous prompt from the response text, then generates an image.
 * Returns the image URL on success, or null on any failure (non-critical).
 */
export async function generateHumorousImage(responseText: string): Promise<string | null> {
  try {
    logger.info({ textLength: responseText.length }, "image.generation_started");

    const prompt = await createHumorousPrompt(responseText);
    logger.info({ prompt }, "image.prompt_created");

    const imageUrl = await generateImage(prompt);
    logger.info({ imageUrl }, "image.generation_completed");

    return imageUrl;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    logger.error({ error: message }, "image.generation_failed");
    return null;
  }
}
