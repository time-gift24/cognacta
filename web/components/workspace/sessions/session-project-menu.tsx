import { Folder } from "@/components/icons";
import { useRouter } from "next/navigation";
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
  return (
    <AnimatedDropdownSub>
      <AnimatedDropdownSubTrigger>
        <AnimatedDropdownItemIcon>
          <Folder />
        </AnimatedDropdownItemIcon>
        <AnimatedDropdownItemText>
          {projectId ? "Move to project" : "Add to project"}
        </AnimatedDropdownItemText>
      </AnimatedDropdownSubTrigger>
      <AnimatedDropdownSubContent className="w-52 min-w-0">
        {!projects.length && (
          <AnimatedDropdownItem onSelect={() => router.push("/projects")}>
            Create a project
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
              Remove from project
            </AnimatedDropdownRadioItem>
          )}
        </AnimatedDropdownRadioGroup>
      </AnimatedDropdownSubContent>
    </AnimatedDropdownSub>
  );
}
