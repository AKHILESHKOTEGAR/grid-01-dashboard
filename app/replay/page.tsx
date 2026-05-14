"use client";
import dynamic from "next/dynamic";

const ReplayPage = dynamic(() => import("./ReplayPageContent"), { ssr: false });

export default function Page() {
  return <ReplayPage />;
}
