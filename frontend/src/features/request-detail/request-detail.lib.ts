import { bytesToHex, type Hex } from "viem";
import { z } from "zod";

/** The SHA-256 of a document, as the 0x-prefixed lowercase hex stored on-chain. */
export async function sha256Hex(blob: Blob): Promise<Hex> {
  return bytesToHex(new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())));
}

export const COMMENT_MAX = 1000;

/** Characters as the backend counts them (code points, so an emoji is one). */
export const commentLength = (body: string) => [...body.trim()].length;

export const commentSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1)
    .refine((body) => commentLength(body) <= COMMENT_MAX),
});

export type CommentValues = z.output<typeof commentSchema>;
