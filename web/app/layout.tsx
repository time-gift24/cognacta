import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { SessionProvider } from "@/components/workspace/session-provider";
import { WorkspaceShell } from "@/components/workspace/workspace-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { KnowledgeProvider } from "@/components/workspace/knowledge-provider";
import "./globals.css";

const sans = Geist({ subsets: ["latin"], variable: "--font-geist" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${sans.variable} ${mono.variable}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('cognacta.theme.v1');document.documentElement.dataset.theme=t==='light'||t==='dark'?t:t==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):'dark'}catch{}`,
          }}
        />
      </head>
      <body>
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ThemeProvider>
            <SessionProvider key={locale}>
              <KnowledgeProvider key={locale}>
                <WorkspaceShell>{children}</WorkspaceShell>
              </KnowledgeProvider>
            </SessionProvider>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
