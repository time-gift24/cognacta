"use client";

import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/beui/motion/tabs";
import { DocsCodeBlock } from "./docs-code-block";
import { Callout, DocSection, InlineCode } from "./docs-content";
import {
  DOCS_INSTALL,
  DOCS_VERIFY_CODE,
  type DocsPackageManager,
} from "./docs-data";
import { DocsDeliveryDiagram } from "./docs-delivery-diagram";
import { DocsPayloadTable } from "./docs-payload-table";

/**
 * Default article body: the Fieldnote webhooks guide. Its section ids match
 * `DOCS_SECTIONS`. Compose your own article from the same building blocks.
 */
export function DocsWebhookArticle() {
  const [manager, setManager] = useState<DocsPackageManager>("npm");

  return (
    <>
      <DocSection id="overview" title="Overview">
        <p>
          Create an endpoint in the dashboard, pick the events you care about,
          and Fieldnote starts delivering them right away. Each request carries
          a signature so you can confirm it came from us.
        </p>
        <Callout>
          Webhooks are available on every plan. Test mode events use a separate
          signing secret.
        </Callout>
      </DocSection>

      <DocSection id="install" title="Install the SDK">
        <p>
          The SDK verifies signatures and gives you typed events. Install it
          with your package manager.
        </p>
        <DocsCodeBlock
          code={DOCS_INSTALL[manager]}
          header={
            <Tabs
              value={manager}
              onValueChange={(value) => setManager(value as DocsPackageManager)}
              variant="underline"
            >
              <TabsList aria-label="Package manager" className="border-b-0">
                {(Object.keys(DOCS_INSTALL) as DocsPackageManager[]).map(
                  (key) => (
                    <TabsTrigger
                      key={key}
                      value={key}
                      className="font-mono text-xs"
                    >
                      {key}
                    </TabsTrigger>
                  ),
                )}
              </TabsList>
            </Tabs>
          }
        />
      </DocSection>

      <DocSection id="delivery" title="How delivery works">
        <p>
          Events are signed and queued as soon as they happen. Your endpoint has
          ten seconds to answer with a 2xx status before the attempt counts as
          failed.
        </p>
        <DocsDeliveryDiagram />
      </DocSection>

      <DocSection id="verify" title="Verify signatures">
        <p>
          Read the raw request body, then pass it to the SDK together with the{" "}
          <InlineCode>fieldnote-signature</InlineCode> header.
        </p>
        <DocsCodeBlock code={DOCS_VERIFY_CODE} label="app/webhooks/route.ts" />
      </DocSection>

      <DocSection id="payload" title="Event payload">
        <p>Every event shares the same envelope.</p>
        <DocsPayloadTable />
      </DocSection>

      <DocSection id="retries" title="Retries">
        <p>
          Failed deliveries retry with exponential backoff for up to three days.
          Use the event <InlineCode>id</InlineCode> to skip events you have
          already handled.
        </p>
        <Callout>
          After 15 failed attempts we pause the endpoint and email the workspace
          owners.
        </Callout>
      </DocSection>
    </>
  );
}
