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

const INITIAL_ASSISTANT: ChatMessage = {
  id: crypto.randomUUID(),
  role: "assistant",
  content:
    "Hi! I’m your grant assistant. Upload an RFP or paste a URL and I’ll normalize the requirements, track coverage, and draft responses with citations.",
  createdAt: Date.now(),
};

function consumeNdjsonBuffer(
  buffer: string,
  flush: boolean,
): { envelopes: AgentRunEnvelope[]; remainder: string } {
  let working = buffer;
  const envelopes: AgentRunEnvelope[] = [];
  let newlineIndex = working.indexOf("\n");

  while (newlineIndex !== -1) {
    const line = working.slice(0, newlineIndex).trim();
    working = working.slice(newlineIndex + 1);
    if (line) {
      try {
        envelopes.push(JSON.parse(line) as AgentRunEnvelope);
      } catch (error) {
        console.warn("Failed to parse agent envelope line", { line, error });
      }
    }
    newlineIndex = working.indexOf("\n");
  }

  if (flush) {
    const trimmed = working.trim();
    if (trimmed) {
      try {
        envelopes.push(JSON.parse(trimmed) as AgentRunEnvelope);
      } catch (error) {
        console.warn("Failed to parse final agent envelope", { line: trimmed, error });
      }
    }
    working = "";
  }

  return { envelopes, remainder: working };
}

function extractFilename(header: string | null): string | null {
  if (!header) return null;
  const match = /filename\*?=(?:UTF-8''|")?([^";\n]+)"?/i.exec(header);
  return match ? decodeURIComponent(match[1]) : null;
}

export default function Chat({ fixNext, sessionId, onEnvelope, onSourcesUpdate }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_ASSISTANT]);
  const [input, setInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
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
    if (!targetId || !delta) return;
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

  const exportLatestDraft = useCallback(async () => {
    const latestAssistant = [...messages]
      .reverse()
      .find((msg) => msg.role === "assistant" && !msg.pending);
    if (!latestAssistant || !latestAssistant.content.trim()) {
      console.warn("No assistant draft content available for export");
      return;
    }

    setIsExporting(true);
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          markdown: latestAssistant.content,
          filename: `grant-draft-${sessionId}.docx`,
        }),
      });

      if (!res.ok) {
        throw new Error(`Export failed (${res.status})`);
      }

      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const filename = extractFilename(res.headers.get("Content-Disposition")) ?? "grant-draft.docx";

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  }, [messages, sessionId]);

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

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
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
          messages: updatedMessages.map(({ role, content }) => ({ role, content })),
          fixNextId: fixNext?.id ?? null,
        }),
      });

      if (!res.ok || !res.body) {
        throw new Error(`Agent request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let pending = "";
      let sawDoneEnvelope = false;

      while (true) {
        const { value, done } = await reader.read();
        if (value) {
          pending += decoder.decode(value, { stream: !done });
        }

        if (done) {
          pending += decoder.decode();
        }

        const { envelopes, remainder } = consumeNdjsonBuffer(pending, done);
        pending = remainder;

        envelopes.forEach((envelope) => {
          if (envelope.type === "message") {
            if (envelope.delta) {
              updateAssistantContent(envelope.delta);
              scrollToBottom();
            }
            if (envelope.done) {
              sawDoneEnvelope = true;
              finalizeAssistantMessage();
            }
          } else {
            onEnvelope?.(envelope);
          }
        });

        if (done) {
          break;
        }
      }

      if (!sawDoneEnvelope) {
        finalizeAssistantMessage();
      }
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

  const handleFixNextSelect = useCallback(
    (suggestion: FixNextSuggestion) => {
      setActiveFixNext(suggestion.id);
      if (suggestion.kind === "question") {
        setInput(suggestion.label);
      } else if (suggestion.kind === "export") {
        void exportLatestDraft();
      }
    },
    [exportLatestDraft],
  );

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
          <button className="send-button" type="submit" disabled={isStreaming || isExporting}>
            {isStreaming ? "Streaming…" : isExporting ? "Exporting…" : "Send"}
          </button>
        </div>
      </form>
    </section>
  );
}
