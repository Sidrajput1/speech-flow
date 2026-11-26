"use client";
import { useState } from "react";

import type { LanguageOption, RecordingStatus } from "@/types/transcription";
import { useTranscriptionSocket } from "@/hooks/useTranscriptionSocket";

import Link from "next/link";

import SaveTranscriptionForm from
  "@/components/transcription/SaveTranscriptionForm";

const statusLabels: Record<RecordingStatus, string> = {
  idle: "Ready to record",
  connecting: "Initializing microphone and connection...",
  recording: "Recording",
  finalizing: "Generating final transcription...",
  completed: "Transcription completed",
  error: "Something went wrong",
};

function formatDuration(seconds: number) {
  const total = Math.floor(seconds);

  const minutes = Math.floor(total / 60);

  const remainingSeconds = total % 60;

  return (
    String(minutes).padStart(2, "0") +
    ":" +
    String(remainingSeconds).padStart(2, "0")
  );
}

export default function Home() {
  // const [health,setHealth] = useState<HealthResponse | null>(null);

  // const [loading,setLoading] = useState(false);
  // const [error, setError] =    useState<string | null>(null);

  // async function handleCheckConnections(){
  //   setLoading(true);
  //   setError(null);
  //   setHealth(null);

  //   try {
  //       const data = await checkBackendHealth();

  //       setHealth(data)
  //   } catch (err) {
  //     setError(
  //       err instanceof Error ? err.message : "something went wrong"
  //     )
  //   }finally{
  //     setLoading(false)
  //   }

  // }

  const [language, setLanguage] = useState<LanguageOption>("auto");

  const [copyFeedback, setCopyFeedback] = useState("");

  const {
    status,
    transcript,
    result,
    duration,
    audioLevel,
    maxDuration,
    sampleRate,
    error,
    start,
    stop,
  } = useTranscriptionSocket();

  const isBusy =
    status === "connecting" ||
    status === "recording" ||
    status === "finalizing";

  const isRecording = status === "recording";

  const progress = Math.min((duration / maxDuration) * 100, 100);

  // Scale RMS for visual display.
  const meterLevel = Math.min(audioLevel * 4, 1);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(transcript);

      setCopyFeedback("Copied!");
    } catch {
      setCopyFeedback("Unable to copy");
    }
  }

  function handleStart() {
    setCopyFeedback("");

    void start(language);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">SpeechFlow</h1>

            <p className="mt-1 text-slate-400">
              Real-time multilingual speech recognition
            </p>
          </div>

         
          <Link
  href="/history"
  className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
>
  View History
</Link>
        </header>

        {/* Recording Controls */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-400">Recording duration</p>

              <h2 className="mt-1 text-5xl font-semibold tabular-nums">
                {formatDuration(duration)}
              </h2>

              <p
                className={`mt-2 text-sm ${
                  isRecording ? "text-green-400" : "text-slate-400"
                }`}
                role="status"
              >
                {isRecording && "● "}
                {statusLabels[status]}
              </p>
            </div>

            {/* Language Selection */}
            <div>
              <label
                htmlFor="language"
                className="block mb-2 text-sm text-slate-400"
              >
                Language hint
              </label>

              <select
                id="language"
                value={language}
                disabled={isBusy}
                onChange={(event) =>
                  setLanguage(event.target.value as LanguageOption)
                }
                className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 disabled:opacity-50"
              >
                <option value="auto">Auto detect</option>

                <option value="hi">Hindi</option>

                <option value="en">English</option>
              </select>
            </div>
          </div>

          {/* Live Audio Level Meter */}
          <div>
            <p className="mb-2 text-xs text-slate-400">Microphone level</p>

            <div className="flex h-10 gap-1">
              {Array.from({ length: 40 }, (_, index) => {
                const active = index / 40 < meterLevel;

                return (
                  <div
                    key={index}
                    className={`flex-1 rounded-sm transition-colors ${
                      active
                        ? index > 33
                          ? "bg-amber-500"
                          : "bg-green-500"
                        : "bg-slate-800"
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Recording Progress */}
          <div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-blue-500 transition-all"
                style={{
                  width: `${progress}%`,
                }}
              />
            </div>

            <p className="mt-2 text-xs text-slate-400">
              {duration.toFixed(1)} of {maxDuration} seconds
            </p>
          </div>

          {/* Start and Stop Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleStart}
              disabled={isBusy}
              className="flex-1 rounded-xl bg-blue-600 px-4 py-3 font-medium hover:bg-blue-700 disabled:opacity-40"
            >
              {status === "connecting" ? "Connecting..." : "Start Recording"}
            </button>

            <button
              onClick={() => void stop()}
              disabled={!isRecording}
              className="flex-1 rounded-xl bg-red-600 px-4 py-3 font-medium hover:bg-red-700 disabled:opacity-40"
            >
              {status === "finalizing" ? "Processing..." : "Stop Recording"}
            </button>
          </div>
        </section>

        {/* Error Display */}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-800 bg-red-950 p-4 text-red-300"
          >
            {error}
          </div>
        )}

        {/* Live Transcription */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">Live Transcript</h2>

            <span className="text-xs text-slate-400">
              {status === "completed"
                ? "Final result"
                : status === "error"
                  ? "Incomplete result"
                  : "Partial result"}
            </span>
          </div>

          <div className="mt-4 min-h-40 rounded-xl border border-slate-800 bg-slate-950 p-5">
            {transcript ? (
              <p className="whitespace-pre-wrap text-lg leading-relaxed text-slate-200">
                {transcript}
              </p>
            ) : (
              <p className="text-slate-500">
                {isRecording
                  ? "Listening... start speaking."
                  : status === "finalizing"
                    ? "Processing audio..."
                    : "Your transcription will appear here."}
              </p>
            )}

            {isRecording && transcript && (
              <p className="mt-3 animate-pulse text-sm text-green-400">
                Listening...
              </p>
            )}
          </div>

          {/* Transcription Metadata */}
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-slate-400">Model language</p>

              <p className="mt-1 font-medium">{result?.language ?? "--"}</p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Sample rate</p>

              <p className="mt-1 font-medium">
                {sampleRate ? `${sampleRate / 1000} kHz` : "--"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Last inference time</p>

              <p className="mt-1 font-medium">
                {result ? `${result.processing_time_seconds}s` : "--"}
              </p>
            </div>

            <div>
              <p className="text-xs text-slate-400">Audio processed</p>

              <p className="mt-1 font-medium">
                {result ? `${result.duration_seconds}s` : "--"}
              </p>
            </div>
          </div>

          {/* Copy Transcript */}
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => void handleCopy()}
              disabled={!transcript}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800 disabled:opacity-40"
            >
              {copyFeedback || "Copy Transcript"}
            </button>
          </div>
        </section>

        {status === "completed" && result && (
  <SaveTranscriptionForm result={result} />
)}

        <footer className="text-center text-xs text-slate-500">
          Self-hosted AI transcription · Next.js · FastAPI
        </footer>
      </div>
    </main>
  );
}
