import { Router } from "express";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { jwtSecret } from "../auth.config";
import requireAuth from "../middlewares/auth.middleware";

const router = Router();
const requestSchema = z.object({ path: z.string() }).strict();

router.post("/socket-ticket", requireAuth, (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const origin = req.headers.origin;
  const allowedOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
  if (origin && origin !== allowedOrigin)
    return res.status(403).json({ message: "forbidden origin" });

  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: "invalid socket path" });
  const path = parsed.data.path;
  const boardId = /^\/boards\/([^/]+)$/.exec(path)?.[1];
  if (path !== "/users/me" && !z.uuid().safeParse(boardId).success)
    return res.status(400).json({ message: "invalid socket path" });

  const sessionExpiresAt: unknown = res.locals.sessionExpiresAt;
  const now = Math.floor(Date.now() / 1000);
  if (
    !z.uuid().safeParse(res.locals.userId).success ||
    typeof sessionExpiresAt !== "number" ||
    sessionExpiresAt <= now
  )
    return res.status(401).json({ message: "unauthorized" });

  const ticket = jwt.sign(
    { purpose: "socket_ticket", path, sessionExpiresAt },
    jwtSecret,
    {
      algorithm: "HS256",
      subject: res.locals.userId,
      audience: "setmeow-websocket",
      expiresIn: Math.min(60, sessionExpiresAt - now),
    },
  );
  return res.json({ ticket });
});

export default router;
