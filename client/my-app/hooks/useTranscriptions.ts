"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";

import {
  createTranscription,
  getTranscriptions,
  getTranscription,
  updateTranscription,
  deleteTranscription,
} from "@/lib/api";

import { transcriptionKeys } from "@/lib/querkeys";

import type {
  TranscriptionUpdate,
} from "@/types/transcription";


// READ ALL
export function useTranscriptions(
  limit = 20,
  offset = 0
) {
  return useQuery({
    queryKey: transcriptionKeys.list(limit, offset),

    queryFn: ({ signal }) =>
      getTranscriptions(limit, offset, signal),

    placeholderData: keepPreviousData,
  });
}


// READ ONE
export function useTranscription(id: string) {
  return useQuery({
    queryKey: transcriptionKeys.detail(id),

    queryFn: ({ signal }) =>
      getTranscription(id, signal),

    enabled: Boolean(id),
  });
}


// CREATE
export function useCreateTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTranscription,

    onSuccess: async (created) => {
      queryClient.setQueryData(
        transcriptionKeys.detail(created.id),
        created
      );

      await queryClient.invalidateQueries({
        queryKey: transcriptionKeys.lists(),
      });
    },
  });
}


// UPDATE
export function useUpdateTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: TranscriptionUpdate;
    }) => updateTranscription(id, data),

    onSuccess: async (updated) => {
      queryClient.setQueryData(
        transcriptionKeys.detail(updated.id),
        updated
      );

      await queryClient.invalidateQueries({
        queryKey: transcriptionKeys.lists(),
      });
    },
  });
}


// DELETE
export function useDeleteTranscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteTranscription,

    onSuccess: async (_, id) => {
      queryClient.removeQueries({
        queryKey: transcriptionKeys.detail(id),
        exact: true,
      });

      await queryClient.invalidateQueries({
        queryKey: transcriptionKeys.lists(),
      });
    },
  });
}