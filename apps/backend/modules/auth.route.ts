import { Router } from "express";
import { LoginSchema, SignUpSchema } from "../zod";
import { prisma } from "db/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../auth.config";
const router = Router();

const accessTokenCookieOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" as const : "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 120 * 60 * 1000,
};

router.post("/signup", async (req, res) => {
  const result = SignUpSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "invalid inputs",
      error: result.error.flatten(),
    });
  }
  const { username, email, password } = result.data;
  const user = await prisma.user.findFirst({
    where: {
      email: email,
    },
  });
  if (user) {
    return res.status(409).json({
      message: "user already exist please login",
    });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const newUser = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash: passwordHash,
    },
  });
  const accessToken = jwt.sign({ sub: newUser.id }, jwtSecret, {
    expiresIn: "120m",
  });

  res.cookie("accessToken", accessToken, accessTokenCookieOptions);

  return res.status(201).json({
    message: "sign up succesfully",
  });
});

router.post(["/login", "/signin"], async (req, res) => {
  const result = LoginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      message: "invalid input",
      error: result.error.flatten(),
    });
  }

  const { email, password } = result.data;
  const user = await prisma.user.findFirst({
    where: {
      email,
    },
  });
  if (!user) {
    return res.status(400).json({
      message: "User does not exist",
    });
  }
  const isVerified = await bcrypt.compare(password, user.passwordHash);
  if (!isVerified) {
    return res.status(401).json({
      message: "invalid credentials",
    });
  }

  const accessToken = jwt.sign({ sub: user.id }, jwtSecret, {
    expiresIn: "120m",
  });

  res.cookie("accessToken", accessToken, accessTokenCookieOptions);

  return res.status(200).json({
    message: "login successful",
    user: { id: user.id, email: user.email, username: user.username },
  });
});

router.post("/signout", (_req, res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return res.status(204).send();
});

export default router;
