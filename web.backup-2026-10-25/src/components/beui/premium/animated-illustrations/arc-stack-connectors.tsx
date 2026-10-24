"use client";

import { ArcStack, type ArcStackLayout } from "./arc-stack";

const connectors = [
  { name: "Linear", logoUrl: "https://cdn.simpleicons.org/linear" },
  { name: "Figma", logoUrl: "https://cdn.simpleicons.org/figma" },
  {
    name: "Slack",
    logoUrl:
      "https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png",
  },
  { name: "Notion", logoUrl: "https://cdn.simpleicons.org/notion" },
  {
    name: "Google Drive",
    logoUrl: "https://cdn.simpleicons.org/googledrive",
  },
  { name: "GitHub", logoUrl: "https://cdn.simpleicons.org/github" },
  { name: "Dropbox", logoUrl: "https://cdn.simpleicons.org/dropbox" },
] as const;

export type ArcStackConnectorsProps = {
  className?: string;
  layout?: ArcStackLayout;
  title?: string;
};

export function ArcStackConnectors({
  className,
  layout = "default",
  title = "Connector logos rolling through a semicircular stack",
}: ArcStackConnectorsProps) {
  const items = connectors.map((connector) => ({
    id: connector.name,
    className: "grid place-items-center rounded-full bg-white",
    content: (
      // biome-ignore lint/performance/noImgElement: connector marks are official lightweight brand assets.
      <img
        src={connector.logoUrl}
        alt=""
        className="size-[32%] object-contain"
        draggable={false}
      />
    ),
  }));

  return (
    <ArcStack
      className={className}
      items={items}
      layout={layout}
      shape="circle"
      size="compact"
      title={title}
    />
  );
}
