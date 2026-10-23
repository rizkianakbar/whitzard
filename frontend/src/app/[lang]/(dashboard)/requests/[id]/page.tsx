import type { Metadata } from "next";
import { Suspense } from "react";

import { MemberGate } from "@/features/members/member-gate";
import { RequestDetail, RequestDetailSkeleton, RequestPrefetch } from "@/features/request-detail/request-detail";
import { pageTitle } from "@/lib/i18n/server";

export const generateMetadata = (): Promise<Metadata> => pageTitle("request");

export default function Page({ params }: PageProps<"/[lang]/requests/[id]">) {
  return (
    <Suspense fallback={<RequestDetailSkeleton />}>
      {params.then(({ id }) => (
        // The request loads alongside the member check instead of after it.
        <MemberGate
          fallback={
            <>
              <RequestPrefetch id={Number(id)} />
              <RequestDetailSkeleton />
            </>
          }
        >
          <RequestDetail id={Number(id)} />
        </MemberGate>
      ))}
    </Suspense>
  );
}
