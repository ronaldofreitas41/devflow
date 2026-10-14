"use client";

import { DropdownMenu as D } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

export const DropdownMenu = D.Root;
export const DropdownMenuTrigger = D.Trigger;
export const DropdownMenuSub = D.Sub;

export function DropdownMenuContent({ className, sideOffset = 4, ...props }: React.ComponentProps<typeof D.Content>) {
  return (
    <D.Portal>
      <D.Content
        sideOffset={sideOffset}
        className={cn(
          "z-50 min-w-44 overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98]",
          className,
        )}
        {...props}
      />
    </D.Portal>
  );
}

const itemClass =
  "relative flex cursor-default items-center gap-2 rounded-md px-2 py-1.5 text-sm outline-none select-none data-[highlighted]:bg-surface-hover data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:text-muted-foreground";

export function DropdownMenuItem({
  className,
  variant,
  ...props
}: React.ComponentProps<typeof D.Item> & { variant?: "destructive" }) {
  return (
    <D.Item
      className={cn(itemClass, variant === "destructive" && "text-destructive data-[highlighted]:bg-destructive/10 [&_svg]:text-destructive", className)}
      {...props}
    />
  );
}

export function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof D.Label>) {
  return <D.Label className={cn("px-2 py-1.5 text-xs text-muted-foreground", className)} {...props} />;
}

export function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof D.Separator>) {
  return <D.Separator className={cn("-mx-1 my-1 h-px bg-border", className)} {...props} />;
}

export function DropdownMenuSubTrigger({ className, ...props }: React.ComponentProps<typeof D.SubTrigger>) {
  return <D.SubTrigger className={cn(itemClass, "data-[state=open]:bg-surface-hover", className)} {...props} />;
}

export function DropdownMenuSubContent({ className, ...props }: React.ComponentProps<typeof D.SubContent>) {
  return (
    <D.Portal>
      <D.SubContent
        className={cn("z-50 min-w-40 rounded-lg border border-border bg-popover p-1 shadow-xl data-[state=open]:animate-in data-[state=open]:fade-in-0", className)}
        {...props}
      />
    </D.Portal>
  );
}
