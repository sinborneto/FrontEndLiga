export const thumbnailUrl = (source: string) =>
  `/api/images/thumbnail?src=${encodeURIComponent(source)}`;
