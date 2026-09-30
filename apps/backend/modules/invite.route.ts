import { Router } from "express";
import { prisma } from "db/client";
import requireAuth from "../middlewares/auth.middleware";
import { membershipFor, uuidParam } from "../access";
import { InviteSchema } from "../zod";
import { publishRealtimeEvent } from "db/realtime";

const router = Router();

router.post("/invite", requireAuth, async (req, res) => {
  const result = InviteSchema.safeParse(req.body);
  if (!result.success) {
    return res
      .status(400)
      .json({ message: "invalid input", error: result.error.flatten() });
  }

  const { email, orgId: organizationId } = result.data;
  const senderId = res.locals.userId as string;
  const senderMembership = await membershipFor(senderId, organizationId);
  if (senderMembership?.role !== "admin") {
    return res.status(403).json({ message: "admin access required" });
  }

  const recipient = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true },
  });
  if (!recipient) {
    return res
      .status(404)
      .json({ message: "user not found; they must sign up first" });
  }
  if (await membershipFor(recipient.id, organizationId)) {
    return res.status(409).json({ message: "user is already a member" });
  }

  const existing = await prisma.invitation.findUnique({
    where: {
      organizationId_invitedUserId: {
        organizationId,
        invitedUserId: recipient.id,
      },
    },
  });
  if (existing?.status === "pending") {
    return res.status(409).json({ message: "invitation already pending" });
  }

  const invitation = await prisma.invitation.upsert({
    where: {
      organizationId_invitedUserId: {
        organizationId,
        invitedUserId: recipient.id,
      },
    },
    update: {
      status: "pending",
      invitedById: senderId,
      createdAt: new Date(),
      respondedAt: null,
    },
    create: {
      organizationId,
      invitedUserId: recipient.id,
      invitedById: senderId,
    },
    select: {
      id: true,
      organizationId: true,
      invitedUserId: true,
      status: true,
      createdAt: true,
    },
  });
  await publishRealtimeEvent({ type: "invitation_changed", userId: recipient.id });
  return res.status(201).json({ invitation });
});

router.get("/invites", requireAuth, async (_req, res) => {
  const invitations = await prisma.invitation.findMany({
    where: { invitedUserId: res.locals.userId, status: "pending" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      createdAt: true,
      organization: { select: { id: true, name: true } },
      invitedBy: { select: { id: true, username: true } },
    },
  });
  return res.json({ invitations });
});

router.post("/invite/:inviteId/accept", requireAuth, async (req, res) => {
  const inviteId = uuidParam(req.params.inviteId);
  if (!inviteId)
    return res.status(400).json({ message: "invalid invitation id" });
  const userId = res.locals.userId as string;
  const invitation = await prisma.invitation.findUnique({
    where: { id: inviteId },
  });
  if (!invitation || invitation.invitedUserId !== userId) {
    return res.status(404).json({ message: "invitation not found" });
  }
  if (invitation.status !== "pending") {
    return res.status(409).json({ message: "invitation already answered" });
  }

  const membership = await prisma.$transaction(async (tx) => {
    const changed = await tx.invitation.updateMany({
      where: { id: inviteId, invitedUserId: userId, status: "pending" },
      data: { status: "accepted", respondedAt: new Date() },
    });
    if (!changed.count) return null;
    return tx.membership.upsert({
      where: {
        userId_organizationId: {
          userId,
          organizationId: invitation.organizationId,
        },
      },
      update: {},
      create: {
        userId,
        organizationId: invitation.organizationId,
        role: "member",
      },
    });
  });
  if (!membership)
    return res.status(409).json({ message: "invitation already answered" });
  await publishRealtimeEvent({ type: "invitation_changed", userId });
  return res.json({ membership });
});

router.post("/invite/:inviteId/decline", requireAuth, async (req, res) => {
  const inviteId = uuidParam(req.params.inviteId);
  if (!inviteId)
    return res.status(400).json({ message: "invalid invitation id" });
  const changed = await prisma.invitation.updateMany({
    where: {
      id: inviteId,
      invitedUserId: res.locals.userId,
      status: "pending",
    },
    data: { status: "declined", respondedAt: new Date() },
  });
  if (!changed.count)
    return res.status(404).json({ message: "pending invitation not found" });
  await publishRealtimeEvent({ type: "invitation_changed", userId: res.locals.userId });
  return res.status(204).send();
});

export default router;
