"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
    SUBMISSION_SORT_OPTIONS,
    type SubmissionSort,
} from "@/lib/submissionSort";

export default function SubmissionsSortSelect({
    currentSort,
}: {
    currentSort: SubmissionSort;
}) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const onChange = (value: SubmissionSort): void => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === "date-desc") {
            params.delete("sort");
        } else {
            params.set("sort", value);
        }
        const q = params.toString();
        router.push(q ? `/?${q}` : "/", { scroll: false });
    };

    return (
        <label className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-sm font-medium text-muted-foreground">
                Sort by
            </span>
            <select
                className="h-10 min-w-[12rem] rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={currentSort}
                onChange={(e) => onChange(e.target.value as SubmissionSort)}
                aria-label="Sort submissions"
            >
                {SUBMISSION_SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </label>
    );
}
