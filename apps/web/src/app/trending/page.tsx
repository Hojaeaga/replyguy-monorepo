"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAccount } from "wagmi";

async function fetchTrendingData(fid: string) {
  const response = await fetch("/api/trending", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ fid }),
  });
  if (!response.ok) {
    throw new Error("Failed to fetch trending data");
  }
  return response.json();
}

export default function TrendingPage() {
  const { address } = useAccount();
  const { data: trendingData, isLoading, error } = useQuery({
    queryKey: ["trending", address],
    queryFn: () => fetchTrendingData(address || ""),
    enabled: !!address,
  });

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Loading trending content...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl text-red-500">Error loading trending content</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="mb-8 text-3xl font-bold">Trending for You</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {trendingData?.clusters?.map((cluster: any, index: number) => (
          <div
            key={index}
            className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h2 className="mb-4 text-xl font-semibold">{cluster.topic}</h2>
            <div className="space-y-4">
              {cluster.casts?.map((cast: any, castIndex: number) => (
                <div key={castIndex} className="rounded-md bg-gray-50 p-4">
                  <p className="text-gray-700">{cast.text}</p>
                  <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
                    <span>@{cast.author}</span>
                    <span>{cast.likes} likes</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 