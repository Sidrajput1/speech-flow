"use client";

import { useState, useRef, useEffect } from "react";

import { useAudioRecorder } from "@/hooks/useAudioRecorder";

import type {
  LanguageOption,
  RecordingStatus,
  ServerMessage,
  TranscriptionResult,
} from "@/types/transcription";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL;

const MAX_BUFFERED_BYTES = 256 * 1024;

const CONNECTION_TIMEOUT_MS = 10000;

const FINAL_TIMEOUT_MS = 60000;

type LiveSession = {
  socket: WebSocket | null;

  phase: "connecting" | "recording" | "finalizing";

  ready: boolean;

  sentSamples: number;

  maxSamples: number;

  connectTimer: number | null;

  finalTimer: number | null;

  rejectReady: ((error: Error) => void) | null;
};

// Clear timers and close the socket safely.
function disposeSession(session: LiveSession) {
  if (session.connectTimer !== null) {
    window.clearTimeout(session.connectTimer);
  }

  if (session.finalTimer !== null) {
    window.clearTimeout(session.finalTimer);
  }

  session.rejectReady?.(new Error("WebSocket session closed"));

  session.rejectReady = null;

  const socket = session.socket;

  session.socket = null;

  if (socket) {
    socket.onopen = null;
    socket.onmessage = null;
    socket.onerror = null;
    socket.onclose = null;

    if (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    ) {
      socket.close();
    }
  }
}

