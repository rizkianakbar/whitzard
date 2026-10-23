import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type DoodleProps = {
  fill: ReactNode;
  children: ReactNode;
  className?: string;
};

/**
 * Hand-drawn "misprint" icons for the landing page (after arc.net): a thick outline in the text
 * colour over a turmeric fill that is printed slightly off, down and to the right. Decorative only.
 */
function Doodle(props: DoodleProps) {
  const { fill, children, className } = props;
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className={cn("size-12 shrink-0", className)}>
      <g transform="translate(3 3)" fill="var(--color-kunyit)">
        {fill}
      </g>
      <g fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </svg>
  );
}

type NoPolicyDoodleProps = {
  className?: string;
};

/** A policy document, struck through: no premium, no policy. */
export function NoPolicyDoodle(props: NoPolicyDoodleProps) {
  const { className } = props;
  return (
    <Doodle className={className} fill={<rect x="11" y="6" width="24" height="33" rx="4" />}>
      <path d="M15 6h13l9 9v20a4 4 0 0 1-4 4H15a4 4 0 0 1-4-4V10a4 4 0 0 1 4-4Z" />
      <path d="M28 6v6a3 3 0 0 0 3 3h6" />
      <path d="M17 23h12M17 29h8" />
      <path d="M7 41 41 7" />
    </Doodle>
  );
}

type EqualShareDoodleProps = {
  className?: string;
};

/** A round cut into four equal slices: everyone's share is the same. */
export function EqualShareDoodle(props: EqualShareDoodleProps) {
  const { className } = props;
  return (
    <Doodle className={className} fill={<circle cx="24" cy="24" r="16" />}>
      <circle cx="24" cy="24" r="16" />
      <path d="M24 8v32M8 24h32" />
    </Doodle>
  );
}

type HourglassDoodleProps = {
  className?: string;
};

/** An hourglass: time decides, not a person. */
export function HourglassDoodle(props: HourglassDoodleProps) {
  const { className } = props;
  return (
    <Doodle className={className} fill={<path d="M15 39h18l-9-10Z" />}>
      <path d="M13 7h22M13 41h22" />
      <path d="M16 7c0 9 8 11 8 17s-8 8-8 17M32 7c0 9-8 11-8 17s8 8 8 17" />
    </Doodle>
  );
}

type TurnsDoodleProps = {
  className?: string;
};

/** Two arrows chasing each other round: taking turns, like an arisan. */
export function TurnsDoodle(props: TurnsDoodleProps) {
  const { className } = props;
  return (
    <Doodle className={className} fill={<circle cx="24" cy="24" r="14" />}>
      <path d="M10.5 20A14 14 0 0 1 36 15.5" />
      <path d="M36.5 9v7h-7" />
      <path d="M37.5 28A14 14 0 0 1 12 32.5" />
      <path d="M11.5 39v-7h7" />
    </Doodle>
  );
}
