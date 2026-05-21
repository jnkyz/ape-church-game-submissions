const statusClasses: Record<string, string> = {
    pending: "bg-amber-500 text-black",
    approved: "bg-green-500 text-black",
    rejected: "bg-red-500 text-white",
    /** High contrast on dark cards — brand green + dark label */
    live: "bg-primary text-primary-foreground ring-2 ring-primary/25 shadow-sm",
};

export default function StatusBadge({ status }: { status: string }) {
    const key = status.toLowerCase();
    const className =
        statusClasses[key] ?? "bg-muted text-muted-foreground";

    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${className}`}
        >
            {status}
        </span>
    );
}