import { Router } from "express";
import { LoginSchema, SignUpSchema } from "../zod";
import { prisma } from "db/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import type { Response } from "express";
import { jwtSecret } from "../auth.config";
import requireAuth from "../middlewares/auth.middleware";
const router = Router();
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
const oauthStateCookieOptions = {
  httpOnly: true,
  sameSite:
    process.env.NODE_ENV === "production"
      ? ("none" as const)
      : ("lax" as const),
  secure: process.env.NODE_ENV === "production",
  maxAge: 10 * 60 * 1000,
  path: "/api/auth/oauth",
};

type OAuthProvider = "google" | "github";

function safeReturnTo(value: unknown): string {
  if (typeof value !== "string") return "/dashboard";
  return /^\/(dashboard|invitations|workspaces)(\/|$|\?)/.test(value) &&
    !/[\\\r\n]/.test(value)
    ? value
    : "/dashboard";
}

function oauthConfig(provider: OAuthProvider) {
  const prefix = provider === "google" ? "GOOGLE" : "GITHUB";
  const clientId = process.env[`${prefix}_CLIENT_ID`];
  const clientSecret = process.env[`${prefix}_CLIENT_SECRET`];
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

function failOAuth(res: Response, returnTo: string, code: string) {
  const url = new URL("/signin", frontendOrigin);
  url.searchParams.set("next", returnTo);
  url.searchParams.set("oauthError", code);
  return res.redirect(url.toString());
}

function clearOAuthStateCookie(res: Response) {
  res.clearCookie("oauthState", {
    httpOnly: true,
    sameSite:
      process.env.NODE_ENV === "production"
        ? ("none" as const)
        : ("lax" as const),
    secure: process.env.NODE_ENV === "production",
    path: oauthStateCookieOptions.path,
  });
}

router.get("/oauth/:provider", (req, res) => {
  const provider = req.params.provider as OAuthProvider;
  if (provider !== "google" && provider !== "github") {
    return res.status(404).json({ message: "unsupported OAuth provider" });
  }
  const config = oauthConfig(provider);
  if (!config)
    return res
      .status(503)
      .json({ message: `${provider} sign-in is not configured` });

  const state = randomBytes(32).toString("base64url");
  const returnTo = safeReturnTo(req.query.next);
  const stateToken = jwt.sign({ state, returnTo, provider }, jwtSecret, {
    expiresIn: "10m",
  });
  res.cookie("oauthState", stateToken, oauthStateCookieOptions);

  const callback = `${frontendOrigin}/api/auth/oauth/${provider}/callback`;
  const url =
    provider === "google"
      ? new URL("https://accounts.google.com/o/oauth2/v2/auth")
      : new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", callback);
  url.searchParams.set("response_type", "code");
  url.searchParams.set(
    "scope",
    provider === "google" ? "openid email profile" : "read:user user:email",
  );
  url.searchParams.set("state", state);
  if (provider === "google") url.searchParams.set("prompt", "select_account");
  return res.redirect(url.toString());
});

router.get("/oauth/:provider/callback", async (req, res) => {
  const provider = req.params.provider as OAuthProvider;
  if (provider !== "google" && provider !== "github")
    return res.status(404).send("Unsupported provider");
  let returnTo = "/dashboard";
  try {
    const encodedState = req.cookies?.oauthState;
    if (typeof encodedState !== "string") throw new Error("invalid_state");
    const stateData = jwt.verify(encodedState, jwtSecret);
    if (
      typeof stateData === "string" ||
      stateData.provider !== provider ||
      stateData.state !== req.query.state
    ) {
      throw new Error("invalid_state");
    }
    returnTo = safeReturnTo(stateData.returnTo);
  } catch {
    clearOAuthStateCookie(res);
    return failOAuth(res, returnTo, "invalid_state");
  }
  clearOAuthStateCookie(res);
  if (
    typeof req.query.error === "string" ||
    typeof req.query.code !== "string"
  ) {
    return failOAuth(res, returnTo, "cancelled");
  }
  const config = oauthConfig(provider);
  if (!config) return failOAuth(res, returnTo, "not_configured");

  try {
    const callback = `${frontendOrigin}/api/auth/oauth/${provider}/callback`;
    const tokenUrl =
      provider === "google"
        ? "https://oauth2.googleapis.com/token"
        : "https://github.com/login/oauth/access_token";
    const tokenResponse = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code: req.query.code,
        redirect_uri: callback,
        grant_type: "authorization_code",
      }),
    });
    const tokenData = (await tokenResponse.json()) as {
      access_token?: string;
      error?: string;
    };
    if (!tokenResponse.ok || !tokenData.access_token)
      throw new Error("token_exchange_failed");

    let providerId: string;
    let email: string;
    let username: string;
    if (provider === "google") {
      const profileResponse = await fetch(
        "https://openidconnect.googleapis.com/v1/userinfo",
        {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        },
      );
      const profile = (await profileResponse.json()) as {
        sub?: string;
        email?: string;
        email_verified?: boolean;
        name?: string;
      };
      if (
        !profileResponse.ok ||
        !profile.sub ||
        !profile.email ||
        !profile.email_verified
      )
        throw new Error("unverified_email");
      providerId = profile.sub;
      email = profile.email.toLowerCase();
      username = profile.name?.trim() || email.split("@")[0] || "Setmeow user";
    } else {
      const [profileResponse, emailsResponse] = await Promise.all([
        fetch("https://api.github.com/user", {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }),
        fetch("https://api.github.com/user/emails", {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
          },
        }),
      ]);
      const profile = (await profileResponse.json()) as {
        id?: number;
        name?: string;
        login?: string;
      };
      const emails = (await emailsResponse.json()) as Array<{
        email: string;
        primary: boolean;
        verified: boolean;
      }>;
      const primaryEmail = emails.find((item) => item.primary && item.verified);
      if (
        !profileResponse.ok ||
        !emailsResponse.ok ||
        !profile.id ||
        !primaryEmail
      )
        throw new Error("verified_email_required");
      providerId = String(profile.id);
      email = primaryEmail.email.toLowerCase();
      username =
        profile.name?.trim() ||
        profile.login ||
        email.split("@")[0] ||
        "Setmeow user";
    }

    const linkedAccount = await prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: { provider, providerAccountId: providerId },
      },
      include: { user: true },
    });
    let user = linkedAccount?.user ?? null;
    if (!user) {
      user = await prisma.user.findUnique({ where: { email } });
      if (!user)
        user = await prisma.user.create({
          data: { email, username: username.slice(0, 80) || "Setmeow user" },
        });
      await prisma.oAuthAccount.create({
        data: { provider, providerAccountId: providerId, userId: user.id },
      });
    }
    const accessToken = jwt.sign({ sub: user.id }, jwtSecret, {
      expiresIn: "120m",
    });
    res.cookie("accessToken", accessToken, accessTokenCookieOptions);
    return res.redirect(new URL(returnTo, frontendOrigin).toString());
  } catch (error) {
    console.error(`${provider} OAuth sign-in failed`, error);
    return failOAuth(res, returnTo, "oauth_failed");
  }
});

const accessTokenCookieOptions = {
  httpOnly: true,
  sameSite:
    process.env.NODE_ENV === "production"
      ? ("none" as const)
      : ("lax" as const),
  secure: process.env.NODE_ENV === "production",
  maxAge: 120 * 60 * 1000,
  path: "/",
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
  const isVerified = user.passwordHash
    ? await bcrypt.compare(password, user.passwordHash)
    : false;
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

router.get("/me", requireAuth, async (_req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: res.locals.userId },
    select: { id: true, email: true, username: true },
  });
  if (!user) return res.status(401).json({ message: "unauthorized" });
  return res.json({ user });
});

router.post("/signout", (_req, res) => {
  res.clearCookie("accessToken", {
    httpOnly: true,
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res.status(204).send();
});

export default router;
