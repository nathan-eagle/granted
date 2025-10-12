"use client";

import clsx from "clsx";
import { ChatMessage } from "@/lib/types";

export interface MessageProps {
  message: ChatMessage;
}

function TypingIndicator(): JSX.Element {
  return (
    <span className="typing-indicator" role="status" aria-label="Granted is typing">
      <span className="typing-indicator__dot" aria-hidden="true" />
      <span className="typing-indicator__dot" aria-hidden="true" />
      <span className="typing-indicator__dot" aria-hidden="true" />
    </span>
  );
}

export default function Message({ message }: MessageProps) {
  const isAssistant = message.role === "assistant";
  const isUser = message.role === "user";
  const bubbleClass = clsx("chat-bubble", {
    "chat-bubble--assistant": isAssistant,
    "chat-bubble--user": isUser,
    "chat-bubble--pending": message.pending,
  });

  const showTypingIndicator = isAssistant && message.pending && !message.content;

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
      <p className="chat-bubble__body">{showTypingIndicator ? <TypingIndicator /> : message.content}</p>
    </article>
  );
}
