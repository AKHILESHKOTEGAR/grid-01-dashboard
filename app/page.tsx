"use client";
import dynamic from "next/dynamic";

const HomePage = dynamic(() => import("./HomeContent"), { ssr: false });

export default function Page() {
  return <HomePage />;
}
