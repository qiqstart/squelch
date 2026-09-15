import type { ReactNode } from "react";
import type { OperatorFaceId } from "@/lib/walkie/faces";
import { cn } from "@/lib/utils";

const MARKS: Record<OperatorFaceId, ReactNode> = {
  fox: (
    <>
      <path d="M7 11 4 5l6 3" />
      <path d="M17 11 20 5l-6 3" />
      <circle cx="12" cy="14" r="6" />
      <circle cx="9.5" cy="13.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13.5" r="0.9" fill="currentColor" stroke="none" />
      <path d="M12 15.5v2" />
    </>
  ),
  hawk: (
    <>
      <path d="M12 4 8 10h8Z" />
      <circle cx="12" cy="14" r="6" />
      <path d="M12 13v5" />
      <path d="M10 16h4" />
      <circle cx="9.5" cy="13" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13" r="0.8" fill="currentColor" stroke="none" />
    </>
  ),
  wolf: (
    <>
      <path d="M7 12 5 4l6 6" />
      <path d="M17 12 19 4l-6 6" />
      <circle cx="12" cy="14.5" r="5.5" />
      <circle cx="10" cy="14" r="0.8" fill="currentColor" stroke="none" />
      <circle cx="14" cy="14" r="0.8" fill="currentColor" stroke="none" />
      <path d="M11 17h2" />
    </>
  ),
  bear: (
    <>
      <circle cx="7" cy="8" r="2.4" />
      <circle cx="17" cy="8" r="2.4" />
      <circle cx="12" cy="14" r="6.2" />
      <circle cx="9.5" cy="13.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13.5" r="0.9" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="16.5" rx="1.6" ry="1" />
    </>
  ),
  owl: (
    <>
      <circle cx="12" cy="13" r="7" />
      <circle cx="9" cy="12.5" r="2.4" />
      <circle cx="15" cy="12.5" r="2.4" />
      <circle cx="9" cy="12.5" r="0.7" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12.5" r="0.7" fill="currentColor" stroke="none" />
      <path d="M12 15.5 10.5 18h3Z" />
    </>
  ),
  lynx: (
    <>
      <path d="M7.5 11 6 3.5 11 9" />
      <path d="M16.5 11 18 3.5 13 9" />
      <circle cx="12" cy="14" r="6" />
      <circle cx="9.5" cy="13.5" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="14.5" cy="13.5" r="0.9" fill="currentColor" stroke="none" />
      <path d="M9 17.5c1 .8 2 .8 3 0s2-.8 3 0" />
    </>
  ),
};

export function OperatorFace({
  id,
  className,
  title,
}: {
  id: string;
  className?: string;
  title?: string;
}) {
  const face = (id in MARKS ? id : "fox") as OperatorFaceId;
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("size-6 shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? "img" : undefined}
    >
      {title ? <title>{title}</title> : null}
      {MARKS[face]}
    </svg>
  );
}
