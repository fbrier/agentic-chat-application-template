"use client";

import { Bot, User } from "lucide-react";
import Image from "next/image";

import { cn } from "@/lib/utils";

import { MarkdownContent } from "./markdown-content";

interface MessageBubbleProps {
  role: string;
  content: string;
  imageUrl?: string | null | undefined;
}

export function MessageBubble({ role, content, imageUrl }: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={cn("flex gap-3 px-4 py-3", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <div className="bg-muted ring-primary/20 flex size-8 shrink-0 items-center justify-center rounded-full ring-1">
          <Bot className="text-muted-foreground size-4" />
        </div>
      )}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-2.5",
          isUser
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
            : "bg-muted text-foreground",
        )}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{content}</p>
        ) : (
          <>
            <MarkdownContent content={content} />
            {imageUrl && (
              <Image
                src={imageUrl}
                alt="AI-generated humorous illustration"
                width={512}
                height={512}
                unoptimized
                className="mt-3 max-w-full rounded-xl"
              />
            )}
          </>
        )}
      </div>
      {isUser && (
        <div className="bg-primary flex size-8 shrink-0 items-center justify-center rounded-full">
          <User className="text-primary-foreground size-4" />
        </div>
      )}
    </div>
  );
}
