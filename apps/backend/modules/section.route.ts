import { Router } from "express";
import { prisma } from "db/client";
import z from "zod";
import requireAuth from "../middlewares/auth.middleware";
import { boardAccess, sectionAccess, uuidParam } from "../access";
import { SectionSchema } from "../zod";
import { publishRealtimeEvent } from "db/realtime";

const router = Router();
const CreateSectionSchema = SectionSchema.extend({ boardId: z.uuid() });

router.post("/section", requireAuth, async (req, res) => {
  const result = CreateSectionSchema.safeParse(req.body);
  if (!result.success)
    return res
      .status(400)
      .json({ message: "invalid input", error: result.error.flatten() });
  const access = await boardAccess(res.locals.userId, result.data.boardId);
  if (!access) return res.status(404).json({ message: "board not found" });
  const section = await prisma.section.create({ data: result.data });
  await publishRealtimeEvent({ type: "section_created", boardId: section.boardId, section });
  return res.status(201).json({ section });
});

router.get("/sections", requireAuth, async (req, res) => {
  const boardId = uuidParam(req.query.boardId);
  if (!boardId)
    return res
      .status(400)
      .json({ message: "valid boardId query parameter required" });
  const access = await boardAccess(res.locals.userId, boardId);
  if (!access) return res.status(404).json({ message: "board not found" });
  const sections = await prisma.section.findMany({ where: { boardId } });
  return res.json({ sections });
});

router.get("/section/:sectionId", requireAuth, async (req, res) => {
  const sectionId = uuidParam(req.params.sectionId);
  if (!sectionId)
    return res.status(400).json({ message: "invalid section id" });
  const access = await sectionAccess(res.locals.userId, sectionId);
  if (!access) return res.status(404).json({ message: "section not found" });
  const { board: _board, ...section } = access.section;
  return res.json({ section });
});

router.put("/section/:sectionId", requireAuth, async (req, res) => {
  const sectionId = uuidParam(req.params.sectionId);
  if (!sectionId)
    return res.status(400).json({ message: "invalid section id" });
  const result = SectionSchema.safeParse(req.body);
  if (!result.success)
    return res
      .status(400)
      .json({ message: "invalid input", error: result.error.flatten() });
  const access = await sectionAccess(res.locals.userId, sectionId);
  if (!access)
    return res.status(404).json({ message: "section not found" });
  const section = await prisma.section.update({
    where: { id: sectionId },
    data: result.data,
  });
  await publishRealtimeEvent({ type: "section_updated", boardId: section.boardId, section });
  return res.json({ section });
});

router.delete("/section/:sectionId", requireAuth, async (req, res) => {
  const sectionId = uuidParam(req.params.sectionId);
  if (!sectionId)
    return res.status(400).json({ message: "invalid section id" });
  const access = await sectionAccess(res.locals.userId, sectionId);
  if (!access)
    return res.status(404).json({ message: "section not found" });
  if (await prisma.issue.count({ where: { sectionId } })) {
    return res
      .status(409)
      .json({ message: "move or delete the section's issues first" });
  }
  await prisma.section.delete({ where: { id: sectionId } });
  await publishRealtimeEvent({ type: "section_deleted", boardId: access.section.boardId, sectionId });
  return res.status(204).send();
});

export default router;
