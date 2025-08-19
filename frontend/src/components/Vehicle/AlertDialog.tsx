import React from "react";
import * as Dialog from "@radix-ui/react-dialog";

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
}

export default function AlertDialog({ open, onOpenChange, onConfirm, title, description }: AlertDialogProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)" }} />
        <Dialog.Content style={{
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          background: "#fff", borderRadius: "8px", padding: "24px", boxShadow: "0 10px 15px rgba(0,0,0,0.1)",
        }}>
          <Dialog.Title style={{ fontSize: "18px", fontWeight: 600, color: "#111827" }}>{title}</Dialog.Title>
          <Dialog.Description style={{ color: "#4b5563", marginTop: "8px" }}>{description}</Dialog.Description>
          <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "16px" }}>
            <Dialog.Close asChild>
              <button style={{
                padding: "8px 16px", background: "#e5e7eb", color: "#374151",
                borderRadius: "8px", border: "none", cursor: "pointer", transition: "background-color 0.2s",
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#d1d5db"}
              onMouseOut={(e) => e.currentTarget.style.background = "#e5e7eb"}
              >
                Cancel
              </button>
            </Dialog.Close>
            <button
              onClick={onConfirm}
              style={{
                padding: "8px 16px", background: "#dc2626", color: "#fff",
                borderRadius: "8px", border: "none", cursor: "pointer", transition: "background-color 0.2s",
              }}
              onMouseOver={(e) => e.currentTarget.style.background = "#b91c1c"}
              onMouseOut={(e) => e.currentTarget.style.background = "#dc2626"}
            >
              Confirm
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
