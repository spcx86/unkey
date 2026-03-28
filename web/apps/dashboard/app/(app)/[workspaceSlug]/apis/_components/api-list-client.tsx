"use client";

import { EmptyComponentSpacer } from "@/components/empty-component-spacer";
import { trpc } from "@/lib/trpc/client";
import { BookBookmark } from "@unkey/icons";
import { Button, Empty } from "@unkey/ui";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ApiListCard } from "./api-list-card";
import { ApiListControlCloud } from "./control-cloud";
import { ApiListControls } from "./controls";
import { CreateApiButton } from "./create-api-button";
import { ApiCardSkeleton } from "./skeleton";

const DEFAULT_LIMIT = 10;

export const ApiListClient = ({ workspaceSlug }: { workspaceSlug: string }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNewApi = searchParams?.get("new") === "true";

  const {
    data: apisData,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.api.overview.query.useInfiniteQuery(
    { limit: DEFAULT_LIMIT },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor,
    },
  );

  const allApis = useMemo(() => {
    if (!apisData?.pages) {
      return [];
    }
    return apisData.pages.flatMap((page) => page.apiList);
  }, [apisData]);

  const [apiList, setApiList] = useState(allApis);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    setApiList(allApis);
  }, [allApis]);

  useEffect(() => {
    if (error) {
      router.push("/new");
    }
  }, [error, router]);

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const isEmpty = !isLoading && apiList.length === 0 && !isSearching;

  return (
    <div className="flex flex-col">
      {!isEmpty && (
        <>
          <ApiListControls apiList={allApis} onApiListChange={setApiList} onSearch={setIsSearching} />
          <ApiListControlCloud />
        </>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 md:gap-5 w-full p-5">
          {Array.from({ length: DEFAULT_LIMIT }).map((_, i) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: It's okay to use index
            <ApiCardSkeleton key={i} />
          ))}
        </div>
      ) : apiList.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3 md:gap-5 w-full p-5">
            {apiList.map((api) => (
              <ApiListCard api={api} key={api.id} />
            ))}
          </div>

          <div className="flex flex-col items-center justify-center mt-8 pb-8 gap-4">
            <div className="text-center text-sm text-accent-11">
              Showing {apiList.length} of {apisData?.pages[0]?.total || 0} APIs
            </div>

            {!isSearching && hasNextPage && (
              <Button onClick={loadMore} disabled={isFetchingNextPage} size="md">
                {isFetchingNextPage ? (
                  <div className="flex flex-row items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-gray-7 border-t-transparent rounded-full" />
                    <span>Loading...</span>
                  </div>
                ) : (
                  <div className="flex flex-row items-center gap-2">
                    <span>Load more</span>
                  </div>
                )}
              </Button>
            )}
          </div>
        </>
      ) : (
        <EmptyComponentSpacer>
          <Empty className="m-0 p-0">
            <Empty.Icon />
            {isSearching ? (
              <>
                <Empty.Title>No APIs found</Empty.Title>
                <Empty.Description>
                  No APIs match your search criteria. Try a different search term.
                </Empty.Description>
              </>
            ) : (
              <>
                <Empty.Title className="text-lg">Welcome to Unkey</Empty.Title>
                <Empty.Description className="text-sm">
                  Create an API to start issuing and managing keys for your users.
                </Empty.Description>
                <Empty.Actions className="mt-4">
                  <CreateApiButton defaultOpen={isNewApi} workspaceSlug={workspaceSlug} />
                </Empty.Actions>
                <a
                  href="https://www.unkey.com/docs/introduction"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 text-xs text-accent-9 hover:text-accent-11 transition-colors underline underline-offset-2"
                >
                  Read the quickstart guide
                </a>
              </>
            )}
          </Empty>
        </EmptyComponentSpacer>
      )}
    </div>
  );
};
