import type { Metadata } from "next";
import { Suspense } from "react";

import { MemberGate } from "@/features/members/member-gate";
import { RequestDetail, RequestDetailSkeleton } from "@/features/request-detail/request-detail";
import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> => pageTitle("request");

export default function Page({ params }: PageProps<"/[lang]/requests/[id]">) {
  return (
    <MemberGate fallback={<RequestDetailSkeleton />}>
      <Suspense fallback={<RequestDetailSkeleton />}>
        {params.then(({ id }) => (
          <RequestDetail id={Number(id)} />
        ))}
      </Suspense>
    </MemberGate>
  );
}