export function useTranscriptionSocket() {
  const [status, setStatus] = useState<RecordingStatus>("idle");

  const [transcript, setTranscript] = useState("");

  const [result, setResult] = useState<TranscriptionResult | null>(null);

  const [duration, setDuration] = useState(0);

  const [audioLevel, setAudioLevel] = useState(0);

  const [maxDuration, setMaxDuration] = useState(60);

  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<LiveSession | null>(null);

  const recorder = useAudioRecorder(handleAudioChunk);

  // Terminate an unsuccessful recording session.
  function failSession(session: LiveSession, message: string) {
    if (sessionRef.current !== session) {
      return;
    }

    sessionRef.current = null;

    disposeSession(session);

    void recorder.abortRecording();

    setAudioLevel(0);
    setError(message);
    setStatus("error");
  }

  // Establish WebSocket and wait for READY.
  function connect(
    session: LiveSession,
    sampleRate: number,
    language: LanguageOption,
  ): Promise<void> {
    if (!WS_URL) {
      return Promise.reject(new Error("NEXT_PUBLIC_WS_URL is not configured"));
    }

    return new Promise<void>((resolve, reject) => {
      const socket = new WebSocket(WS_URL);

      session.socket = socket;

      session.rejectReady = reject;

      session.connectTimer = window.setTimeout(() => {
        failSession(session, "WebSocket connection timed out");
      }, CONNECTION_TIMEOUT_MS);

      socket.onopen = () => {
        try {
          socket.send(
            JSON.stringify({
              type: "start",
              sample_rate: sampleRate,
              language,
            }),
          );
        } catch {
          failSession(session, "Unable to start transcription session");
        }
      };

      socket.onmessage = (event) => {
        if (sessionRef.current !== session) {
          return;
        }

        try {
          const message = JSON.parse(event.data) as ServerMessage;

          switch (message.type) {
            case "connected":
              console.log("WebSocket connected");
              break;

            case "ready":
              if (session.ready) {
                break;
              }

              if (
                message.sample_rate !== sampleRate ||
                !Number.isFinite(message.max_duration_seconds) ||
                message.max_duration_seconds <= 0
              ) {
                throw new Error("Invalid session configuration");
              }

              if (session.connectTimer !== null) {
                window.clearTimeout(session.connectTimer);
              }

              session.connectTimer = null;

              session.ready = true;

              session.maxSamples = Math.floor(
                sampleRate * message.max_duration_seconds,
              );

              setMaxDuration(message.max_duration_seconds);

              session.rejectReady = null;

              resolve();

              break;

            case "partial":
              // Replace the previous partial result.
              setTranscript(message.text);

              setResult(message);

              break;

            case "final":
              setTranscript(message.text);

              setResult(message);

              setStatus("completed");

              setAudioLevel(0);

              sessionRef.current = null;

              disposeSession(session);

              break;

            case "error":
              failSession(session, message.message);

              break;

            default:
              throw new Error("Unknown WebSocket message");
          }
        } catch (err) {
          failSession(
            session,
            err instanceof Error ? err.message : "Invalid server response",
          );
        }
      };

      socket.onerror = () => {
        failSession(session, "Unable to communicate with the backend");
      };

      socket.onclose = () => {
        failSession(session, "Connection closed before final transcription");
      };
    });
  }

  // Receive PCM16 chunks from our microphone hook.
  function handleAudioChunk(chunk: ArrayBuffer, sampleRate: number) {
    const session = sessionRef.current;

    if (!session || !session.ready) {
      return;
    }

    const socket = session.socket;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      failSession(session, "WebSocket connection is unavailable");

      return;
    }

    // Never send more audio than the server permits.
    const remainingSamples = session.maxSamples - session.sentSamples;

    if (remainingSamples <= 0) {
      return;
    }

    const allowedBytes = remainingSamples * 2;

    const payload =
      chunk.byteLength > allowedBytes ? chunk.slice(0, allowedBytes) : chunk;

    // Apply a basic outgoing network buffer limit.
    if (socket.bufferedAmount + payload.byteLength > MAX_BUFFERED_BYTES) {
      failSession(session, "Network is too slow to stream audio");

      return;
    }

    try {
      socket.send(payload);
    } catch {
      failSession(session, "Failed to transmit audio");

      return;
    }

    session.sentSamples += payload.byteLength / 2;

    setDuration(session.sentSamples / sampleRate);

    // Calculate audio amplitude for the live meter.
    const view = new DataView(payload);

    let sumOfSquares = 0;

    const count = payload.byteLength / 2;

    for (let i = 0; i < count; i++) {
      const sample = view.getInt16(i * 2, true) / 32768;

      sumOfSquares += sample * sample;
    }

    const rms = count > 0 ? Math.sqrt(sumOfSquares / count) : 0;

    setAudioLevel(rms);

    // Automatically stop at the server duration limit.
    if (
      session.sentSamples >= session.maxSamples &&
      session.phase === "recording"
    ) {
      void stop();
    }
  }

  // Start microphone and WebSocket together.
  async function start(language: LanguageOption = "auto") {
    if (sessionRef.current) {
      return;
    }

    const session: LiveSession = {
      socket: null,
      phase: "connecting",
      ready: false,
      sentSamples: 0,
      maxSamples: 0,
      connectTimer: null,
      finalTimer: null,
      rejectReady: null,
    };

    sessionRef.current = session;

    setError(null);
    setTranscript("");
    setResult(null);
    setDuration(0);
    setAudioLevel(0);
    setStatus("connecting");

    try {
      const started = await recorder.startRecording(async (sampleRate) => {
        await connect(session, sampleRate, language);
      });

      if (sessionRef.current !== session) {
        return;
      }

      if (!started) {
        throw new Error("Unable to start microphone recording");
      }

      session.phase = "recording";

      setStatus("recording");
    } catch (err) {
      failSession(
        session,
        err instanceof Error ? err.message : "Unable to start recording",
      );
    }
  }

  // Flush remaining audio and request final inference.
  async function stop() {
    const session = sessionRef.current;

    if (!session || session.phase !== "recording") {
      return;
    }

    session.phase = "finalizing";

    setStatus("finalizing");

    // Final audio packets are still sent during flushing.
    const flushed = await recorder.stopRecording();

    if (sessionRef.current !== session) {
      return;
    }

    setAudioLevel(0);

    if (!flushed) {
      failSession(session, "Unable to flush the remaining audio");

      return;
    }

    const socket = session.socket;

    if (!socket || socket.readyState !== WebSocket.OPEN) {
      failSession(session, "Connection lost while finalizing");

      return;
    }

    try {
      socket.send(
        JSON.stringify({
          type: "stop",
        }),
      );

      session.finalTimer = window.setTimeout(() => {
        failSession(session, "Final transcription timed out");
      }, FINAL_TIMEOUT_MS);
    } catch {
      failSession(session, "Unable to finalize transcription");
    }
  }

  // Release the network connection on page unmount.
  useEffect(() => {
    return () => {
      const session = sessionRef.current;

      sessionRef.current = null;

      if (session) {
        disposeSession(session);
      }
    };
  }, []);

  return {
    status,
    transcript,
    result,
    duration,
    audioLevel,
    maxDuration,

    error: recorder.error || error,

    sampleRate: recorder.sampleRate,

    start,
    stop,
  };
}
