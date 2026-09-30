import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../auth.config";

export default function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies?.accessToken;

  if (typeof token !== "string") {
    return res.status(401).json({
      message: "unauthorized",
    });
  }

  let decoded: string | jwt.JwtPayload;
  try {
    decoded = jwt.verify(token, jwtSecret, { algorithms: ["HS256"] });
  } catch {
    return res.status(401).json({ message: "unauthorized" });
  }

  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string" ||
    decoded.purpose !== undefined ||
    decoded.aud !== undefined
  ) {
    return res.status(401).json({ message: "unauthorized" });
  }

  res.locals.userId = decoded.sub;
  res.locals.sessionExpiresAt = decoded.exp;
  next();
}
