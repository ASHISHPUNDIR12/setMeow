import { Router } from "express";
import { prisma } from "db/client";
import { moveIssue } from "db/move";
import { publishRealtimeEvent } from "db/realtime";
import z from "zod";
import requireAuth from "../middlewares/auth.middleware";
import { boardAccess, issueAccess, membershipFor, uuidParam } from "../access";
import {
  AssigneeSchema,
  IssueSchema,
  IssueUpdateSchema,
  MoveIssueSchema,
} from "../zod";

const router = Router();
const CreateIssueSchema = IssueSchema.extend({ boardId: z.uuid() });

router.post("/issue", requireAuth, async (req, res) => {
  const result = CreateIssueSchema.safeParse(req.body);
  if (!result.success)
    return res
      .status(400)
      .json({ message: "invalid input", error: result.error.flatten() });
  const { boardId, sectionId, title, description } = result.data;
  const access = await boardAccess(res.locals.userId, boardId);
  if (!access) return res.status(404).json({ message: "board not found" });
  const section = await prisma.section.findUnique({ where: { id: sectionId } });
  if (!section || section.boardId !== boardId) {
    return res
      .status(400)
      .json({ message: "section does not belong to this board" });
  }
  const issue = await prisma.issue.create({
    data: { title, description, boardId, sectionId },
  });
  await publishRealtimeEvent({ type: "issue_created", boardId, issue });
  return res.status(201).json({ issue });
});

router.get("/issues", requireAuth, async (req, res) => {
  const boardId = uuidParam(req.query.boardId);
  if (!boardId)
    return res
      .status(400)
      .json({ message: "valid boardId query parameter required" });
  if (!(await boardAccess(res.locals.userId, boardId)))
    return res.status(404).json({ message: "board not found" });
  const issues = await prisma.issue.findMany({ where: { boardId } });
  return res.json({ issues });
});

router.get("/issue/:issueId", requireAuth, async (req, res) => {
  const issueId = uuidParam(req.params.issueId);
  if (!issueId) return res.status(400).json({ message: "invalid issue id" });
  const access = await issueAccess(res.locals.userId, issueId);
  if (!access) return res.status(404).json({ message: "issue not found" });
  const { board: _board, ...issue } = access.issue;
  return res.json({ issue });
});

router.put("/issue/:issueId", requireAuth, async (req, res) => {
  const issueId = uuidParam(req.params.issueId);
  if (!issueId) return res.status(400).json({ message: "invalid issue id" });
  const result = IssueUpdateSchema.safeParse(req.body);
  if (!result.success)
    return res
      .status(400)
      .json({ message: "invalid input", error: result.error.flatten() });
  const access = await issueAccess(res.locals.userId, issueId);
  if (!access)
    return res.status(404).json({ message: "issue not found" });
  const issue = await prisma.issue.update({
    where: { id: issueId },
    data: result.data,
  });
  await publishRealtimeEvent({ type: "issue_updated", boardId: access.issue.boardId, issue });
  return res.json({ issue });
});

router.put("/issue/:issueId/move", requireAuth, async (req, res) => {
  const issueId = uuidParam(req.params.issueId);
  if (!issueId) return res.status(400).json({ message: "invalid issue id" });
  const result = MoveIssueSchema.safeParse(req.body);
  if (!result.success)
    return res
      .status(400)
      .json({ message: "invalid input", error: result.error.flatten() });
  const moved = await moveIssue({
    userId: res.locals.userId,
    issueId,
    sectionId: result.data.sectionId,
  });
  if (moved.status === "not_found" || moved.status === "forbidden")
    return res.status(404).json({ message: "issue not found" });
  if (moved.status === "invalid_section") {
    return res
      .status(400)
      .json({ message: "section does not belong to this board" });
  }
  return res.json({ issue: moved.issue });
});

router.delete("/issue/:issueId", requireAuth, async (req, res) => {
  const issueId = uuidParam(req.params.issueId);
  if (!issueId) return res.status(400).json({ message: "invalid issue id" });
  const access = await issueAccess(res.locals.userId, issueId);
  if (!access)
    return res.status(404).json({ message: "issue not found" });
  await prisma.$transaction([
    prisma.comment.deleteMany({ where: { issueId } }),
    prisma.issueMapping.deleteMany({ where: { issueId } }),
    prisma.issue.delete({ where: { id: issueId } }),
  ]);
  await publishRealtimeEvent({ type: "issue_deleted", boardId: access.issue.boardId, issueId });
  return res.status(204).send();
});

router.get("/issue/:issueId/assignees", requireAuth, async (req, res) => {
  const issueId = uuidParam(req.params.issueId);
  if (!issueId) return res.status(400).json({ message: "invalid issue id" });
  if (!(await issueAccess(res.locals.userId, issueId)))
    return res.status(404).json({ message: "issue not found" });
  const assignees = await prisma.issueMapping.findMany({
    where: { issueId },
    select: { userId: true, user: { select: { username: true, email: true } } },
  });
  return res.json({ assignees });
});

router.post("/issue/:issueId/assignees", requireAuth, async (req, res) => {
  const issueId = uuidParam(req.params.issueId);
  if (!issueId) return res.status(400).json({ message: "invalid issue id" });
  const result = AssigneeSchema.safeParse(req.body);
  if (!result.success)
    return res
      .status(400)
      .json({ message: "invalid input", error: result.error.flatten() });
  const access = await issueAccess(res.locals.userId, issueId);
  if (!access) return res.status(404).json({ message: "issue not found" });
  const userId = result.data.userId;
  if (!(await membershipFor(userId, access.issue.board.organizationId))) {
    return res
      .status(400)
      .json({ message: "assignee is not an organization member" });
  }
  const existing = await prisma.issueMapping.findUnique({
    where: { userId_issueId: { userId, issueId } },
  });
  if (existing)
    return res.status(409).json({ message: "user already assigned" });
  const assignment = await prisma.issueMapping.create({
    data: { userId, issueId },
  });
  await publishRealtimeEvent({ type: "assignee_added", boardId: access.issue.boardId, issueId, userId });
  return res.status(201).json({ assignment });
});

router.delete(
  "/issue/:issueId/assignees/:userId",
  requireAuth,
  async (req, res) => {
    const issueId = uuidParam(req.params.issueId);
    const userId = uuidParam(req.params.userId);
    if (!issueId || !userId)
      return res.status(400).json({ message: "invalid id" });
    const access = await issueAccess(res.locals.userId, issueId);
    if (!access)
      return res.status(404).json({ message: "issue not found" });
    const deleted = await prisma.issueMapping.deleteMany({
      where: { userId, issueId },
    });
    if (!deleted.count)
      return res.status(404).json({ message: "assignment not found" });
    await publishRealtimeEvent({ type: "assignee_removed", boardId: access.issue.boardId, issueId, userId });
    return res.status(204).send();
  },
);

export default router;
