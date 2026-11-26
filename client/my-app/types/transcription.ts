export type LanguageOption = "auto" | "hi" | "en";

export type RecordingStatus =
  | "idle"
  | "connecting"
  | "recording"
  | "finalizing"
  | "completed"
  | "error";

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface TranscriptionResult {
  text: string;
  language: string | null;
  language_probability: number | null;
  duration_seconds: number;
  processing_time_seconds: number;
  segments: TranscriptionSegment[];
}

export type ServerMessage =
  | {
      type: "connected";
    }
  | {
      type: "ready";
      sample_rate: number;
      max_duration_seconds: number;
    }
  | ({
      type: "partial";
    } & TranscriptionResult)
  | ({
      type: "final";
    } & TranscriptionResult)
  | {
      type: "error";
      message: string;
    };

// Database transcription record
export interface Transcription {
  id: string;
  title: string;
  content: string;
  language: string | null;
  duration_seconds: number;
  created_at: string;
  updated_at: string;
}

// POST request body
export interface TranscriptionCreate {
  title: string;
  content: string;
  language?: string | null;
  duration_seconds: number;
}

// PATCH request body
export interface TranscriptionUpdate {
  title?: string;
  content?: string;
}

// Paginated GET response
export interface TranscriptionListResponse {
  items: Transcription[];
  total: number;
  limit: number;
  offset: number;
}