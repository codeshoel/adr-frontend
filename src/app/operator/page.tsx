"use client";
import { StripBoard } from "@/components/strips/StripBoard";

// Tower capture is now the live strip-board (FRD §UOI — "One Screen, Always";
// "Live State, Not Batch Forms"). The previous batch entry form has been
// retired in favour of one-click phase advancement.
export default function OperatorPage() {
  return <StripBoard />;
}
