import type { TeammateAvatarVariant } from "./teammate-avatar";

export type AiHeroTeammate = {
  id: string;
  name: string;
  role: string;
  avatar: TeammateAvatarVariant;
  detail: string;
  greeting: string;
  request: string;
  acknowledgement?: string;
  sources?: readonly string[];
  steps: readonly [string, string, string];
  result: string;
  document: {
    name: string;
    summary: string;
    sections: readonly { title: string; body: string }[];
  };
};

export const DEMO_TEAM: readonly [AiHeroTeammate, ...AiHeroTeammate[]] = [
  {
    id: "launch",
    name: "Milo",
    role: "Launch planner",
    avatar: "mint",
    detail: "Keeping the launch moving",
    greeting:
      "I’m here to keep the moving pieces together. What would you like me to take off your plate?",
    request:
      "Turn these launch notes into a short brief. Pull out the decisions, open questions, and next steps.",
    acknowledgement:
      "On it. I’ll bring the decisions and loose ends together so the team can move forward.",
    sources: ["Project notes", "Team decisions", "Launch checklist"],
    steps: [
      "Reading 6 project notes",
      "Connecting decisions and open questions",
      "Putting the launch brief together",
    ],
    result:
      "The brief is ready. I separated what’s decided from what still needs a conversation.",
    document: {
      name: "A clearer path to launch",
      summary:
        "A working brief for the team, with the useful parts of six conversations in one place.",
      sections: [
        {
          title: "Decided",
          body: "Start with a small early-access group. Give each AI teammate one clear responsibility and leave reporting for the next iteration.",
        },
        {
          title: "Still open",
          body: "Choose who owns onboarding and confirm the support rotation before inviting the first group.",
        },
        {
          title: "Next steps",
          body: "Maya will share the onboarding draft on Tuesday. Theo will run the final walkthrough. Bring both updates to Friday’s launch review.",
        },
      ],
    },
  },
  {
    id: "research",
    name: "Scout",
    role: "Research teammate",
    avatar: "amber",
    detail: "Finding the useful details",
    greeting:
      "Send me the questions you’re trying to answer. I’ll go through the notes and bring back the useful bits.",
    request:
      "Read the interview notes and give me the three things we should pay attention to next.",
    acknowledgement:
      "I’ll compare the interviews and look for the themes that come up more than once.",
    sources: ["Interview notes", "Research questions", "Customer feedback"],
    steps: [
      "Reading 8 interview notes",
      "Grouping the recurring themes",
      "Writing the research roundup",
    ],
    result:
      "Three themes kept coming up. I added a concrete next step for each one.",
    document: {
      name: "What we heard this week",
      summary:
        "The recurring themes from eight interviews, with a small next step for each.",
      sections: [
        {
          title: "Finding the latest version",
          body: "People lose time checking which document is current. Try one shared home for project decisions before adding more notifications.",
        },
        {
          title: "Handing work over",
          body: "Handoffs often miss the reason behind a decision. Add a short context field to the next handoff pilot.",
        },
        {
          title: "Seeing what changed",
          body: "Teams want a quick account of what moved since yesterday. Test a daily roundup with the smallest useful set of changes.",
        },
      ],
    },
  },
  {
    id: "handoff",
    name: "Pip",
    role: "Project coordinator",
    avatar: "sky",
    detail: "Keeping everyone in the loop",
    greeting:
      "I can help the team stay caught up. Give me the updates, and I’ll make sure the next steps are clear.",
    request:
      "Make a Friday handoff from this week’s updates. Show what shipped, what’s blocked, and who owns the next step.",
    acknowledgement:
      "I’ll check the updates for an owner, a blocker, and a clear next step.",
    sources: ["Weekly updates", "Project tracker", "Team check-ins"],
    steps: [
      "Reviewing this week’s updates",
      "Checking owners and dependencies",
      "Preparing the team handoff",
    ],
    result:
      "The handoff is ready. Every open item has an owner and a next step.",
    document: {
      name: "Friday, all caught up",
      summary:
        "A short handoff so Monday can start with the work instead of another status meeting.",
      sections: [
        {
          title: "Shipped",
          body: "The first AI teammates are available to the pilot group. The revised invite flow and keyboard navigation are included.",
        },
        {
          title: "Blocked",
          body: "The import flow is waiting on a sample export. Alex will follow up with the pilot team on Monday morning.",
        },
        {
          title: "Up next",
          body: "Nina owns the onboarding notes. Sam will collect pilot feedback. Review the first week together on Thursday.",
        },
      ],
    },
  },
];
