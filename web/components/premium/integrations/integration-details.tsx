"use client";

import { Button } from "@/components/motion/button/base";
import { X } from "@/components/icons";
import {
  AnimatedModal,
  AnimatedModalTitle,
  AnimatedModalDescription,
} from "@/components/motion/animated-modal";
import type { IntegrationItem } from "./integration-data";
import { IntegrationMark } from "./integration-mark";

export function IntegrationDetails({
  integration,
  connected,
  open,
  onOpenChange,
  onConfirm,
}: {
  integration: IntegrationItem;
  connected: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}) {
  return (
    <AnimatedModal
      open={open}
      onOpenChange={onOpenChange}
      backdropClassName="bg-black/40 backdrop-blur-none"
      panelClassName="relative max-w-md rounded-2xl border border-border bg-background p-6"
    >
      <Button
        type="button"
        variant="ghost"
        aria-label="Close app details"
        onClick={() => onOpenChange(false)}
        className="absolute top-3 right-3 grid size-10 place-items-center rounded-full text-muted-foreground hover:bg-surface-active focus-visible:outline-2 focus-visible:outline-primary"
      >
        <X className="size-4" />
      </Button>
      <IntegrationMark
        integration={integration}
        className="size-12 rounded-xl bg-background"
      />
      <p className="mt-5 text-xs text-muted-foreground">
        {integration.category}
      </p>
      <AnimatedModalTitle className="mt-1 text-xl font-semibold">
        {connected
          ? `Manage ${integration.name}`
          : `Connect ${integration.name}`}
      </AnimatedModalTitle>
      <AnimatedModalDescription className="mt-2 text-sm leading-6 text-muted-foreground">
        {integration.description}
      </AnimatedModalDescription>
      <div className="mt-5 rounded-xl border border-border p-4 text-sm">
        <p className="font-medium">
          {connected ? "Connected in this demo" : "Try the connection flow"}
        </p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          {connected
            ? "Disconnecting removes this app from your local connected list."
            : "This preview only updates your local app list. A production integration would request authorization from your provider."}
        </p>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          onClick={() => onOpenChange(false)}
          className="min-h-10 rounded-full px-4 text-sm hover:bg-surface-active focus-visible:outline-2 focus-visible:outline-primary"
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onConfirm}
          className="min-h-10 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {connected ? "Disconnect" : "Connect demo"}
        </Button>
      </div>
    </AnimatedModal>
  );
}
