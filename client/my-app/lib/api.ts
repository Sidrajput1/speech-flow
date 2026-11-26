import axios, { AxiosRequestConfig, AxiosError } from "axios";
import type {HealthResponse} from '@/types/api';

import type {
  Transcription,
  TranscriptionCreate,
  TranscriptionUpdate,
  TranscriptionListResponse,
} from "@/types/transcription";



const API_URL = process.env.NEXT_PUBLIC_API_URL;

if (!API_URL) {
  throw new Error("NEXT_PUBLIC_API_URL is not configured");
}

const apiClient = axios.create({
    baseURL:API_URL,
    headers:{
        "Content-Type": "application/json",
    },
});

// 2. Generic API request helper
async function apiRequest<T>(
  endpoint: string,
  options: AxiosRequestConfig = {}
): Promise<T> {
  try {
    const response = await apiClient.request<T>({
      url: endpoint,
      ...options,
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      throw new Error(
        status
          ? `API request failed with status ${status}`
          : `API request failed: ${error.message}`
      );
    }
    throw error;
  }
}

// 3. Health check function
export function checkBackendHealth() {
  return apiRequest<HealthResponse>("/health", {
    method: "GET",
  });
};



// CREATE
export function createTranscription(
  data: TranscriptionCreate
) {
  return apiRequest<Transcription>(
    "/api/transcriptions",
    {
      method: "POST",
      data,
    }
  );
}


// READ ALL
export function getTranscriptions(
  limit = 20,
  offset = 0,
  signal?: AbortSignal
) {
  return apiRequest<TranscriptionListResponse>(
    "/api/transcriptions",
    {
      method: "GET",
      params: {
        limit,
        offset,
      },
      signal,
    }
  );
}


// READ ONE
export function getTranscription(
  id: string,
  signal?: AbortSignal
) {
  return apiRequest<Transcription>(
    `/api/transcriptions/${id}`,
    {
      method: "GET",
      signal,
    }
  );
}


// UPDATE
export function updateTranscription(
  id: string,
  data: TranscriptionUpdate
) {
  return apiRequest<Transcription>(
    `/api/transcriptions/${id}`,
    {
      method: "PATCH",
      data,
    }
  );
}


// DELETE
export async function deleteTranscription(
  id: string
): Promise<void> {
  await apiRequest<void>(
    `/api/transcriptions/${id}`,
    {
      method: "DELETE",
    }
  );
}