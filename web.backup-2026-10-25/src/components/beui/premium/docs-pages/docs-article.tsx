"use client";

import { ChevronRight } from "lucide-react";
import { Fragment, type ReactNode, useRef, useState } from "react";
import { cn } from "@/lib/beui/utils";
import {
  DOCS_ACTIVE_PAGE,
  DOCS_BREADCRUMB,
  DOCS_LABELS,
  DOCS_LEAD,
  DOCS_NAV,
  DOCS_NEXT,
  DOCS_PREVIOUS,
  DOCS_PRODUCT,
  DOCS_SECTIONS,
  DOCS_TITLE,
  DOCS_UPDATED,
  DOCS_VERSION,
  type DocsArticleLabels,
  type DocsFeedbackValue,
  type DocsNavGroup,
  type DocsPagerLink,
  type DocsSection,
} from "./docs-data";
import { DocsFeedback } from "./docs-feedback";
import { DocsHeader } from "./docs-header";
import { DocsMobileNav } from "./docs-mobile-nav";
import { DocsNav } from "./docs-nav";
import { DocsOutline } from "./docs-outline";
import { DocsPager } from "./docs-pager";
import { DocsWebhookArticle } from "./docs-webhook-article";
import { useScrollspy } from "./use-scrollspy";

/* ─────────────────────────────────────────────────────────
 * DOCS ARTICLE STORYBOARD
 *
 *  header   sticky product bar; "Browse" opens the mobile nav
 *           modal below lg (docs-header, docs-mobile-nav)
 *  nav      search filters pages live and highlights the match;
 *           the active page pill glides between links (docs-nav)
 *  body     children, or the default webhooks article built from
 *           DocSection, Callout, InlineCode, DocsCodeBlock,
 *           DocsDeliveryDiagram, and DocsPayloadTable
 *  install  package-manager tabs swap the command; copy swaps to
 *           a check for a moment (docs-code-block)
 *  diagram  event and acknowledgement packets loop while visible
 *  toc      a dot glides to the section being read while a ring
 *           fills with reading progress (docs-outline, use-scrollspy)
 *  footer   feedback buttons swap to a thank-you note; pager
 *           links select the previous or next page
 *  reduced  pills, dot, and feedback jump; the ring tracks raw
 *           progress; the diagram rests with every node lit
 * ───────────────────────────────────────────────────────── */
export type DocsArticleProps = {
  /** Article body. Defaults to the webhooks guide. */
  children?: ReactNode;
  navGroups?: readonly DocsNavGroup[];
  /** Controlled active page id. */
  activePage?: string;
  defaultActivePage?: string;
  onSelectPage?: (id: string) => void;
  /** Outline entries; ids match the `DocSection` ids in the body. */
  sections?: readonly DocsSection[];
  breadcrumb?: readonly string[];
  title?: ReactNode;
  lead?: ReactNode;
  /** Shown after the `updated` label; pass `null` to hide. */
  updated?: string | null;
  previous?: DocsPagerLink | null;
  next?: DocsPagerLink | null;
  productName?: ReactNode;
  version?: ReactNode;
  dashboardHref?: string;
  labels?: Partial<DocsArticleLabels>;
  onFeedback?: (value: DocsFeedbackValue) => void;
  className?: string;
};

export function DocsArticle({
  children,
  navGroups = DOCS_NAV,
  activePage: activePageProp,
  defaultActivePage = DOCS_ACTIVE_PAGE,
  onSelectPage,
  sections = DOCS_SECTIONS,
  breadcrumb = DOCS_BREADCRUMB,
  title = DOCS_TITLE,
  lead = DOCS_LEAD,
  updated = DOCS_UPDATED,
  previous = DOCS_PREVIOUS,
  next = DOCS_NEXT,
  productName = DOCS_PRODUCT,
  version = DOCS_VERSION,
  dashboardHref = "#",
  labels,
  onFeedback,
  className,
}: DocsArticleProps) {
  const copy = { ...DOCS_LABELS, ...labels };
  const articleRef = useRef<HTMLElement>(null);
  const [internalPage, setInternalPage] = useState(defaultActivePage);
  const [navOpen, setNavOpen] = useState(false);
  const activePage = activePageProp ?? internalPage;
  const activeSection = useScrollspy(sections.map((item) => item.id));

  const selectPage = (id: string) => {
    setInternalPage(id);
    onSelectPage?.(id);
    setNavOpen(false);
  };

  const navProps = {
    groups: navGroups,
    activePage,
    onSelect: selectPage,
    labels: copy,
  };

  return (
    <div
      className={cn(
        "min-h-screen w-full bg-background font-sans text-foreground",
        className,
      )}
    >
      <DocsHeader
        productName={productName}
        version={version}
        browseLabel={copy.browse}
        dashboardLabel={copy.dashboard}
        dashboardHref={dashboardHref}
        onBrowse={() => setNavOpen(true)}
      />

      <div className="mx-auto grid w-full max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_13rem]">
        <aside className="hidden lg:block">
          <div className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto py-8 pr-2">
            <DocsNav {...navProps} layoutScope="sidebar" />
          </div>
        </aside>

        <article ref={articleRef} className="min-w-0 py-10 lg:py-12">
          {breadcrumb.length > 0 ? (
            <ol className="flex flex-wrap items-center gap-1.5 text-muted-foreground text-sm">
              {breadcrumb.map((crumb, index) => {
                const last = index === breadcrumb.length - 1;
                return (
                  <Fragment key={`${index}-${crumb}`}>
                    <li className={last ? "text-foreground" : undefined}>
                      {crumb}
                    </li>
                    {last ? null : (
                      <li aria-hidden="true">
                        <ChevronRight className="size-3.5" />
                      </li>
                    )}
                  </Fragment>
                );
              })}
            </ol>
          ) : null}

          <h1 className="mt-5 text-balance font-medium text-4xl tracking-tight">
            {title}
          </h1>
          {lead ? (
            <p className="mt-4 max-w-2xl text-pretty text-lg text-muted-foreground leading-8">
              {lead}
            </p>
          ) : null}

          <div className="mt-10 max-w-2xl space-y-14">
            {children ?? <DocsWebhookArticle />}
          </div>

          <div className="mt-16 max-w-2xl border-border border-t pt-8">
            <div className="flex min-h-10 flex-wrap items-center justify-between gap-4">
              <DocsFeedback labels={copy} onFeedback={onFeedback} />
              {updated ? (
                <p className="text-muted-foreground text-sm">
                  {copy.updated(updated)}
                </p>
              ) : null}
            </div>

            <DocsPager
              previous={previous}
              next={next}
              previousLabel={copy.previous}
              nextLabel={copy.next}
              onSelect={selectPage}
            />
          </div>
        </article>

        <aside className="hidden xl:block">
          <DocsOutline
            sections={sections}
            activeSection={activeSection}
            targetRef={articleRef}
            label={copy.outline}
          />
        </aside>
      </div>

      <DocsMobileNav
        {...navProps}
        open={navOpen}
        onOpenChange={setNavOpen}
        title={copy.browseTitle}
        closeLabel={copy.closeNav}
      />
    </div>
  );
}
