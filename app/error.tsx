"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h2 className="text-[20px] font-extrabold">Something went wrong</h2>
      <p className="text-[15px] text-muted">Please try again.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-link px-4 py-2 text-[15px] font-bold text-white"
      >
        Try again
      </button>
    </div>
  );
}
