"use client";

import { SourceAttachment } from "@/lib/types";

const EMPTY_ATTACHMENTS: SourceAttachment[] = [];

export interface SourceRailProps {
  sources?: SourceAttachment[] | null;
}

export default function SourceRail({ sources }: SourceRailProps) {
  const attachments = sources ?? EMPTY_ATTACHMENTS;

  return (
    <aside className="panel-surface source-rail">
      <header className="panel-header">
        <div>
          <h2 className="panel-title">Sources</h2>
          <p className="panel-subtitle">Uploads &amp; URLs tracked this session</p>
        </div>
        <span className="source-count">{attachments.length}</span>
      </header>

      <section className="scroll-area source-list">
        {attachments.length === 0 ? (
          <p className="source-empty">
            Drag in a PDF or paste an RFP link to populate the source rail. Each file becomes searchable
            by the agent.
          </p>
        ) : (
          <ul>
            {attachments.map((attachment) => (
              <li key={attachment.id} className={`source-item source-item--${attachment.kind}`}>
                <div>
                  <p className="source-item__label">{attachment.label}</p>
                  {attachment.href ? (
                    <a href={attachment.href} target="_blank" rel="noreferrer" className="source-item__href">
                      View source
                    </a>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </aside>
  );
}
