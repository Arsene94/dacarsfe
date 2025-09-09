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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className={cn("bg-white rounded-lg shadow-lg w-full p-6", className)}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export { Popup };
