import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { SessionProvider } from "@/components/workspace/session-provider";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { KnowledgeProvider } from "@/components/workspace/knowledge-provider";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "Cognacta — Agent workspace",
  description:
    "Cognacta is an enterprise agent workspace for building, running, and observing AI agents.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('pair.theme.v1');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):'dark'}catch{}`,
          }}
        />
      </head>
      <body>
        <ThemeProvider>
          <SessionProvider>
            <KnowledgeProvider>
              <WorkspaceShell>{children}</WorkspaceShell>
            </KnowledgeProvider>
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
