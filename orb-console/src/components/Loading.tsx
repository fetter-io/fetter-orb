"use client";
import { Spinner } from "@/components/Spinner";

export default function Loading({
  message = "Loading...",
}: {
  message?: string;
}) {
  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-900 text-zinc-500">
      <div className="flex items-center space-x-3">
        <Spinner className="h-6 w-6 text-blue-400 animate-spin" />
        <span className="text-sm font-medium">{message}</span>
      </div>
    </div>
  );
}
