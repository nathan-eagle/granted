"use client";

import { FormEvent, useCallback, useMemo, useRef, useState } from "react";
import FixNextChips from "./FixNextChips";
import Message from "./Message";
import type {
  AgentRunEnvelope,
  ChatMessage,
  FixNextSuggestion,
  SourceAttachment,
} from "@/lib/types";

interface ChatProps {
  fixNext?: FixNextSuggestion | null;
  sessionId: string;
  onEnvelope?: (envelope: AgentRunEnvelope) => void;
  onSourcesUpdate?: (sources: SourceAttachment[]) => void;
}

interface StreamingEvent {
  event: string;
  data: string;
}

const INITIAL_ASSISTANT: ChatMessage = {
  id: crypto.randomUUID(),
  role: "assistant",
  content:
    "Hi! I’m your grant assistant. Upload an RFP or paste a URL and I’ll normalize the requirements, track coverage, and draft responses with citations.",
  createdAt: Date.now(),
};

export default function Chat({ fixNext, sessionId, onEnvelope, onSourcesUpdate }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT]);
  const [input, setInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeFixNext, setActiveFixNext] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingAssistantId = useRef<string | null>(null);

  const fixNextSuggestions = useMemo(() => (fixNext ? [fixNext] : []), [fixNext]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => {
      const container = chatScrollRef.current;
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    });
  }, []);

  const enqueueAssistant = useCallback(() => {
    const assistantMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      pending: true,
      createdAt: Date.now(),
    };
    pendingAssistantId.current = assistantMessage.id;
    setMessages((prev) => [...prev, assistantMessage]);
    return assistantMessage.id;
  }, []);

  const updateAssistantContent = useCallback((delta: string) => {
    const targetId = pendingAssistantId.current;
    if (!targetId) return;
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === targetId
          ? {
              ...msg,
              content: msg.content + delta,
            }
          : msg,
      ),
    );
  }, []);

  const finalizeAssistantMessage = useCallback(() => {
    const targetId = pendingAssistantId.current;
    if (!targetId) return;
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === targetId
          ? {
              ...msg,
              pending: false,
            }
          : msg,
      ),
    );
    pendingAssistantId.current = null;
  }, []);

  const parseSseEvent = useCallback((chunk: string): StreamingEvent | null => {
    const lines = chunk.split("\n");
    let event = "message";
    const dataLines: string[] = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) {
        return;
      }
      if (trimmed.startsWith("event:")) {
        event = trimmed.slice(6).trim();
      } else if (trimmed.startsWith("data:")) {
        dataLines.push(trimmed.slice(5).trimStart());
      }
    });

    const data = dataLines.join("\n");
    if (!data) {
      return null;
    }

    return { event, data } satisfies StreamingEvent;
  }, []);

  const consumeSseBuffer = useCallback(
    (buffer: string, flush: boolean): { events: StreamingEvent[]; remainder: string } => {
      let working = buffer;
      const events: StreamingEvent[] = [];
      let delimiterIndex = working.indexOf("\n\n");

      while (delimiterIndex !== -1) {
        const chunk = working.slice(0, delimiterIndex);
        working = working.slice(delimiterIndex + 2);
        const event = parseSseEvent(chunk);
        if (event) {
          events.push(event);
        }
        delimiterIndex = working.indexOf("\n\n");
      }

      if (flush && working.trim().length > 0) {
        const event = parseSseEvent(working);
        working = "";
        if (event) {
          events.push(event);
        }
      }

      return { events, remainder: working };
    },
    [parseSseEvent],
  );

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) {
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: input.trim(),
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setActiveFixNext(null);
    scrollToBottom();

    const assistantId = enqueueAssistant();
    setIsStreaming(true);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: [...messages, userMessage].map(({ role, content }) => ({ role, content })),
          fixNextId: fixNext?.id ?? null,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Agent request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";

      while (true) {
        const { value, done } = await reader.read();
        if (value) {
          pending += decoder.decode(value, { stream: !done }).replace(/\r\n/g, "\n");
        }

        if (done) {
          pending += decoder.decode().replace(/\r\n/g, "\n");
        }

        const { events, remainder } = consumeSseBuffer(pending, done);
        pending = remainder;

        events.forEach((event) => {
          if (event.event === "token") {
            updateAssistantContent(event.data);
            scrollToBottom();
          } else if (event.event === "envelope") {
            try {
              const parsed = JSON.parse(event.data) as AgentRunEnvelope;
              onEnvelope?.(parsed);
            } catch (error) {
              console.error("Failed to parse envelope", error);
            }
          }
        });

        if (done) {
          if (pending.trim().length > 0) {
            console.warn("Unparsed SSE buffer", pending);
          }
          break;
        }
      }

      finalizeAssistantMessage();
    } catch (error) {
      console.error(error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                pending: false,
                content:
                  "I hit a snag connecting to the agent service. Double-check your OpenAI credentials and try again.",
              }
            : msg,
        ),
      );
    } finally {
      setIsStreaming(false);
      scrollToBottom();
    }
  }, [
    enqueueAssistant,
    finalizeAssistantMessage,
    fixNext?.id,
    input,
    isStreaming,
    messages,
    onEnvelope,
    consumeSseBuffer,
    scrollToBottom,
    sessionId,
    updateAssistantContent,
  ]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void sendMessage();
    },
    [sendMessage],
  );

  const handleUpload = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const formData = new FormData();
      formData.set("sessionId", sessionId);
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        console.error("Upload failed", await res.text());
        return;
      }

      const json = (await res.json()) as { sources: SourceAttachment[] };
      if (json.sources) {
        onSourcesUpdate?.(json.sources);
      }
    },
    [onSourcesUpdate, sessionId],
  );

  const handleImport = useCallback(async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    setUrlInput("");
    const res = await fetch("/api/import-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        urls: [trimmed],
      }),
    });

    if (!res.ok) {
      console.error("Import failed", await res.text());
      return;
    }

    const json = (await res.json()) as { sources: SourceAttachment[] };
    if (json.sources) {
      onSourcesUpdate?.(json.sources);
    }
  }, [onSourcesUpdate, sessionId, urlInput]);

  const handleFixNextSelect = useCallback((suggestion: FixNextSuggestion) => {
    setActiveFixNext(suggestion.id);
    if (suggestion.kind === "question") {
      setInput(suggestion.label);
    }
  }, []);

  return (
    <section className="panel-surface chat-panel">
      <div className="chat-stream scroll-area" ref={chatScrollRef}>
        <div className="chat-messages">
          {messages.map((message) => (
            <Message key={message.id} message={message} />
          ))}
        </div>
      </div>

      <FixNextChips suggestions={fixNextSuggestions} activeId={activeFixNext} onSelect={handleFixNextSelect} />

      <form className="chat-composer" onSubmit={handleSubmit}>
        <textarea
          className="chat-input"
          placeholder="Ask for a summary, request a section draft, or provide new context."
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={3}
        />
        <div className="composer-actions">
          <div className="composer-left">
            <label className="upload-button">
              <input
                type="file"
                accept="application/pdf"
                multiple
                onChange={(event) => handleUpload(event.target.files)}
                hidden
              />
              Attach PDF
            </label>
            <div className="url-import">
              <input
                type="url"
                placeholder="Paste an RFP or org profile URL"
                value={urlInput}
                onChange={(event) => setUrlInput(event.target.value)}
              />
              <button type="button" onClick={handleImport} disabled={!urlInput.trim()}>
                Import
              </button>
            </div>
          </div>
          <button className="send-button" type="submit" disabled={isStreaming}>
            {isStreaming ? "Streaming…" : "Send"}
          </button>
        </div>
      </form>
    </section>
  );
}
