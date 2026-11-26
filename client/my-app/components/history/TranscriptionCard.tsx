"use client";

import { useState } from "react";

import {
  useUpdateTranscription,
  useDeleteTranscription,
} from "@/hooks/useTranscriptions";

import type {
  Transcription,
} from "@/types/transcription";


interface Props {
  transcription: Transcription;
  disabled?: boolean;
}


type CardMode =
  | "preview"
  | "view"
  | "edit"
  | "delete";


export default function TranscriptionCard({
  transcription,
  disabled = false,
}: Props) {
  const [mode, setMode] =
    useState<CardMode>("preview");

  const [title, setTitle] =
    useState(transcription.title);

  const [content, setContent] =
    useState(transcription.content);

  const [feedback, setFeedback] =
    useState("");

  const updateMutation = useUpdateTranscription();

  const deleteMutation = useDeleteTranscription();

  const isBusy =
    updateMutation.isPending ||
    deleteMutation.isPending;

  const actionsDisabled = disabled || isBusy;


  function openEdit() {
    updateMutation.reset();

    setTitle(transcription.title);
    setContent(transcription.content);
    setMode("edit");
  }


  async function handleUpdate(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!title.trim() || !content.trim() || isBusy) {
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: transcription.id,
        data: {
          title: title.trim(),
          content: content.trim(),
        },
      });

      setMode("preview");
      setFeedback("Updated successfully");

    } catch {
      // Error is displayed in the form.
    }
  }


  async function handleDelete() {
    if (isBusy) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(
        transcription.id
      );

      setMode("preview");

    } catch {
      // Error is displayed below.
    }
  }


  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(
        transcription.content
      );

      setFeedback("Copied!");

    } catch {
      setFeedback("Unable to copy");
    }
  }


  return (
    <article className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-5">

      <div>
        <h2 className="break-words text-lg font-semibold">
          {transcription.title}
        </h2>

        <p className="mt-1 text-xs text-slate-400">
          Language: {transcription.language ?? "Unknown"}
          {" · "}
          {transcription.duration_seconds.toFixed(1)}s
        </p>

        <p className="mt-1 text-xs text-slate-500">
          {new Date(
            transcription.created_at
          ).toLocaleString()}
        </p>
      </div>


      {/* Preview or expanded text */}
      {(mode === "preview" || mode === "view") && (
        <p
          className={`whitespace-pre-wrap break-words text-slate-300 ${
            mode === "preview"
              ? "line-clamp-3"
              : ""
          }`}
        >
          {transcription.content}
        </p>
      )}


      {/* Edit form */}
      {mode === "edit" && (
        <form
          onSubmit={handleUpdate}
          className="space-y-3"
        >
          <label className="block text-sm">
            Title

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={200}
              disabled={actionsDisabled}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
            />
          </label>

          <label className="block text-sm">
            Content

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              maxLength={50000}
              rows={5}
              disabled={actionsDisabled}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
            />
          </label>

          {updateMutation.isError && (
            <p role="alert" className="text-sm text-red-400">
              {updateMutation.error.message}
            </p>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={
                actionsDisabled ||
                !title.trim() ||
                !content.trim()
              }
              className="rounded-lg bg-blue-600 px-4 py-2 disabled:opacity-50"
            >
              {updateMutation.isPending
                ? "Updating..."
                : "Save Changes"}
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => setMode("preview")}
              className="rounded-lg border border-slate-700 px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </form>
      )}


      {/* Delete confirmation */}
      {mode === "delete" && (
        <div className="space-y-3 rounded-lg border border-red-800 bg-red-950 p-4">
          <p className="font-medium text-red-300">
            Delete this transcription?
          </p>

          <p className="text-sm text-red-300">
            This action cannot be undone.
          </p>

          {deleteMutation.isError && (
            <p role="alert" className="text-sm text-red-400">
              {deleteMutation.error.message}
            </p>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => void handleDelete()}
              disabled={actionsDisabled}
              className="rounded-lg bg-red-600 px-4 py-2 disabled:opacity-50"
            >
              {deleteMutation.isPending
                ? "Deleting..."
                : "Confirm Delete"}
            </button>

            <button
              onClick={() => setMode("preview")}
              disabled={isBusy}
              className="rounded-lg border border-red-800 px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}


      {/* Card actions */}
      {(mode === "preview" || mode === "view") && (
        <div className="flex flex-wrap gap-4 text-sm">

          <button
            disabled={actionsDisabled}
            onClick={() =>
              setMode(
                mode === "view" ? "preview" : "view"
              )
            }
            className="text-blue-400 disabled:opacity-50"
          >
            {mode === "view" ? "Show Less" : "View"}
          </button>

          <button
            disabled={actionsDisabled}
            onClick={openEdit}
            className="text-slate-300 disabled:opacity-50"
          >
            Edit
          </button>

          <button
            disabled={actionsDisabled}
            onClick={() => void handleCopy()}
            className="text-slate-300 disabled:opacity-50"
          >
            Copy
          </button>

          <button
            disabled={actionsDisabled}
            onClick={() => {
              deleteMutation.reset();
              setMode("delete");
            }}
            className="text-red-400 disabled:opacity-50"
          >
            Delete
          </button>

        </div>
      )}

      {feedback && (
        <p role="status" className="text-xs text-slate-400">
          {feedback}
        </p>
      )}

    </article>
  );
}