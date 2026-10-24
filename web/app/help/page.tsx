import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function HelpPage() {
  const t = await getTranslations("Help");

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-14 pb-8 sm:px-6 lg:pt-9">
      <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
      <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
      <div className="mt-6 space-y-6 text-sm leading-6">
        <section>
          <h2 className="font-medium">{t("chatsTitle")}</h2>
          <p className="mt-1 text-muted-foreground">{t("chatsBody")}</p>
          <Link href="/projects" className="text-primary underline">
            {t("manageProjects")}
          </Link>
        </section>
        <section>
          <h2 className="font-medium">{t("contextTitle")}</h2>
          <p className="mt-1 text-muted-foreground">{t("contextBody")}</p>
          <Link href="/knowledge-base" className="text-primary underline">
            {t("openKnowledge")}
          </Link>
        </section>
        <section>
          <h2 className="font-medium">{t("restoreTitle")}</h2>
          <p className="mt-1 text-muted-foreground">{t("restoreBody")}</p>
          <Link href="/archived" className="text-primary underline">
            {t("viewArchived")}
          </Link>
        </section>
        <section>
          <h2 className="font-medium">{t("simulatedTitle")}</h2>
          <p className="mt-1 text-muted-foreground">{t("simulatedBody")}</p>
        </section>
        <section>
          <h2 className="font-medium">{t("privacyTitle")}</h2>
          <p className="mt-1 text-muted-foreground">{t("privacyBody")}</p>
        </section>
      </div>
    </div>
  );
}
