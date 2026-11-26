"use client";

import { useState, useRef } from "react";
import Link from "next/link";

import {
  useCreateTranscription,
} from "@/hooks/useTranscriptions";

import type {
  TranscriptionResult,
} from "@/types/transcription";


interface Props {
  result: TranscriptionResult;
}


export default function SaveTranscriptionForm({
  result,
}: Props) {
  const [title, setTitle] = useState(
    `Recording - ${new Date().toLocaleString()}`
  );

  const [content, setContent] = useState(
    result.text
  );

  const [savedId, setSavedId] =
    useState<string | null>(null);

  const [formError, setFormError] =
    useState("");

  const submittingRef = useRef(false);

  const createMutation = useCreateTranscription();


  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (submittingRef.current || savedId) {
      return;
    }

    setFormError("");

    if (!title.trim() || !content.trim()) {
      setFormError(
        "Title and transcription are required."
      );

      return;
    }

    submittingRef.current = true;

    try {
      const saved = await createMutation.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        language: result.language,
        duration_seconds: result.duration_seconds,
      });

      setSavedId(saved.id);

    } catch {
      // Mutation error is displayed below.
    } finally {
      submittingRef.current = false;
    }
  }


  const isSaved = savedId !== null;

  const isDisabled =
    createMutation.isPending || isSaved;


  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6"
    >
      <h2 className="text-xl font-semibold">
        Save Transcription
      </h2>

      <p className="text-sm text-slate-400">
        Review and correct the AI-generated text
        before saving it.
      </p>

      <div>
        <label
          htmlFor="transcription-title"
          className="mb-2 block text-sm"
        >
          Title
        </label>

        <input
          id="transcription-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          required
          disabled={isDisabled}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
        />
      </div>

      <div>
        <label
          htmlFor="transcription-content"
          className="mb-2 block text-sm"
        >
          Transcript
        </label>

        <textarea
          id="transcription-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={6}
          maxLength={50000}
          required
          disabled={isDisabled}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
        />

        <p className="mt-1 text-xs text-slate-400">
          {content.length} / 50000 characters
        </p>
      </div>

      {(formError || createMutation.isError) && (
        <p role="alert" className="text-sm text-red-400">
          {formError || createMutation.error?.message}
        </p>
      )}

      {isSaved ? (
        <div className="rounded-lg border border-green-800 bg-green-950 p-4">
          <p className="text-green-400">
            Transcription saved successfully!
          </p>

          <Link
            href="/history"
            className="mt-2 inline-block text-sm text-blue-400 underline"
          >
            View transcription history
          </Link>
        </div>
      ) : (
        <button
          type="submit"
          disabled={isDisabled}
          className="w-full rounded-lg bg-blue-600 px-4 py-3 font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {createMutation.isPending
            ? "Saving..."
            : "Save Transcript"}
        </button>
      )}
    </form>
  );
}