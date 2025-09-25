import React from "react";
import { cn } from "@/lib/utils";

interface PopupProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

const Popup: React.FC<PopupProps> = ({ open, onClose, children, className }) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className={cn(
          "relative mx-auto w-full max-w-3xl rounded-lg bg-white p-6 shadow-lg",
          "max-h-[calc(100vh-4rem)] overflow-y-auto",
          className,
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export { Popup };
