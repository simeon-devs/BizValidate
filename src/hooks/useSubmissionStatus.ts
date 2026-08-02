"use client";

import useSWR from "swr";

interface StatusResponse {
  status: "pending" | "scored";
}

const fetcher = async (url: string): Promise<StatusResponse> => {
  const res = await fetch(url);
  if (!res.ok) throw new Error("status fetch failed");
  return res.json() as Promise<StatusResponse>;
};

// Polls a submission's scoring status every few seconds and stops once the
// report exists — the report page uses this to swap the pending view for the
// real report without a manual reload.
export function useSubmissionStatus(id: string) {
  const { data, error } = useSWR<StatusResponse>(
    `/api/submissions/${id}/status`,
    fetcher,
    {
      refreshInterval: (latest) =>
        latest?.status === "scored" ? 0 : 4_000,
      revalidateOnFocus: true,
    },
  );

  return {
    scored: data?.status === "scored",
    error,
  };
}
