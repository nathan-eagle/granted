"use client";

import clsx from "clsx";
import { ChatMessage } from "@/lib/types";

export interface MessageProps {
  message: ChatMessage;
}

export default function Message({ message }: MessageProps) {
  const isAssistant = message.role === "assistant";
  const isUser = message.role === "user";
  const bubbleClass = clsx("chat-bubble", {
    "chat-bubble--assistant": isAssistant,
    "chat-bubble--user": isUser,
    "chat-bubble--pending": message.pending,
  });

  return (
    <article className={bubbleClass} data-role={message.role}>
      <header className="chat-bubble__header">
        <span className="chat-bubble__author">{isUser ? "You" : "Granted"}</span>
        <time className="chat-bubble__timestamp">
          {new Date(message.createdAt).toLocaleTimeString(undefined, {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </time>
      </header>
      <p className="chat-bubble__body">
        {message.content || (message.pending ? "…" : "")}
      </p>
    </article>
  );
}
