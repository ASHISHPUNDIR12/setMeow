import { Router } from "express";
import { BoardSchema } from "../zod";
import { prisma } from "db/client";
import requireAuth from "../middlewares/auth.middleware";
import { boardAccess, uuidParam } from "../access";
import { publishRealtimeEvent } from "db/realtime";

const router = Router();

router.post("/organization/:id/board", requireAuth, async (req, res) => {
  const result = BoardSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "invalid input",
    });
  }
  const organizationId = req.params.id;
  if (typeof organizationId !== "string") {
    return res.status(400).json({ message: "invalid organization id " });
  }
  const userId = res.locals.userId;

  const { title } = result.data;

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: { userId, organizationId },
    },
  });
  if (!membership) {
    return res.status(403).json({
      message: "You are not part of this organization",
    });
  }

  const board = await prisma.board.create({
    data: {
      title,
      organizationId,
    },
  });

  return res.status(201).json({
    message: "board created successfully",
    board: board,
  });
});

router.get("/organization/:id/boards", requireAuth, async (req, res) => {
  const userId = res.locals.userId;
  const organizationId = req.params.id;
  if (typeof organizationId !== "string") {
    return res.status(400).json({ message: "invalid organization id " });
  }
  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: { userId, organizationId },
    },
  });

  if (!membership) {
    return res
      .status(403)
      .json({ message: "you are not part of this organization" });
  }

  const allBoards = await prisma.board.findMany({
    where: {
      organizationId,
    },
  });
  return res.status(200).json({
    message: "All boards",
    allBoards,
  });
});

router.get(
  "/organization/:id/board/:boardId",
  requireAuth,
  async (req, res) => {
    const organizationId = uuidParam(req.params.id);
    const boardId = uuidParam(req.params.boardId);
    if (!organizationId || !boardId)
      return res.status(400).json({ message: "invalid id" });
    const access = await boardAccess(res.locals.userId, boardId);
    if (!access || access.board.organizationId !== organizationId) {
      return res.status(404).json({ message: "board not found" });
    }
    return res.json({ board: access.board });
  },
);

router.put(
  "/organization/:id/board/:boardId",
  requireAuth,
  async (req, res) => {
    const result = BoardSchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ message: "Invalid inputs" });
    }
    const { title } = result.data;
    const organizationId = req.params.id;
    if (typeof organizationId !== "string") {
      return res.status(400).json({ message: "invalid organization id " });
    }
    const boardId = req.params.boardId;
    if (typeof boardId !== "string") {
      return res.status(400).json({ message: "invalid board id" });
    }
    const userId = res.locals.userId;

    const membership = await prisma.membership.findUnique({
      where: {
        userId_organizationId: { userId, organizationId },
      },
    });

    if (!membership) {
      return res
        .status(403)
        .json({ message: "you are not part of this organization" });
    }
    const updatedBoards = await prisma.board.updateManyAndReturn({
      where: {
        id: boardId,
        organizationId,
      },
      data: { title },
    });

    const updatedBoard = updatedBoards[0];
    if (!updatedBoard) {
      return res.status(404).json({ message: "board not found" });
    }
    await publishRealtimeEvent({
      type: "board_updated",
      boardId: updatedBoard.id,
      board: updatedBoard,
    });

    return res.status(200).json({
      message: "board title updated",
      updatedBoard,
    });
  },
);

router.delete(
  "/organization/:id/board/:boardId",
  requireAuth,
  async (req, res) => {
    const organizationId = uuidParam(req.params.id);
    const boardId = uuidParam(req.params.boardId);
    if (!organizationId || !boardId)
      return res.status(400).json({ message: "invalid id" });
    const access = await boardAccess(res.locals.userId, boardId);
    if (!access || access.board.organizationId !== organizationId) {
      return res.status(404).json({ message: "board not found" });
    }
    if (access.membership.role !== "admin")
      return res.status(403).json({ message: "admin access required" });
    const [sections, issues] = await Promise.all([
      prisma.section.count({ where: { boardId } }),
      prisma.issue.count({ where: { boardId } }),
    ]);
    if (sections || issues)
      return res
        .status(409)
        .json({ message: "delete the board's issues and sections first" });
    await prisma.board.delete({ where: { id: boardId } });
    return res.status(204).send();
  },
);
export default router;
