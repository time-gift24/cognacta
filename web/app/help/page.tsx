import Link from "next/link";

export default function HelpPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-5 pt-20 pb-10 sm:px-8 lg:pt-12">
      <h1 className="text-2xl font-semibold tracking-tight">Workspace guide</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        A quick guide to this local Pair preview.
      </p>
      <div className="mt-8 space-y-6 text-sm leading-6">
        <section>
          <h2 className="font-medium">Chats and projects</h2>
          <p className="mt-1 text-muted-foreground">
            Start a chat from the sidebar. Use its menu to rename, move,
            archive, or delete it. Create and manage projects from the plus
            beside Projects.
          </p>
          <Link href="/projects" className="text-primary underline">
            Manage projects
          </Link>
        </section>
        <section>
          <h2 className="font-medium">Add context</h2>
          <p className="mt-1 text-muted-foreground">
            Use the composer’s plus menu to attach files or select knowledge
            sources. Sources are saved as snapshots with your message. File
            contents are not uploaded or saved after a reload; only their names
            are retained.
          </p>
          <Link href="/knowledge-base" className="text-primary underline">
            Open Knowledge base
          </Link>
        </section>
        <section>
          <h2 className="font-medium">Restore a conversation</h2>
          <p className="mt-1 text-muted-foreground">
            Archived chats keep their messages. Open the archive and choose
            Restore from a chat’s menu. Deletion is permanent.
          </p>
          <Link href="/archived" className="text-primary underline">
            View archived chats
          </Link>
        </section>
        <section>
          <h2 className="font-medium">What is simulated?</h2>
          <p className="mt-1 text-muted-foreground">
            Assistant replies, models, skills, and app connections are
            demonstrations. No model API, authentication, billing, web search,
            or file upload service is connected. Personalization is stored
            locally but does not alter the demo responses.
          </p>
        </section>
        <section>
          <h2 className="font-medium">Privacy and storage</h2>
          <p className="mt-1 text-muted-foreground">
            Your workspace stays in this browser’s local storage. It is not
            encrypted or synchronized across devices. Clearing site data removes
            local work. Avoid sensitive information in this preview.
          </p>
        </section>
      </div>
    </div>
  );
}
