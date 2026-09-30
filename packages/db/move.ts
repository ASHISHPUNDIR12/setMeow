import { randomUUID } from "node:crypto";
import { prisma } from "./index";

export const ISSUE_EVENTS_CHANNEL = "setmeow_issue_events";

export type IssueMovedEvent = {
  type: "issue_moved";
  eventId: string;
  boardId: string;
  issueId: string;
  sectionId: string;
  movedBy: { id: string; username: string };
  requestId?: string;
};

type MoveIssueInput = {
  userId: string;
  issueId: string;
  sectionId: string;
  expectedBoardId?: string;
  requestId?: string;
};

export async function moveIssue(input: MoveIssueInput) {
  return prisma.$transaction(async (tx) => {
    const issue = await tx.issue.findUnique({
      where: { id: input.issueId },
      include: { board: { select: { organizationId: true } } },
    });
    if (!issue || (input.expectedBoardId && issue.boardId !== input.expectedBoardId)) {
      return { status: "not_found" } as const;
    }

    const membership = await tx.membership.findUnique({
      where: {
        userId_organizationId: {
          userId: input.userId,
          organizationId: issue.board.organizationId,
        },
      },
      select: { user: { select: { id: true, username: true } } },
    });
    if (!membership) return { status: "forbidden" } as const;

    const section = await tx.section.findUnique({
      where: { id: input.sectionId },
      select: { boardId: true },
    });
    if (!section || section.boardId !== issue.boardId) {
      return { status: "invalid_section" } as const;
    }

    if (issue.sectionId === input.sectionId) {
      const { board: _board, ...unchangedIssue } = issue;
      return { status: "unchanged", issue: unchangedIssue } as const;
    }

    const updatedIssue = await tx.issue.update({
      where: { id: input.issueId, boardId: issue.boardId },
      data: { sectionId: input.sectionId },
    });
    const event: IssueMovedEvent = {
      type: "issue_moved",
      eventId: randomUUID(),
      boardId: issue.boardId,
      issueId: issue.id,
      sectionId: updatedIssue.sectionId,
      movedBy: membership.user,
      ...(input.requestId ? { requestId: input.requestId } : {}),
    };
    await tx.$executeRaw`SELECT pg_notify('setmeow_issue_events', ${JSON.stringify(event)})`;
    return { status: "moved", issue: updatedIssue, event } as const;
  });
}
