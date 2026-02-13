"use client";

import { Bot } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef } from "react";

import { useAutoScroll } from "@/hooks/use-auto-scroll";

import { MessageBubble } from "./message-bubble";

interface Message {
  id: string;
  role: string;
  content: string;
  imageUrl?: string | null;
}

interface MessageListProps {
  messages: Message[];
  streamingContent: string;
  streamingImage: string | null;
  isStreaming: boolean;
}

export function MessageList({
  messages,
  streamingContent,
  streamingImage,
  isStreaming,
}: MessageListProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollToBottom, isScrolledToBottom } = useAutoScroll(containerRef);
  const prevMessageCountRef = useRef(messages.length);

  // Auto-scroll when new messages are added (e.g., user sends a message)
  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      scrollToBottom();
    }
    prevMessageCountRef.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Auto-scroll during streaming when user hasn't scrolled up
  useEffect(() => {
    if (isScrolledToBottom()) {
      const el = containerRef.current;
      if (el) {
        el.scrollTop = el.scrollHeight;
      }
    }
  });

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-3xl py-4">
        {messages.map((message) => (
          <MessageBubble
            key={message.id}
            role={message.role}
            content={message.content}
            imageUrl={message.imageUrl}
          />
        ))}
        {isStreaming && streamingContent && (
          <div className="flex gap-3 px-4 py-3">
            <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
              <Bot className="text-muted-foreground size-4" />
            </div>
            <div className="bg-muted text-foreground max-w-[80%] rounded-2xl px-4 py-2.5">
              <p className="text-sm whitespace-pre-wrap">
                {streamingContent}
                <span className="streaming-cursor ml-0.5 inline-block h-4 w-1.5 align-middle" />
              </p>
              {streamingImage && (
                <Image
                  src={streamingImage}
                  alt="AI-generated humorous illustration"
                  width={512}
                  height={512}
                  unoptimized
                  className="mt-3 max-w-full rounded-xl"
                />
              )}
            </div>
          </div>
        )}
        {isStreaming && !streamingContent && (
          <div className="flex gap-3 px-4 py-3">
            <div className="bg-muted flex size-8 shrink-0 items-center justify-center rounded-full">
              <Bot className="text-muted-foreground size-4" />
            </div>
            <div className="bg-muted max-w-[80%] rounded-2xl px-4 py-2.5">
              <div className="flex items-center gap-1">
                <span className="bg-primary/60 size-1.5 animate-bounce rounded-full [animation-delay:0ms]" />
                <span className="bg-primary/60 size-1.5 animate-bounce rounded-full [animation-delay:150ms]" />
                <span className="bg-primary/60 size-1.5 animate-bounce rounded-full [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
