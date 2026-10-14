"use client";

import { CheckIcon, ChevronDownIcon } from "lucide-react";
import { Select as S } from "radix-ui";
import * as React from "react";
import { cn } from "@/lib/utils";

export const Select = S.Root;
export const SelectValue = S.Value;
export const SelectGroup = S.Group;

export function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof S.Trigger>) {
  return (
    <S.Trigger
      className={cn(
        "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-surface px-3 text-base text-foreground outline-none transition-colors sm:text-sm",
        "hover:border-border-strong focus-visible:border-primary focus-visible:ring-3 focus-visible:ring-primary/20 data-[placeholder]:text-subtle-foreground aria-invalid:border-destructive/70 disabled:opacity-50",
        "[&>span]:truncate",
        className,
      )}
      {...props}
    >
      {children}
      <S.Icon asChild>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
      </S.Icon>
    </S.Trigger>
  );
}

export function SelectContent({ className, children, position = "popper", ...props }: React.ComponentProps<typeof S.Content>) {
  return (
    <S.Portal>
      <S.Content
        position={position}
        sideOffset={4}
        className={cn(
          "relative z-50 max-h-[min(var(--radix-select-content-available-height),20rem)] min-w-[8rem] overflow-hidden rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-xl",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-[0.98]",
          position === "popper" && "w-full min-w-[var(--radix-select-trigger-width)]",
          className,
        )}
        {...props}
      >
        <S.Viewport className="scrollbar-thin">{children}</S.Viewport>
      </S.Content>
    </S.Portal>
  );
}

export function SelectItem({ className, children, ...props }: React.ComponentProps<typeof S.Item>) {
  return (
    <S.Item
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-none select-none",
        "data-[highlighted]:bg-surface-hover data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <S.ItemText>{children}</S.ItemText>
      <span className="absolute right-2 flex size-4 items-center justify-center">
        <S.ItemIndicator>
          <CheckIcon className="size-4 text-primary" />
        </S.ItemIndicator>
      </span>
    </S.Item>
  );
}
