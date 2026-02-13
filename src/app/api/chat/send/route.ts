import type { NextRequest } from "next/server";

import { handleApiError } from "@/core/api/errors";
import { getLogger } from "@/core/logging";
import {
  addMessage,
  createConversation,
  generateHumorousImage,
  generateTitleFromMessage,
  getMessages,
  SendMessageSchema,
  streamChatCompletion,
  updateMessageImage,
} from "@/features/chat";

const logger = getLogger("api.chat.send");

/**
 * POST /api/chat/send
 * Send a message and stream the AI response via SSE.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, conversationId: existingConversationId } = SendMessageSchema.parse(body);

    // Create conversation if needed
    let conversationId = existingConversationId;
    if (!conversationId) {
      const title = generateTitleFromMessage(content);
      const conversation = await createConversation(title);
      conversationId = conversation.id;
      logger.info({ conversationId }, "chat.conversation_created");
    }

    // Save user message
    await addMessage(conversationId, "user", content);

    // Get history for context
    const history = await getMessages(conversationId);

    // Stream completion
    const { stream, fullResponse } = await streamChatCompletion(history);

    // Wrap the stream to save assistant message after completion
    const reader = stream.getReader();
    const wrappedStream = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read();
        if (!done) {
          controller.enqueue(value);
          return;
        }
        // Stream finished — save assistant message, then generate image
        const encoder = new TextEncoder();
        try {
          const fullText = await fullResponse;
          const savedMessage = await addMessage(conversationId, "assistant", fullText);
          logger.info({ conversationId }, "chat.assistant_message_saved");

          // Generate humorous image (non-blocking to chat flow)
          const imageUrl = await generateHumorousImage(fullText);
          if (imageUrl) {
            await updateMessageImage(savedMessage.id, imageUrl);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "image", url: imageUrl })}\n\n`),
            );
            logger.info({ conversationId, messageId: savedMessage.id }, "chat.image_attached");
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "done", saved: true })}\n\n`),
          );
        } catch (err) {
          logger.error({ conversationId, error: err }, "chat.assistant_message_save_failed");
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "error", message: "Failed to save response" })}\n\n`,
            ),
          );
        }
        controller.close();
      },
    });

    // Return SSE response
    return new Response(wrappedStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Conversation-Id": conversationId,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
