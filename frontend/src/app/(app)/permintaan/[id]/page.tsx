import type { Metadata } from "next";
import { Suspense } from "react";

import { MemberGate } from "@/components/member-gate";
import { RequestDetail } from "@/components/request-detail";
import { Skeleton } from "@/components/ui/skeleton";

export const metadata: Metadata = { title: "Detail permintaan" };

export default function Page({ params }: PageProps<"/permintaan/[id]">) {
  return (
    <MemberGate>
      <Suspense fallback={<Skeleton className="h-96 w-full rounded-xl" />}>
        {params.then(({ id }) => (
          <RequestDetail id={Number(id)} />
        ))}
      </Suspense>
    </MemberGate>
  );
}
