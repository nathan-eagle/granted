"use client";

import clsx from "clsx";
import { FixNextSuggestion } from "@/lib/types";

export interface FixNextChipsProps {
  suggestions: FixNextSuggestion[];
  activeId?: string | null;
  onSelect?: (suggestion: FixNextSuggestion) => void;
}

export default function FixNextChips({
  suggestions,
  activeId,
  onSelect,
}: FixNextChipsProps) {
  if (!suggestions.length) {
    return null;
  }

  return (
    <div className="fixnext-chip-row" role="list">
      {suggestions.map((suggestion) => {
        const isActive = suggestion.id === activeId;
        return (
          <button
            key={suggestion.id}
            role="listitem"
            className={clsx("fixnext-chip", { "fixnext-chip--active": isActive })}
            onClick={() => onSelect?.(suggestion)}
            type="button"
          >
            <span className="fixnext-chip__label">{suggestion.label}</span>
            {suggestion.description ? (
              <span className="fixnext-chip__description">{suggestion.description}</span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
