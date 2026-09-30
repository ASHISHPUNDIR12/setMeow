import { Router } from "express";
import { prisma } from "db/client";
import z from "zod";
import requireAuth from "../middlewares/auth.middleware";
import { commentAccess, issueAccess, uuidParam } from "../access";
import { CommentSchema } from "../zod";
import { publishRealtimeEvent } from "db/realtime";

const router = Router();
const CreateCommentSchema = CommentSchema.extend({ issueId: z.uuid() });

router.post("/comment", requireAuth, async (req, res) => {
  const result = CreateCommentSchema.safeParse(req.body);
  if (!result.success)
    return res
      .status(400)
      .json({ message: "invalid input", error: result.error.flatten() });
  const access = await issueAccess(res.locals.userId, result.data.issueId);
  if (!access) {
    return res.status(404).json({ message: "issue not found" });
  }
  const comment = await prisma.comment.create({
    data: {
      content: result.data.content,
      issueId: result.data.issueId,
      userId: res.locals.userId,
    },
    include: { user: { select: { id: true, username: true } } },
  });
  await publishRealtimeEvent({
    type: "comment_created",
    boardId: access.issue.boardId,
    issueId: access.issue.id,
    comment,
  });
  return res.status(201).json({ comment });
});

router.get("/issue/:issueId/comments", requireAuth, async (req, res) => {
  const issueId = uuidParam(req.params.issueId);
  if (!issueId) return res.status(400).json({ message: "invalid issue id" });
  if (!(await issueAccess(res.locals.userId, issueId)))
    return res.status(404).json({ message: "issue not found" });
  const comments = await prisma.comment.findMany({
    where: { issueId },
    include: { user: { select: { id: true, username: true } } },
  });
  return res.json({ comments });
});

router.get("/comment/:commentId", requireAuth, async (req, res) => {
  const commentId = uuidParam(req.params.commentId);
  if (!commentId)
    return res.status(400).json({ message: "invalid comment id" });
  const access = await commentAccess(res.locals.userId, commentId);
  if (!access) return res.status(404).json({ message: "comment not found" });
  const { issue: _issue, ...comment } = access.comment;
  return res.json({ comment });
});

router.put("/comment/:commentId", requireAuth, async (req, res) => {
  const commentId = uuidParam(req.params.commentId);
  if (!commentId)
    return res.status(400).json({ message: "invalid comment id" });
  const result = CommentSchema.safeParse(req.body);
  if (!result.success)
    return res
      .status(400)
      .json({ message: "invalid input", error: result.error.flatten() });
  const access = await commentAccess(res.locals.userId, commentId);
  if (!access) return res.status(404).json({ message: "comment not found" });
  if (
    access.comment.userId !== res.locals.userId &&
    access.membership.role !== "admin"
  ) {
    return res
      .status(403)
      .json({ message: "only the author or an admin can edit this comment" });
  }
  const comment = await prisma.comment.update({
    where: { id: commentId },
    data: result.data,
  });
  await publishRealtimeEvent({
    type: "comment_updated",
    boardId: access.comment.issue.boardId,
    issueId: access.comment.issueId,
    comment,
  });
  return res.json({ comment });
});

router.delete("/comment/:commentId", requireAuth, async (req, res) => {
  const commentId = uuidParam(req.params.commentId);
  if (!commentId)
    return res.status(400).json({ message: "invalid comment id" });
  const access = await commentAccess(res.locals.userId, commentId);
  if (!access) return res.status(404).json({ message: "comment not found" });
  if (
    access.comment.userId !== res.locals.userId &&
    access.membership.role !== "admin"
  ) {
    return res
      .status(403)
      .json({ message: "only the author or an admin can delete this comment" });
  }
  await prisma.comment.delete({ where: { id: commentId } });
  await publishRealtimeEvent({
    type: "comment_deleted",
    boardId: access.comment.issue.boardId,
    issueId: access.comment.issueId,
    commentId,
  });
  return res.status(204).send();
});

export default router;
