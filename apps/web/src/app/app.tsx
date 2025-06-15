"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

const queryClient = new QueryClient();

const Landing = dynamic(() => import("../components/Landing"), {
  ssr: false,
});

const Trending = dynamic(() => import("./trending/page"), {
  ssr: false,
});

export default function App() {
  const pathname = usePathname();

  return (
    <QueryClientProvider client={queryClient}>
      {pathname === "/trending" ? <Trending /> : <Landing />}
    </QueryClientProvider>
  );
}
