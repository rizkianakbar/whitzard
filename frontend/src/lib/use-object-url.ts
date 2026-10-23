import { useEffect, useMemo } from "react";

/** A temporary URL for a Blob or File (an <img> preview, a document to open), revoked when it changes or unmounts. */
export function useObjectUrl(blob: Blob | null | undefined): string | null {
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  return url;
}
