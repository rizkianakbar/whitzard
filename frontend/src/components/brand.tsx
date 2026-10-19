import Link from "next/link";

/** The mark echoes the share grid: four shares, one filled. */
export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-md">
      <span aria-hidden="true" className="grid size-5 grid-cols-2 gap-0.5">
        <span className="rounded-[2px] bg-nila" />
        <span className="rounded-[2px] bg-nila" />
        <span className="rounded-[2px] bg-nila" />
        <span className="rounded-[2px] bg-kunyit" />
      </span>
      <span className="text-xl font-bold tracking-tight">Whitzard</span>
    </Link>
  );
}
