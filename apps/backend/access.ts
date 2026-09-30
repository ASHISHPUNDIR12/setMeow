import { prisma } from "db/client";
import z from "zod";

export function uuidParam(value: unknown) {
  return typeof value === "string" && z.uuid().safeParse(value).success
    ? value
    : null;
}

export function membershipFor(userId: string, organizationId: string) {
  return prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
  });
}

export async function boardAccess(userId: string, boardId: string) {
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) return null;
  const membership = await membershipFor(userId, board.organizationId);
  return membership ? { board, membership } : null;
}

export async function sectionAccess(userId: string, sectionId: string) {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: { board: true },
  });
  if (!section) return null;
  const membership = await membershipFor(userId, section.board.organizationId);
  return membership ? { section, membership } : null;
}

export async function issueAccess(userId: string, issueId: string) {
  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { board: true },
  });
  if (!issue) return null;
  const membership = await membershipFor(userId, issue.board.organizationId);
  return membership ? { issue, membership } : null;
}

export async function commentAccess(userId: string, commentId: string) {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { issue: { include: { board: true } } },
  });
  if (!comment) return null;
  const membership = await membershipFor(
    userId,
    comment.issue.board.organizationId,
  );
  return membership ? { comment, membership } : null;
}
