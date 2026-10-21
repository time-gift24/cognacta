import { reportChange } from "./format";
import {
  type ComparisonRange,
  comparisonDays,
  shiftComparisonDate,
} from "./period-comparison-model";

export type PerformanceMember = {
  id: string;
  name: string;
  role: string;
  team: string;
};
/** One complete observation per teammate per UTC day, including zero-activity days. */
export type TeamPerformanceRecord = {
  date: string;
  memberId: string;
  delivered: number;
  firstReplies: number;
  /** Sum of minutes to first reply, not an already averaged value. */
  replyMinutes: number;
  onTimeReplies: number;
  reviewed: number;
  passedReviews: number;
};
export function totalTeamPerformance(
  records: readonly TeamPerformanceRecord[],
) {
  const counts = records.reduce(
    (sum, record) => ({
      delivered: sum.delivered + record.delivered,
      firstReplies: sum.firstReplies + record.firstReplies,
      replyMinutes: sum.replyMinutes + record.replyMinutes,
      onTimeReplies: sum.onTimeReplies + record.onTimeReplies,
      reviewed: sum.reviewed + record.reviewed,
      passedReviews: sum.passedReviews + record.passedReviews,
    }),
    {
      delivered: 0,
      firstReplies: 0,
      replyMinutes: 0,
      onTimeReplies: 0,
      reviewed: 0,
      passedReviews: 0,
    },
  );
  return {
    ...counts,
    replyTime: counts.firstReplies
      ? counts.replyMinutes / counts.firstReplies
      : null,
    onTime: counts.firstReplies
      ? (counts.onTimeReplies / counts.firstReplies) * 100
      : null,
    quality: counts.reviewed
      ? (counts.passedReviews / counts.reviewed) * 100
      : null,
  };
}
export function buildTeamPerformance(
  members: readonly PerformanceMember[],
  records: readonly TeamPerformanceRecord[],
  range: ComparisonRange,
) {
  const days = comparisonDays(range);
  const prior = {
    from: shiftComparisonDate(range.from, -days),
    to: shiftComparisonDate(range.from, -1),
  };
  // Stable per-day records also avoid double-counting accidental duplicate observations.
  const unique = Array.from(
    new Map(
      records.map((record) => [`${record.memberId}:${record.date}`, record]),
    ).values(),
  );
  const rows = members
    .map((member) => {
      const currentRecords = unique.filter(
        (record) =>
          record.memberId === member.id &&
          record.date >= range.from &&
          record.date <= range.to,
      );
      const previousRecords = unique.filter(
        (record) =>
          record.memberId === member.id &&
          record.date >= prior.from &&
          record.date <= prior.to,
      );
      const current = totalTeamPerformance(currentRecords);
      const previous = totalTeamPerformance(previousRecords);
      const complete =
        currentRecords.length === days && previousRecords.length === days;
      return {
        ...member,
        ...current,
        currentRecords,
        previousRecords,
        change: complete
          ? reportChange(current.delivered, previous.delivered)
          : null,
        rank: 0,
      };
    })
    .sort((a, b) => b.delivered - a.delivered || a.name.localeCompare(b.name));
  rows.forEach((row, index) => {
    row.rank =
      index > 0 && row.delivered === rows[index - 1].delivered
        ? rows[index - 1].rank
        : index + 1;
  });
  const currentRecords = rows.flatMap((row) => row.currentRecords);
  const previousRecords = rows.flatMap((row) => row.previousRecords);
  const current = totalTeamPerformance(currentRecords);
  const previous = totalTeamPerformance(previousRecords);
  const complete =
    rows.length > 0 &&
    rows.every(
      (row) =>
        row.currentRecords.length === days &&
        row.previousRecords.length === days,
    );
  return {
    rows,
    current,
    previous,
    prior,
    days,
    change: complete
      ? reportChange(current.delivered, previous.delivered)
      : null,
  };
}
export type TeamPerformanceRow = ReturnType<
  typeof buildTeamPerformance
>["rows"][number];
