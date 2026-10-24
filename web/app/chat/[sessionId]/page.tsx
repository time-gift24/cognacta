import { WorkspacePage } from "@/components/workspace/workspace-page";

export default async function ChatPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return <WorkspacePage key={sessionId} sessionId={sessionId} />;
}
