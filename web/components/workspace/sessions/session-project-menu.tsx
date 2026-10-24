import { Folder } from "@/components/icons";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  AnimatedDropdownItemIcon,
  AnimatedDropdownItem,
  AnimatedDropdownItemText,
  AnimatedDropdownRadioGroup,
  AnimatedDropdownRadioItem,
  AnimatedDropdownSub,
  AnimatedDropdownSubContent,
  AnimatedDropdownSubTrigger,
} from "@/components/premium/animated-dropdown";
import { useSessions } from "../session-provider";

export function SessionProjectMenu({
  projectId,
  onMove,
}: {
  projectId?: string;
  onMove: (projectId: string | undefined) => void;
}) {
  const { projects } = useSessions();
  const router = useRouter();
  const t = useTranslations("Projects");
  return (
    <AnimatedDropdownSub>
      <AnimatedDropdownSubTrigger>
        <AnimatedDropdownItemIcon>
          <Folder />
        </AnimatedDropdownItemIcon>
        <AnimatedDropdownItemText>
          {projectId ? t("moveTo") : t("addTo")}
        </AnimatedDropdownItemText>
      </AnimatedDropdownSubTrigger>
      <AnimatedDropdownSubContent className="w-52 min-w-0">
        {!projects.length && (
          <AnimatedDropdownItem onSelect={() => router.push("/projects")}>
            {t("createFirst")}
          </AnimatedDropdownItem>
        )}
        <AnimatedDropdownRadioGroup
          value={projectId ?? ""}
          onValueChange={(value) => onMove(value || undefined)}
        >
          {projects.map((project) => (
            <AnimatedDropdownRadioItem key={project.id} value={project.id}>
              {project.title}
            </AnimatedDropdownRadioItem>
          ))}
          {projectId && (
            <AnimatedDropdownRadioItem value="">
              {t("removeFrom")}
            </AnimatedDropdownRadioItem>
          )}
        </AnimatedDropdownRadioGroup>
      </AnimatedDropdownSubContent>
    </AnimatedDropdownSub>
  );
}
