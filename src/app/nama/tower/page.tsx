"use client";
import { StripBoard } from "@/components/strips/StripBoard";

// NAMA stakeholders get the live Tower Operations board, strictly read-only:
// full national visibility (all aerodromes, live SSE), no create/advance/edit.
export default function NamaTowerBoardPage() {
  return <StripBoard readOnly />;
}
