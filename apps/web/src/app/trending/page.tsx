"use client";

import { useQuery } from "@tanstack/react-query";
import { useFrame } from "../../components/providers/FrameProvider";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

type UserSubscriptionResponse = {
  result: {
    subscribed: boolean;
  };
};

const fetchUserSubscription = async (fid: number): Promise<UserSubscriptionResponse> => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/register/user?fid=${fid}`,
    {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    },
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || "Failed to fetch subscription status");
  }

  return response.json();
};

async function fetchTrendingData(fid: number) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/trending`, {
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
  const { context } = useFrame();
  const router = useRouter();

  const { data: subscriptionData } = useQuery({
    queryKey: ["userSubscription", context?.user?.fid],
    queryFn: async () => {
      if (!context?.user?.fid) {
        return Promise.resolve({ result: { subscribed: false } });
      }
      return await fetchUserSubscription(context.user.fid);
    },
    enabled: !!context?.user?.fid,
  });

  // Redirect to home if not subscribed
  useEffect(() => {
    if (subscriptionData && !subscriptionData.result.subscribed) {
      router.push('/');
    }
  }, [subscriptionData, router]);

  const {
    data: trendingData,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["trending", context?.user?.fid],
    queryFn: () => fetchTrendingData(context?.user?.fid as number),
    enabled: !!context?.user?.fid,
  });

  // Redirect to main app if not in mini app context
  useEffect(() => {
    if (!context || !context.user?.displayName) {
      window.location.href = "https://farcaster.xyz/miniapps/1six6FpX-nRm/replyguy";
    }
  }, [context]);

  if (!context?.user?.fid) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-xl">Please open this in Farcaster</div>
      </div>
    );
  }

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
        <div className="text-xl text-red-500">
          Error loading trending content
        </div>
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

