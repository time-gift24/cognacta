export type FileManagerEntry = {
  id: string;
  parentId: string | null;
  name: string;
  kind: "folder" | "file";
  mimeType?: string;
  size: number;
  modifiedAt: string;
  starred?: boolean;
  content?: string;
  /** Image or downloadable resource URL. Local uploads use session-scoped blob URLs. */
  sourceUrl?: string;
};
const DATE = "2026-09-08T08:00:00Z";
function textFile(
  id: string,
  parentId: string | null,
  name: string,
  content: string,
  starred = false,
): FileManagerEntry {
  return {
    id,
    parentId,
    name,
    content,
    starred,
    kind: "file",
    mimeType: "text/plain",
    size: new TextEncoder().encode(content).length,
    modifiedAt: DATE,
  };
}
export const FILE_MANAGER_ENTRIES: FileManagerEntry[] = [
  {
    id: "documents",
    parentId: null,
    name: "Documents",
    kind: "folder",
    size: 0,
    modifiedAt: DATE,
  },
  {
    id: "design",
    parentId: null,
    name: "Design assets",
    kind: "folder",
    size: 0,
    modifiedAt: DATE,
    starred: true,
  },
  {
    id: "projects",
    parentId: null,
    name: "Projects",
    kind: "folder",
    size: 0,
    modifiedAt: DATE,
  },
  textFile(
    "brief",
    null,
    "Project brief.md",
    "# A place for good work\n\nBuild a shared workspace that keeps the team focused.\n\n## Goals\n- Make important files easy to find\n- Keep feedback with the work\n- Give every project a clear next step\n\n## Next steps\nReview the scope together and choose a starting point.",
    true,
  ),
  textFile(
    "budget",
    null,
    "Launch budget.csv",
    "Category,Planned,Spent\nDesign,2400,1850\nDevelopment,6800,4200\nContent,1200,680\nMarketing,1800,940",
  ),
  textFile(
    "notes",
    null,
    "Meeting notes.txt",
    "Team sync\n\nDesign review is ready for feedback.\nContent updates are in progress.\nThe next milestone is the first working prototype.\n\nAction items\n- Share the revised brief\n- Review the product flow\n- Schedule a follow-up",
    true,
  ),
  textFile(
    "guide",
    "documents",
    "Getting started.md",
    "# Welcome to the workspace\n\nAdd your files, group them in folders, and star anything you return to often.\n\nUploads in this demo remain in your browser session.",
  ),
  textFile(
    "voice",
    "design",
    "Writing guidelines.md",
    "# Writing guidelines\n\nKeep it clear.\nUse familiar words.\nLead with what the reader needs.\nMake the next step easy to find.",
  ),
  textFile(
    "checklist",
    "projects",
    "Launch checklist.txt",
    "Launch checklist\n\n[ ] Review the experience\n[ ] Check small screens\n[ ] Verify accessibility\n[ ] Publish the release notes",
  ),
];
export function fileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}
export function uniqueFileName(
  name: string,
  siblings: readonly FileManagerEntry[],
) {
  const names = new Set(siblings.map((entry) => entry.name.toLowerCase()));
  if (!names.has(name.toLowerCase())) return name;
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : "";
  let index = 2;
  while (names.has(`${base} (${index})${extension}`.toLowerCase())) index++;
  return `${base} (${index})${extension}`;
}
