"use client";

import type { ComponentProps } from "react";
import Link from "next/link";

import { usePrefetchRequest } from "@/features/requests/requests.hooks";

type RequestLinkProps = Omit<ComponentProps<typeof Link>, "href" | "id"> & {
  /** The request; not the element id. */
  id: number;
};

/** A link to a request page that starts loading the request as soon as the member shows intent. */
export function RequestLink(props: RequestLinkProps) {
  const { id, ...rest } = props;
  const prefetch = usePrefetchRequest(id);
  return <Link href={`/requests/${id}`} {...prefetch} {...rest} />;
}
