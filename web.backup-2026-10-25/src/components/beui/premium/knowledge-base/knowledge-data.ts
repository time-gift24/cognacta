export type KnowledgeSection = {
  title: string;
  body: string;
  steps?: string[];
};
export type KnowledgeArticle = {
  id: string;
  title: string;
  description: string;
  category: string;
  readingMinutes: number;
  sections: KnowledgeSection[];
};
export const KNOWLEDGE_ARTICLES: readonly KnowledgeArticle[] = [
  {
    id: "first-workspace",
    title: "Create your first workspace",
    description: "Go from a blank canvas to a shared home for your team.",
    category: "Getting started",
    readingMinutes: 4,
    sections: [
      {
        title: "Start with one shared space",
        body: "A workspace keeps your projects, documents, and people together. Give it a name your teammates will recognize; you can change it later.",
        steps: [
          "Choose Create workspace from the workspace menu.",
          "Add a name and a short description of what your team is building.",
          "Choose a time zone so scheduled updates arrive at the right time.",
        ],
      },
      {
        title: "Make your first project",
        body: "Start with a single project and give it a clear outcome. Add a welcome document with the context a new teammate needs, then organize supporting material into a few focused folders.",
      },
      {
        title: "Bring your team in",
        body: "Invite a small group first. Give members access to the projects they need and ask them to add a short introduction. A shared starting point makes the first week easier.",
      },
    ],
  },
  {
    id: "import-content",
    title: "Move your existing content",
    description: "Bring useful documents along without bringing the clutter.",
    category: "Getting started",
    readingMinutes: 3,
    sections: [
      {
        title: "Prepare your files",
        body: "Review your current documents and keep the material your team still uses. Archive duplicate or outdated versions before importing.",
        steps: [
          "Export documents from your previous tool.",
          "Group related files into clearly named folders.",
          "Check that shared files do not include private information.",
        ],
      },
      {
        title: "Review the import",
        body: "Import one folder first and check headings, images, and links. When the structure looks right, bring in the remaining folders and assign an owner to each collection.",
      },
    ],
  },
  {
    id: "invite-members",
    title: "Invite and manage members",
    description: "Give the right people the right access to your workspace.",
    category: "Your team",
    readingMinutes: 3,
    sections: [
      {
        title: "Send an invitation",
        body: "Open Team settings and enter your teammate’s work email. Choose a role before sending the invitation so their access is ready when they join.",
        steps: [
          "Open Settings, then Team.",
          "Enter an email address and select Member or Admin.",
          "Review the address and send the invitation.",
        ],
      },
      {
        title: "Choose the right role",
        body: "Members collaborate on shared work. Admins also manage workspace settings and invitations. Keep admin access limited to people who need it.",
      },
      {
        title: "Review access regularly",
        body: "When someone changes teams or leaves, review their project access. Transfer ownership of important documents before removing their account from the workspace.",
      },
    ],
  },
  {
    id: "organize-projects",
    title: "Keep projects easy to navigate",
    description: "A simple structure that stays useful as your team grows.",
    category: "Your team",
    readingMinutes: 5,
    sections: [
      {
        title: "Organize around outcomes",
        body: "Use one project for each clear outcome. Keep project names short, specific, and familiar to the people doing the work.",
      },
      {
        title: "Create a useful starting point",
        body: "Pin a project overview that explains the goal, current status, and next milestone. Link to the most useful documents so newcomers know where to start.",
        steps: [
          "Write a one-paragraph project brief.",
          "Add an owner and the next milestone.",
          "Link the active documents from the overview.",
        ],
      },
      {
        title: "Close the loop",
        body: "Archive completed work with a short summary of what changed and what the team learned. Keep the archive searchable so useful context remains available.",
      },
    ],
  },
  {
    id: "manage-billing",
    title: "Update your billing details",
    description:
      "Keep invoices, billing contacts, and company details current.",
    category: "Plans & billing",
    readingMinutes: 2,
    sections: [
      {
        title: "Review your billing profile",
        body: "Workspace owners can update the company name, billing contact, address, and tax information from Billing settings. Use a shared finance inbox when possible.",
      },
      {
        title: "Check the next invoice",
        body: "Save your billing changes before the next renewal. Review the invoice preview and contact your workspace owner if the billing period or company information is incorrect.",
      },
    ],
  },
  {
    id: "secure-workspace",
    title: "Build a safer workspace",
    description: "Small habits that help protect your team’s shared knowledge.",
    category: "Security",
    readingMinutes: 4,
    sections: [
      {
        title: "Start with individual accounts",
        body: "Give each teammate their own account. Shared logins make it harder to understand who changed a document or who still needs access.",
      },
      {
        title: "Share deliberately",
        body: "Review a document’s audience before sharing it. Keep sensitive material in restricted projects and avoid placing confidential information in public links.",
        steps: [
          "Review member roles and project access.",
          "Remove invitations that are no longer needed.",
          "Check public links before sharing them outside your team.",
        ],
      },
      {
        title: "Keep ownership clear",
        body: "Assign an owner to important projects and review access when team responsibilities change. Clear ownership helps your team respond quickly when something needs attention.",
      },
    ],
  },
];

export function searchKnowledge(
  articles: readonly KnowledgeArticle[],
  query: string,
) {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  return articles.filter((article) => {
    const text = [
      article.title,
      article.description,
      article.category,
      ...article.sections.flatMap((section) => [
        section.title,
        section.body,
        ...(section.steps ?? []),
      ]),
    ]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => text.includes(term));
  });
}
