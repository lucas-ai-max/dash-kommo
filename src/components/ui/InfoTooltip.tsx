"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export default function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({
      top: rect.top + window.scrollY - 8,
      left: rect.left + rect.width / 2,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    function handleClick(e: MouseEvent) {
      if (
        btnRef.current?.contains(e.target as Node) ||
        tooltipRef.current?.contains(e.target as Node)
      )
        return;
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open, updatePosition]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold leading-none border border-gray-600 text-gray-500 hover:text-gray-300 hover:border-gray-400 transition-colors cursor-pointer shrink-0"
        aria-label="Informação sobre esta métrica"
      >
        i
      </button>
      {open &&
        createPortal(
          <div
            ref={tooltipRef}
            className="fixed z-[9999] w-56 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs text-gray-300"
            style={{
              top: pos.top,
              left: pos.left,
              transform: "translate(-50%, -100%)",
              boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
            }}
          >
            {text}
            <div className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 rotate-45 bg-gray-900 border-r border-b border-gray-700 -mt-1" />
          </div>,
          document.body
        )}
    </>
  );
}
