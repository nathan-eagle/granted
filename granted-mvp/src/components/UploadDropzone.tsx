"use client";

import { useCallback, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import type { SourceAttachment } from "@/lib/types";

interface UploadDropzoneProps {
  sessionId: string;
  disabled?: boolean;
  onUploaded: (sources: SourceAttachment[]) => void;
}

export default function UploadDropzone({ sessionId, disabled = false, onUploaded }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const resetInput = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  const postFiles = useCallback(
    async (files: File[]) => {
      if (!files.length || disabled) return;
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append("sessionId", sessionId);
        files.forEach((file) => {
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

        const json = (await res.json()) as { sources?: SourceAttachment[] };
        if (json.sources) {
          onUploaded(json.sources);
        }
      } catch (error) {
        console.error("Upload failed", error);
      } finally {
        resetInput();
        setIsUploading(false);
        setIsDragging(false);
      }
    },
    [disabled, onUploaded, sessionId],
  );

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (disabled) return;
      const droppedFiles = Array.from(event.dataTransfer.files ?? []);
      void postFiles(droppedFiles);
    },
    [disabled, postFiles],
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const list = event.target.files;
      if (!list) return;
      void postFiles(Array.from(list));
    },
    [postFiles],
  );

  const openFileDialog = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  return (
    <div
      className={`upload-dropzone${isDragging ? " is-dragging" : ""}${isUploading ? " is-uploading" : ""}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <button type="button" className="upload-button" onClick={openFileDialog} disabled={disabled || isUploading}>
        {isUploading ? "Uploading…" : "Attach PDF"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx"
        multiple
        hidden
        onChange={handleInputChange}
      />
      <span className="upload-hint">{isDragging ? "Drop to upload" : "or drag files here"}</span>
    </div>
  );
}
