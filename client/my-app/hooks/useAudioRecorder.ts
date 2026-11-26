"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";

import { float32ToPCM16 } from "@/lib/audio";

type AudioChunkHandler = (
  chunk: ArrayBuffer,
  sampleRate: number
) => void;

type PrepareHandler = (
  sampleRate: number
) => Promise<void>;

type FlushWaiter = {
  resolve: () => void;
  reject: (error: Error) => void;
};

export function useAudioRecorder(
  onAudioChunk: AudioChunkHandler
) {
  const [isRecording, setIsRecording] =
    useState(false);

  const [isStarting, setIsStarting] =
    useState(false);

  const [sampleRate, setSampleRate] =
    useState<number | null>(null);

  const [error, setError] =
    useState<string | null>(null);

  const contextRef =
    useRef<AudioContext | null>(null);

  const streamRef =
    useRef<MediaStream | null>(null);

  const sourceRef =
    useRef<MediaStreamAudioSourceNode | null>(null);

  const processorRef =
    useRef<AudioWorkletNode | null>(null);

  const flushRef =
    useRef<FlushWaiter | null>(null);

  const startingRef = useRef(false);
  const stoppingRef = useRef(false);
  const sessionRef = useRef(0);

  const callbackRef = useRef(onAudioChunk);

  useEffect(() => {
    callbackRef.current = onAudioChunk;
  }, [onAudioChunk]);


  // Release all browser audio resources.
  const cleanup = useCallback(async () => {
    sessionRef.current++;

    const processor = processorRef.current;
    const source = sourceRef.current;
    const stream = streamRef.current;
    const context = contextRef.current;

    flushRef.current?.reject(
      new Error("Audio capture was closed")
    );

    flushRef.current = null;
    processorRef.current = null;
    sourceRef.current = null;
    streamRef.current = null;
    contextRef.current = null;

    if (processor) {
      processor.port.onmessage = null;
      processor.disconnect();
      processor.port.close();
    }

    source?.disconnect();

    stream?.getTracks().forEach((track) => {
      track.stop();
    });

    if (context && context.state !== "closed") {
      await context.close().catch(() => {});
    }
  }, []);


  // Stop immediately in case of failure.
  const abortRecording = useCallback(async () => {
    await cleanup();

    setIsRecording(false);
    setIsStarting(false);
  }, [cleanup]);


  async function startRecording(
    prepare?: PrepareHandler
  ): Promise<boolean> {
    if (
      startingRef.current ||
      stoppingRef.current ||
      contextRef.current
    ) {
      return false;
    }

    startingRef.current = true;

    const session = ++sessionRef.current;

    setIsStarting(true);
    setError(null);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "Microphone access is not supported"
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

      if (session !== sessionRef.current) {
        stream.getTracks().forEach((track) => {
          track.stop();
        });

        return false;
      }

      streamRef.current = stream;

      let context: AudioContext;

      try {
        context = new AudioContext({
          sampleRate: 16000,
        });
      } catch {
        context = new AudioContext();
      }

      contextRef.current = context;

      await context.audioWorklet.addModule(
        "/audio-processor.js"
      );

      if (session !== sessionRef.current) {
        return false;
      }

      await context.resume();

      if (session !== sessionRef.current) {
        return false;
      }

      setSampleRate(context.sampleRate);

      // Wait for backend readiness.
      if (prepare) {
        await prepare(context.sampleRate);
      }

      if (session !== sessionRef.current) {
        return false;
      }

      const source =
        context.createMediaStreamSource(stream);

      sourceRef.current = source;

      const processor = new AudioWorkletNode(
        context,
        "audio-processor",
        {
          channelCount: 1,
          channelCountMode: "explicit",
        }
      );

      processorRef.current = processor;

      processor.port.onmessage = (event) => {
        if (session !== sessionRef.current) {
          return;
        }

        if (event.data?.type === "flushed") {
          flushRef.current?.resolve();

          flushRef.current = null;

          return;
        }

        if (!(event.data instanceof Float32Array)) {
          return;
        }

        const pcm16Audio =
          float32ToPCM16(event.data);

        callbackRef.current(
          pcm16Audio,
          context.sampleRate
        );
      };

      source.connect(processor);

      processor.connect(context.destination);

      setIsRecording(true);

      return true;

    } catch (err) {
      if (session === sessionRef.current) {
        setError(
          err instanceof Error
            ? err.message
            : "Microphone initialization failed"
        );

        await cleanup();

        setIsRecording(false);
      }

      return false;

    } finally {
      startingRef.current = false;
      setIsStarting(false);
    }
  }


  async function stopRecording(): Promise<boolean> {
    if (
      stoppingRef.current ||
      startingRef.current
    ) {
      return false;
    }

    stoppingRef.current = true;

    const processor = processorRef.current;

    let flushed = true;

    try {
      if (processor) {
        await new Promise<void>((resolve, reject) => {
          const timeout = window.setTimeout(() => {
            flushRef.current = null;

            reject(
              new Error("Audio flush timed out")
            );
          }, 2000);

          flushRef.current = {
            resolve: () => {
              window.clearTimeout(timeout);
              resolve();
            },

            reject: (err) => {
              window.clearTimeout(timeout);
              reject(err);
            },
          };

          try {
            processor.port.postMessage({
              type: "flush",
            });
          } catch (err) {
            flushRef.current.reject(
              err instanceof Error
                ? err
                : new Error("Audio flush failed")
            );

            flushRef.current = null;
          }
        });
      }

    } catch (err) {
      flushed = false;

      setError(
        err instanceof Error
          ? err.message
          : "Audio flush failed"
      );

    } finally {
      await cleanup();

      stoppingRef.current = false;

      setIsRecording(false);
    }

    return flushed;
  }


  useEffect(() => {
    return () => {
      void cleanup();
    };
  }, [cleanup]);


  return {
    isRecording,
    isStarting,
    sampleRate,
    error,
    startRecording,
    stopRecording,
    abortRecording,
  };
}