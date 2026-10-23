"use client";

import type { ReactNode } from "react";

import { useReveal } from "@/features/landing/landing.hooks";

type RevealProps = {
  className?: string;
  children: ReactNode;
};

/** A block of the server-rendered landing page whose .rise children enter as it scrolls in. */
export function Reveal(props: RevealProps) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={props.className}>
      {props.children}
    </div>
  );
}
