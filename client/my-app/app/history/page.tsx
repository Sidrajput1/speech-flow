"use client";

import { useState } from "react";
import Link from "next/link";

import {
  useTranscriptions,
} from "@/hooks/useTranscriptions";

import TranscriptionCard from
  "@/components/history/TranscriptionCard";


const PAGE_SIZE = 10;


export default function HistoryPage() {
  const [page, setPage] = useState(1);

  const offset = (page - 1) * PAGE_SIZE;

  const {
    data,
    isPending,
    isFetching,
    isError,
    error,
    isPlaceholderData,
    refetch,
  } = useTranscriptions(PAGE_SIZE, offset);


  const total = data?.total ?? 0;

  const totalPages = Math.max(
    1,
    Math.ceil(total / PAGE_SIZE)
  );

  const items = data?.items ?? [];

  const isOutOfRange =
    !!data &&
    !isPlaceholderData &&
    page > totalPages;


  return (
    <main className="min-h-screen bg-slate-950 px-4 py-10 text-white">

      <div className="mx-auto max-w-4xl space-y-6">

        {/* Header */}
        <header className="flex flex-wrap items-center justify-between gap-4">

          <div>
            <h1 className="text-3xl font-bold">
              Transcription History
            </h1>

            <p className="mt-1 text-slate-400">
              View and manage your saved recordings
            </p>
          </div>

          <Link
            href="/"
            className="rounded-lg bg-blue-600 px-4 py-2 hover:bg-blue-700"
          >
            New Recording
          </Link>

        </header>


        {/* Dashboard statistics */}
        <section className="grid grid-cols-2 gap-4">

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Total Transcriptions
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              {data ? total : "--"}
            </h2>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">
              Records on Current Page
            </p>

            <h2 className="mt-2 text-3xl font-bold">
              {data ? items.length : "--"}
            </h2>
          </div>

        </section>


        {/* Refresh controls */}
        <div className="flex items-center justify-between">

          <p role="status" className="text-sm text-slate-400">
            {isFetching
              ? "Fetching transcriptions..."
              : "Saved transcriptions"}
          </p>

          <button
            onClick={() => void refetch()}
            disabled={isFetching}
            className="rounded-lg border border-slate-700 px-3 py-2 text-sm disabled:opacity-50"
          >
            Refresh
          </button>

        </div>


        {/* Loading state */}
        {isPending && (
          <div className="space-y-4">
            {Array.from(
              { length: 3 },
              (_, index) => (
                <div
                  key={index}
                  className="h-40 animate-pulse rounded-xl bg-slate-900"
                />
              )
            )}
          </div>
        )}


        {/* Error state */}
        {isError && (
          <div className="rounded-xl border border-red-800 bg-red-950 p-5">

            <p role="alert" className="text-red-300">
              {error.message}
            </p>

            <button
              onClick={() => void refetch()}
              disabled={isFetching}
              className="mt-3 rounded-lg bg-red-600 px-4 py-2"
            >
              Try Again
            </button>

          </div>
        )}


        {/* Empty state */}
        {data && total === 0 && !isPlaceholderData && (
          <div className="rounded-xl border border-dashed border-slate-700 p-10 text-center">

            <h2 className="text-xl font-semibold">
              No transcriptions yet
            </h2>

            <p className="mt-2 text-slate-400">
              Record your first audio and save it
              to see it here.
            </p>

            <Link
              href="/"
              className="mt-4 inline-block rounded-lg bg-blue-600 px-4 py-2"
            >
              Start Recording
            </Link>

          </div>
        )}


        {/* Handle deletion of last record on a page */}
        {isOutOfRange && (
          <div className="rounded-lg border border-slate-700 p-4">

            <p className="text-slate-400">
              This page is no longer available.
            </p>

            <button
              onClick={() => setPage(totalPages)}
              className="mt-2 text-blue-400 underline"
            >
              Go to last available page
            </button>

          </div>
        )}


        {/* History records */}
        {data && items.length > 0 && (
          <section
            className={`space-y-4 ${
              isPlaceholderData ? "opacity-60" : ""
            }`}
            aria-busy={isFetching}
          >
            {items.map((transcription) => (
              <TranscriptionCard
                key={transcription.id}
                transcription={transcription}
                disabled={isPlaceholderData}
              />
            ))}
          </section>
        )}


        {/* Pagination */}
        {data && total > 0 && !isOutOfRange && (
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-4">

            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={
                page === 1 || isPlaceholderData
              }
              className="rounded-lg border border-slate-700 px-4 py-2 disabled:opacity-40"
            >
              Previous
            </button>

            <p className="text-sm text-slate-400">
              Page {page} of {totalPages}
            </p>

            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={
                page >= totalPages ||
                isPlaceholderData
              }
              className="rounded-lg border border-slate-700 px-4 py-2 disabled:opacity-40"
            >
              Next
            </button>

          </div>
        )}

      </div>

    </main>
  );
}