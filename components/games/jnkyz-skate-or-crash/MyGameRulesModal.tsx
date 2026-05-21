"use client";

import React from "react";
import { X } from "lucide-react";

interface MyGameRulesModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const MyGameRulesModal: React.FC<MyGameRulesModalProps> = ({
    isOpen,
    onClose,
}) => {
    if (!isOpen) {
        return null;
    }

    const handleDismiss = (): void => {
        onClose();
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="skate-or-crash-rules-title"
            onClick={handleDismiss}
        >
            <div
                className="relative flex max-h-[min(90vh,640px)] w-full max-w-md -translate-y-10 flex-col gap-5 overflow-y-auto rounded-xl border border-[#7FFFD433] p-6 font-roboto shadow-[0_0_40px_rgba(127,255,212,0.2)] sm:-translate-y-12 sm:p-7"
                style={{
                    background:
                        "linear-gradient(160deg, rgba(7, 20, 28, 0.98), rgba(15, 40, 53, 0.95))",
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="grid grid-cols-[2rem_1fr_2rem] items-start gap-x-2 gap-y-1">
                    <div aria-hidden="true" />
                    <div className="col-start-2 text-center">
                        <h2
                            id="skate-or-crash-rules-title"
                            className="text-xl font-black uppercase tracking-[0.08em] text-[#7FFFD4]"
                        >
                            How To Play
                        </h2>
                        <p className="mt-2 text-sm text-[#8AD9E8]">
                            Skate or Crash — cash out before Wade wipes out.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="col-start-3 justify-self-end rounded-md p-1.5 text-[#98C9D3] transition hover:bg-[#7FFFD4]/10 hover:text-[#C9FFF3]"
                        aria-label="Close rules"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </header>

                <div className="space-y-4">
                    <ul className="space-y-2.5 text-sm text-white/90">
                        <li>
                            1. Choose <span className="font-semibold">ApeCoin</span> or{" "}
                            <span className="font-semibold">GP</span> (game points), set your bet,
                            and optional auto-cashout.
                        </li>
                        <li>
                            2. Press <span className="font-semibold">Place Your Bet</span> to
                            start the run.
                        </li>
                        <li>3. Multiplier rises while Wade skates — cash out before crash.</li>
                        <li>4. If crash happens first, you lose that round&apos;s bet.</li>
                        <li>5. Use Play Again, Rewatch, or Change Bet after each round.</li>
                    </ul>
                    <p className="text-xs text-[#8AD9E8]">
                        Tip: Auto Cashout locks profit automatically at your target multiplier.
                    </p>
                </div>

                <footer className="border-t border-[#7FFFD422] pt-4">
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="w-full rounded-md border-0 py-2.5 text-sm font-black uppercase tracking-[0.12em] text-[#042d28] shadow-[0_0_24px_rgba(127,255,212,0.45)] transition hover:bg-[#6ee8c4] hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7FFFD4]/40"
                        style={{ backgroundColor: "#7FFFD4" }}
                    >
                        Got it
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default MyGameRulesModal;
