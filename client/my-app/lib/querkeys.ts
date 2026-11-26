export const transcriptionKeys = {
  all: ["transcriptions"] as const,

  lists: () =>
    [...transcriptionKeys.all, "list"] as const,

  list: (limit: number, offset: number) =>
    [
      ...transcriptionKeys.lists(),
      { limit, offset },
    ] as const,

  details: () =>
    [...transcriptionKeys.all, "detail"] as const,

  detail: (id: string) =>
    [
      ...transcriptionKeys.details(),
      id,
    ] as const,
};