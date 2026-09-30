import express from "express";
import type { NextFunction, Request, Response } from "express";
import authRouter from "./modules/auth.route";
import socketTicketRouter from "./modules/socket-ticket.route";
import organizationRouter from "./modules/organization.route";
import boardRouter from "./modules/board.route";
import sectionRouter from "./modules/section.route";
import issueRouter from "./modules/issue.route";
import commentRouter from "./modules/comment.route";
import inviteRouter from "./modules/invite.route";
import cookieParser from "cookie-parser";

const app = express();
app.use(express.json());
app.use(cookieParser());
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:3000";
app.use((req, res, next) => {
  if (req.headers.origin !== frontendOrigin) return next();
  res.setHeader("Access-Control-Allow-Origin", frontendOrigin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS",
  );
  res.setHeader("Vary", "Origin");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
const PORT = Number(process.env.PORT ?? 3001);
app.use("/auth", authRouter);
app.use("/auth", socketTicketRouter);
app.use("/v1", organizationRouter);
app.use("/v1", boardRouter);
app.use("/v1", sectionRouter);
app.use("/v1", issueRouter);
app.use("/v1", commentRouter);
app.use("/v1", inviteRouter);
app.get("/health", (req, res) => {
  return res.status(200).json({
    message: "all ok",
  });
});

app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? error.code
      : undefined;
  if (code === "P2002" || code === "P2003") {
    return res.status(409).json({ message: "resource conflict" });
  }
  if (code === "P2025") {
    return res.status(404).json({ message: "resource not found" });
  }
  console.error("Request failed", error);
  return res.status(500).json({ message: "internal server error" });
});

export { app };

if (import.meta.main) {
  app.listen(PORT, () => {
    console.log(`server started ${PORT}`);
  });
}
