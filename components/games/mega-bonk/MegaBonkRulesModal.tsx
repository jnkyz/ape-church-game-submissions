"use client";

import React from "react";
import Image from "next/image";
import { X } from "lucide-react";

interface MegaBonkRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MegaBonkRulesModal: React.FC<MegaBonkRulesModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mega-bonk-rules-title"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[min(90vh,640px)] w-full max-w-md flex-col gap-5 overflow-hidden rounded-[8px] border border-[#7FFFD455] p-6 shadow-[0_0_40px_rgba(127,255,212,0.18)] sm:p-7"
        style={{
          background:
            "linear-gradient(160deg, rgba(7, 20, 28, 0.99), rgba(15, 40, 53, 0.97))",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <Image
          src="/submissions/mega-bonk/ui/jnkyz-art-white-cutout-v3.png"
          alt=""
          width={420}
          height={420}
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -right-20 w-72 opacity-[0.07]"
        />

        <header className="relative z-10 grid grid-cols-[2rem_1fr_2rem] items-start gap-x-2">
          <Image
            src="/submissions/mega-bonk/ui/jnkyz-logo-white.png"
            alt="JNKYZ"
            width={30}
            height={30}
            className="mt-0.5 h-7 w-7 object-contain"
          />
          <div className="text-center">
            <h2
              id="mega-bonk-rules-title"
              className="text-xl font-black uppercase tracking-[0.08em] text-[#7FFFD4]"
            >
              How To Play
            </h2>
            <p className="mt-2 text-sm text-[#8AD9E8]">
              Set the bar, throw the punch, and beat the machine.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="justify-self-end rounded-[6px] p-1.5 text-[#98C9D3] transition hover:bg-[#7FFFD4]/10 hover:text-[#C9FFF3]"
            aria-label="Close rules"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="relative z-10 space-y-4">
          <ol className="space-y-2.5 text-sm text-white/90">
            <li>1. Choose APE or GP, then set your bet.</li>
            <li>2. Set the target score with the slider or the machine meter.</li>
            <li>3. Press Bonk to start the punch sequence.</li>
            <li>4. Score higher than your target to win the displayed payout.</li>
            <li>5. Higher targets are harder to beat and pay more.</li>
          </ol>
          <p className="text-xs text-[#8AD9E8]">
            The machine meter and the control-panel slider stay synchronized.
          </p>
        </div>

        <footer className="relative z-10 border-t border-[#7FFFD422] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-[6px] border-0 bg-[#7FFFD4] py-2.5 text-sm font-black uppercase tracking-[0.12em] text-[#042D28] shadow-[0_0_24px_rgba(127,255,212,0.35)] transition hover:bg-[#6EE8C4]"
          >
            Got It
          </button>
        </footer>
      </div>
    </div>
  );
};

export default MegaBonkRulesModal;
