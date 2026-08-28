"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";

interface LeadDuplicateBannerProps {
  count: number;
  searchQuery?: string;
}

export function LeadDuplicateBanner({ count, searchQuery }: LeadDuplicateBannerProps) {
  if (count <= 0) return null;

  const targetUrl = searchQuery
    ? `/leads/duplicates?search=${encodeURIComponent(searchQuery)}`
    : `/leads/duplicates`;

  return (
    <div className="flex items-center justify-between gap-4 p-3 px-4 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-sm font-medium">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0" />
        <span>
          DUPLICATE CLIENTS FOUND ({count}) — Same email or phone exists in your leads.
        </span>
      </div>
      <Link
        href={targetUrl}
        className="underline font-semibold hover:opacity-80 transition-opacity text-xs uppercase tracking-wide whitespace-nowrap"
      >
        View Details &rarr;
      </Link>
    </div>
  );
}
