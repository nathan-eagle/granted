"use client";

import { FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import FixNextChips from "./FixNextChips";
import Message from "./Message";
import UploadDropzone from "./UploadDropzone";
import type {
  AgentRunEnvelope,
  ChatMessage,
  FixNextSuggestion,
  SourceAttachment,
} from "@/lib/types";

interface ChatProps {
  initialMessages?: ChatMessage[];
  fixNext?: FixNextSuggestion | null;
  sessionId: string;
  onEnvelope?: (envelope: AgentRunEnvelope) => void;
  onSourcesUpdate?: (sources: SourceAttachment[]) => void;
}

const INITIAL_ASSISTANT: ChatMessage = {
  id: crypto.randomUUID(),
  role: "assistant",
  content:
    "Hi! I’m your grant assistant. Paste the RFP URL (or drag the PDF here), then share your org URL and a 3-5 sentence project idea so I can map coverage and suggest what to tackle next.",
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

export default function Chat({ initialMessages = [], fixNext, sessionId, onEnvelope, onSourcesUpdate }: ChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialMessages.length > 0 ? initialMessages : [INITIAL_ASSISTANT],
  );
  const [input, setInput] = useState("");
  const [urlInput, setUrlInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeFixNext, setActiveFixNext] = useState<string | null>(null);
  const [activity, setActivity] = useState<string | null>(null);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);
  const pendingAssistantId = useRef<string | null>(null);

  useEffect(() => {
    if (initialMessages.length > 0) {
      setMessages(initialMessages);
    } else {
      setMessages([INITIAL_ASSISTANT]);
    }
  }, [initialMessages]);

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

  const streamAgentRun = useCallback(
    async (res: Response) => {
      if (!res.ok || !res.body) {
        throw new Error(`Agent request failed (${res.status})`);
      }

      setActivity((prev) => prev ?? "Granted is thinking…");

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
              setActivity("Granted is drafting a reply…");
              updateAssistantContent(envelope.delta);
              scrollToBottom();
            }
            if (envelope.done) {
              sawDoneEnvelope = true;
              finalizeAssistantMessage();
              setActivity(null);
            }
          } else {
            switch (envelope.type) {
              case "coverage":
                setActivity("Refreshing coverage map…");
                break;
              case "fixNext":
                setActivity("Selecting the next action…");
                break;
              case "sources":
                setActivity("Recording new sources…");
                break;
              case "tighten":
                setActivity("Reviewing length limits…");
                break;
              case "provenance":
                setActivity("Tracking provenance citations…");
                break;
            }
            onEnvelope?.(envelope);
          }
        });

        if (done) {
          break;
        }
      }

      if (!sawDoneEnvelope) {
        finalizeAssistantMessage();
        setActivity(null);
      }
    },
    [finalizeAssistantMessage, onEnvelope, scrollToBottom, updateAssistantContent],
  );

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
    setActivity("Granted is thinking…");
    setIsStreaming(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          messages: updatedMessages.map(({ role, content }) => ({ role, content })),
          fixNextId: fixNext?.id ?? null,
        }),
      });

      await streamAgentRun(res);
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
      setActivity("Agent run failed.");
    } finally {
      setIsStreaming(false);
      scrollToBottom();
      setActivity(null);
    }
  }, [enqueueAssistant, fixNext?.id, input, isStreaming, messages, scrollToBottom, sessionId, streamAgentRun]);

  const handleSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void sendMessage();
    },
    [sendMessage],
  );

  const runCommand = useCallback(
    async (command: string) => {
      if (!command || isStreaming) {
        return;
      }

      const historyPayload = messages.map(({ role, content }) => ({ role, content }));
      setActiveFixNext(null);
      setActivity(
        command === "normalize_rfp" ? "Normalizing the RFP structure…" : "Granted is working on your request…",
      );
      const assistantId = enqueueAssistant();
      scrollToBottom();
      setIsStreaming(true);

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sessionId,
            command,
            messages: historyPayload,
          }),
        });

        await streamAgentRun(res);
      } catch (error) {
        console.error(error);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? {
                  ...msg,
                  pending: false,
                  content:
                    "Coverage update failed. Please try again or normalize the RFP manually.",
                }
              : msg,
          ),
        );
        setActivity("Agent run failed.");
      } finally {
        setIsStreaming(false);
        scrollToBottom();
        setActivity(null);
      }
    },
    [enqueueAssistant, isStreaming, messages, scrollToBottom, sessionId, streamAgentRun],
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
    void runCommand("normalize_rfp");
  }, [onSourcesUpdate, runCommand, sessionId, urlInput]);

  const handleInputKeyDown = useCallback(
    (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        void sendMessage();
      }
    },
    [sendMessage],
  );

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
          onKeyDown={handleInputKeyDown}
          rows={3}
        />
        {activity && (
          <div className="chat-activity" role="status" aria-live="polite">
            <span className="chat-activity__icon" aria-hidden="true">
              ⏳
            </span>
            <span>{activity}</span>
          </div>
        )}
        <div className="composer-actions">
          <div className="composer-left">
            <UploadDropzone
              sessionId={sessionId}
              disabled={isStreaming || isExporting}
              onUploaded={(uploadedSources) => {
                onSourcesUpdate?.(uploadedSources);
                void runCommand("normalize_rfp");
              }}
            />
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
