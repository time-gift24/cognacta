/** Unsplash portrait for a photo id, cropped to the requested box. */
export const teamPortrait = (id: string, width = 720, height = width) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&fm=webp&q=75&w=${width}&h=${height}`;

/**
 * Sample people shared by the team blocks, so a name keeps the same face in
 * every layout. Each photo was checked to show a single person.
 */
export const TEAM_PHOTOS = {
  maya: "1531123897727-8f129e1688ce",
  dev: "1500648767791-00dcc994a43e",
  lior: "1524504388940-b1c1722653e1",
  ana: "1494790108377-be9c29b29330",
  kenji: "1507003211169-0a1dd7228f2d",
  priya: "1544005313-94ddf0286df2",
  sam: "1527980965255-d3b416303d12",
  tariq: "1506794778202-cad84cf45f1d",
  noa: "1438761681033-6461ffad8d80",
  ravi: "1560250097-0b93528c311a",
} as const;
