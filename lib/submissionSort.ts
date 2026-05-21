import type { GameMetadata } from "@/lib/getGameMetadata";

export const SUBMISSION_SORT_OPTIONS = [
    { value: "date-desc", label: "Newest first" },
    { value: "date-asc", label: "Oldest first" },
    { value: "creator-asc", label: "Creator (A–Z)" },
    { value: "creator-desc", label: "Creator (Z–A)" },
    { value: "status-asc", label: "Status (A–Z)" },
    { value: "status-desc", label: "Status (Z–A)" },
    { value: "title-asc", label: "Title (A–Z)" },
    { value: "title-desc", label: "Title (Z–A)" },
] as const;

export type SubmissionSort = (typeof SUBMISSION_SORT_OPTIONS)[number]["value"];

const SORT_VALUES = new Set<string>(
    SUBMISSION_SORT_OPTIONS.map((o) => o.value),
);

export function parseSubmissionSort(raw: string | undefined): SubmissionSort {
    if (raw && SORT_VALUES.has(raw)) {
        return raw as SubmissionSort;
    }
    return "date-desc";
}

function submittedTime(g: GameMetadata): number {
    if (!g.submittedAt) return 0;
    const t = new Date(g.submittedAt).getTime();
    return Number.isFinite(t) ? t : 0;
}

export function sortGameMetadata(
    games: GameMetadata[],
    sort: SubmissionSort,
): GameMetadata[] {
    const sorted = [...games];

    const cmpStr = (a: string, b: string): number =>
        a.localeCompare(b, undefined, { sensitivity: "base" });

    switch (sort) {
        case "date-desc":
            sorted.sort((a, b) => submittedTime(b) - submittedTime(a));
            break;
        case "date-asc":
            sorted.sort((a, b) => submittedTime(a) - submittedTime(b));
            break;
        case "creator-asc":
            sorted.sort((a, b) => cmpStr(a.team, b.team));
            break;
        case "creator-desc":
            sorted.sort((a, b) => cmpStr(b.team, a.team));
            break;
        case "status-asc":
            sorted.sort((a, b) =>
                cmpStr(a.status.toLowerCase(), b.status.toLowerCase()),
            );
            break;
        case "status-desc":
            sorted.sort((a, b) =>
                cmpStr(b.status.toLowerCase(), a.status.toLowerCase()),
            );
            break;
        case "title-asc":
            sorted.sort((a, b) => cmpStr(a.displayTitle, b.displayTitle));
            break;
        case "title-desc":
            sorted.sort((a, b) => cmpStr(b.displayTitle, a.displayTitle));
            break;
        default:
            sorted.sort((a, b) => submittedTime(b) - submittedTime(a));
    }

    return sorted;
}
