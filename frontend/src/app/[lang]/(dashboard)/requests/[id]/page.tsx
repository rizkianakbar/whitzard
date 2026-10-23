import type { Metadata } from "next";
import { Suspense } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { MemberGate } from "@/features/members/member-gate";
import { RequestDetail } from "@/features/request-detail/request-detail";
import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> => pageTitle("request");

export default function Page({ params }: PageProps<"/[lang]/requests/[id]">) {
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
