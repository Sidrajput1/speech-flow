"use client";

import {
  useState,
  useCallback,
} from "react";

import { useAudioRecorder } from
  "@/hooks/useAudioRecorder";

export default function AudioTestPage() {
  const [chunks, setChunks] = useState(0);

  const [totalBytes, setTotalBytes] =
    useState(0);

  const [audioDuration, setAudioDuration] =
    useState(0);

  const handleAudioChunk = useCallback(
    (
      chunk: ArrayBuffer,
      sampleRate: number
    ) => {
      setChunks((prev) => prev + 1);

      setTotalBytes(
        (prev) => prev + chunk.byteLength
      );

      const sampleCount =
        chunk.byteLength / 2;

      setAudioDuration(
        (prev) =>
          prev + sampleCount / sampleRate
      );

      console.log("Audio chunk received", {
        bytes: chunk.byteLength,
        sampleRate,
        sampleCount,
      });
    },
    []
  );

  const {
    isRecording,
    isStarting,
    sampleRate,
    error,
    startRecording,
    stopRecording,
  } = useAudioRecorder(handleAudioChunk);

  function handleStart() {
    setChunks(0);
    setTotalBytes(0);
    setAudioDuration(0);

    void startRecording();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">

      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-8">

        <h1 className="text-3xl font-bold">
          Microphone Test
        </h1>

        <p className="mt-2 text-slate-400">
          SpeechFlow audio capture diagnostics
        </p>

        <div className="mt-6 space-y-3">

          <p>
            Status:{" "}
            {isRecording
              ? "Recording"
              : isStarting
                ? "Initializing"
                : "Idle"}
          </p>

          <p>
            Sample Rate: {sampleRate ?? "--"} Hz
          </p>

          <p>Audio Chunks: {chunks}</p>

          <p>Total Bytes: {totalBytes}</p>

          <p>
            Captured Audio:{" "}
            {audioDuration.toFixed(2)} seconds
          </p>

        </div>

        <div className="mt-6 flex gap-3">

          <button
            onClick={handleStart}
            disabled={isRecording || isStarting}
            className="flex-1 rounded-lg bg-green-600 py-3 disabled:opacity-50"
          >
            Start Recording
          </button>

          <button
            onClick={() => void stopRecording()}
            disabled={!isRecording}
            className="flex-1 rounded-lg bg-red-600 py-3 disabled:opacity-50"
          >
            Stop Recording
          </button>

        </div>

        {error && (
          <p className="mt-4 text-red-400">
            {error}
          </p>
        )}

      </div>

    </main>
  );
}