"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: "!bg-popover !border-border !text-foreground !rounded-lg !text-sm",
          description: "!text-muted-foreground",
        },
      }}
    />
  );
}
