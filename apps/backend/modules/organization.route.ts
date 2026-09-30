import { Router } from "express";
import { OrganizationSchema } from "../zod";
import requireAuth from "../middlewares/auth.middleware";
import { prisma } from "db/client";
import { membershipFor, uuidParam } from "../access";

const router = Router();

router.post("/organization", requireAuth, async (req, res) => {
  const result = OrganizationSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "invalid inputs",
      error: result.error.flatten(),
    });
  }
  const userId = res.locals.userId;
  if (typeof userId !== "string") {
    return res.status(401).json({
      message: "unauthorized",
    });
  }
  const { name, description } = result.data;
  const organization = await prisma.organization.create({
    data: {
      name,
      description,
      memberships: {
        create: {
          userId: userId,
          role: "admin",
        },
      },
    },
  });

  return res.status(201).json({
    message: "organization created",
    organization,
  });
});

router.get(
  ["/organization", "/organizations"],
  requireAuth,
  async (req, res) => {
    const userId = res.locals.userId;
    const allOrganization = await prisma.membership.findMany({
      where: {
        userId: userId,
      },
      select: {
        role: true,
        organization: true,
      },
    });
    return res.json({
      message: "All orgs related to user",
      allOrganization,
    });
  },
);

router.get("/organization/:id", requireAuth, async (req, res) => {
  const organizationId = uuidParam(req.params.id);
  if (!organizationId)
    return res.status(400).json({ message: "invalid organization id" });
  const membership = await membershipFor(res.locals.userId, organizationId);
  if (!membership)
    return res.status(404).json({ message: "organization not found" });
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
  });
  return res.json({ organization, role: membership.role });
});

router.put("/organization/:id", requireAuth, async (req, res) => {
  const organizationId = uuidParam(req.params.id);
  if (!organizationId)
    return res.status(400).json({ message: "invalid organization id" });
  const result = OrganizationSchema.partial()
    .refine((value) => Object.keys(value).length > 0)
    .safeParse(req.body);
  if (!result.success)
    return res

      .status(400)
      .json({ message: "invalid input", error: result.error.flatten() });
  const membership = await membershipFor(res.locals.userId, organizationId);
  if (membership?.role !== "admin")
    return res.status(403).json({ message: "admin access required" });
  const organization = await prisma.organization.update({
    where: { id: organizationId },
    data: result.data,
  });
  return res.json({ organization });
});

router.get("/organization/:id/memberships", requireAuth, async (req, res) => {
  const organizationId = uuidParam(req.params.id);
  if (!organizationId)
    return res.status(400).json({ message: "invalid organization id" });
  if (!(await membershipFor(res.locals.userId, organizationId)))
    return res.status(403).json({ message: "not an organization member" });
  const memberships = await prisma.membership.findMany({
    where: { organizationId },
    select: {
      userId: true,
      role: true,
      user: { select: { username: true, email: true } },
    },
  });
  return res.json({ memberships });
});

router.delete(
  "/organization/:id/membership/:userId",
  requireAuth,
  async (req, res) => {
    const organizationId = uuidParam(req.params.id);
    const targetUserId = uuidParam(req.params.userId);
    if (!organizationId || !targetUserId)
      return res.status(400).json({ message: "invalid id" });
    const actor = await membershipFor(res.locals.userId, organizationId);
    if (!actor || (actor.role !== "admin" && actor.userId !== targetUserId)) {
      return res.status(403).json({ message: "forbidden" });
    }
    const target = await membershipFor(targetUserId, organizationId);
    if (!target)
      return res.status(404).json({ message: "membership not found" });
    if (target.role === "admin") {
      const admins = await prisma.membership.count({
        where: { organizationId, role: "admin" },
      });
      if (admins <= 1)
        return res
          .status(409)
          .json({ message: "cannot remove the last admin" });
    }
    await prisma.$transaction([
      prisma.issueMapping.deleteMany({
        where: {
          userId: targetUserId,
          issue: { board: { organizationId } },
        },
      }),
      prisma.membership.delete({
        where: {
          userId_organizationId: { userId: targetUserId, organizationId },
        },
      }),
    ]);
    return res.status(204).send();
  },
);

router.delete("/organization/:id", requireAuth, async (req, res) => {
  const organizationId = uuidParam(req.params.id);
  if (!organizationId)
    return res.status(400).json({ message: "invalid organization id" });
  const membership = await membershipFor(res.locals.userId, organizationId);
  if (membership?.role !== "admin")
    return res.status(403).json({ message: "admin access required" });
  if (await prisma.board.count({ where: { organizationId } })) {
    return res
      .status(409)
      .json({ message: "delete the organization's boards first" });
  }
  await prisma.$transaction([
    prisma.membership.deleteMany({ where: { organizationId } }),
    prisma.organization.delete({ where: { id: organizationId } }),
  ]);
  return res.status(204).send();
});
export default router;
