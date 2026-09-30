import "dotenv/config";
import { test, expect } from "bun:test";
import jwt from "jsonwebtoken";
import WebSocket from "ws";
import { prisma } from "db/client";
import { app } from "../backend/index";
import { startRealtimeServer } from "./index";

type Message = Record<string, any>;
function client(url: string, cookie: string) {
  const ws = new WebSocket(url, { headers: { Cookie: cookie } });
  const messages: Message[] = [];
  const waiters: Array<{ match: (data: Message) => boolean; resolve: (data: Message) => void }> = [];
  ws.on("message", (raw) => {
    const data = JSON.parse(raw.toString()) as Message;
    messages.push(data);
    const found = waiters.find((item) => item.match(data));
    if (found) { waiters.splice(waiters.indexOf(found), 1); found.resolve(data); }
  });
  const wait = (match: (data: Message) => boolean) => {
    const existing = messages.find(match);
    if (existing) return Promise.resolve(existing);
    return Promise.race([
      new Promise<Message>((resolve) => waiters.push({ match, resolve })),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("WebSocket event timeout")), 3000)),
    ]);
  };
  return { ws, wait, messages };
}

test("board move, REST broadcast, presence, and isolation", async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)) throw new Error("Local database required");
  const tag = crypto.randomUUID();
  const userA = await prisma.user.create({ data: { email: `ws-a-${tag}@example.test`, username: "A", passwordHash: "test" } });
  const userB = await prisma.user.create({ data: { email: `ws-b-${tag}@example.test`, username: "B", passwordHash: "test" } });
  const outsider = await prisma.user.create({ data: { email: `ws-c-${tag}@example.test`, username: "C", passwordHash: "test" } });
  const org = await prisma.organization.create({ data: { name: "Socket test", description: "Temporary" } });
  const opened: WebSocket[] = [];
  let http: ReturnType<typeof app.listen> | undefined;
  let realtime: Awaited<ReturnType<typeof startRealtimeServer>> | undefined;
  try {
    await prisma.membership.createMany({ data: [
      { userId: userA.id, organizationId: org.id, role: "admin" },
      { userId: userB.id, organizationId: org.id, role: "member" },
    ] });
    const board = await prisma.board.create({ data: { title: "Main", organizationId: org.id } });
    const otherBoard = await prisma.board.create({ data: { title: "Other", organizationId: org.id } });
    const first = await prisma.section.create({ data: { title: "First", boardId: board.id } });
    const second = await prisma.section.create({ data: { title: "Second", boardId: board.id } });
    const otherSection = await prisma.section.create({ data: { title: "Other", boardId: otherBoard.id } });
    const issue = await prisma.issue.create({ data: { title: "Issue", description: "", boardId: board.id, sectionId: first.id } });
    realtime = await startRealtimeServer({ port: 0 });
    http = app.listen(0);
    await new Promise<void>((resolve) => http!.once("listening", resolve));
    const address = http.address();
    if (!address || typeof address === "string") throw new Error("No HTTP port");
    const token = (id: string) => `accessToken=${jwt.sign({ sub: id }, process.env.JWT_SECRET!)}`;
    const url = (id: string) => `ws://127.0.0.1:${realtime!.port}/boards/${id}`;
    const inbox = client(`ws://127.0.0.1:${realtime.port}/users/me`, token(outsider.id)); opened.push(inbox.ws);
    expect((await inbox.wait((m) => m.type === "user_ready")).type).toBe("user_ready");
    const a = client(url(board.id), token(userA.id)); opened.push(a.ws);
    expect((await a.wait((m) => m.type === "board_snapshot")).issues[0].id).toBe(issue.id);
    const b = client(url(board.id), token(userB.id)); opened.push(b.ws);
    expect((await b.wait((m) => m.type === "board_snapshot")).activeUsers).toHaveLength(2);
    expect((await a.wait((m) => m.type === "presence" && m.activeUsers.length === 2)).activeUsers.map((x: any) => x.id)).toContain(userB.id);
    const secondTab = client(url(board.id), token(userA.id)); opened.push(secondTab.ws);
    expect((await secondTab.wait((m) => m.type === "board_snapshot")).activeUsers).toHaveLength(2);
    const other = client(url(otherBoard.id), token(userA.id)); opened.push(other.ws);
    await other.wait((m) => m.type === "board_snapshot");
    const denied = new WebSocket(url(board.id), { headers: { Cookie: token(outsider.id) } });
    expect(await new Promise<number>((resolve) => denied.on("unexpected-response", (_req, res) => resolve(res.statusCode ?? 0)))).toBe(403);
    denied.terminate();
    const wrongOrigin = new WebSocket(url(board.id), { headers: { Cookie: token(userA.id), Origin: "https://attacker.example" } });
    expect(await new Promise<number>((resolve) => wrongOrigin.on("unexpected-response", (_req, res) => resolve(res.statusCode ?? 0)))).toBe(403);
    wrongOrigin.terminate();

    const invitationResponse = await fetch(`http://127.0.0.1:${address.port}/v1/invite`, {
      method: "POST", headers: { Cookie: token(userA.id), "Content-Type": "application/json" },
      body: JSON.stringify({ email: outsider.email, orgId: org.id }),
    });
    expect(invitationResponse.status).toBe(201);
    expect((await inbox.wait((m) => m.type === "invitation_changed")).userId).toBe(outsider.id);

    const createIssueResponse = await fetch(`http://127.0.0.1:${address.port}/v1/issue`, {
      method: "POST", headers: { Cookie: token(userA.id), "Content-Type": "application/json" },
      body: JSON.stringify({ boardId: board.id, sectionId: first.id, title: "Live created issue", description: "" }),
    });
    expect(createIssueResponse.status).toBe(201);
    const createdIssue = (await createIssueResponse.json() as { issue: { id: string } }).issue;
    const issueCreated = await b.wait((m) => m.type === "issue_created" && m.issue?.id === createdIssue.id);
    expect((issueCreated.issue as { title: string }).title).toBe("Live created issue");
    const editIssueResponse = await fetch(`http://127.0.0.1:${address.port}/v1/issue/${createdIssue.id}`, {
      method: "PUT", headers: { Cookie: token(userA.id), "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Live updated issue" }),
    });
    expect(editIssueResponse.status).toBe(200);
    const issueUpdated = await b.wait((m) => m.type === "issue_updated" && m.issue?.id === createdIssue.id);
    expect((issueUpdated.issue as { title: string }).title).toBe("Live updated issue");
    const deleteIssueResponse = await fetch(`http://127.0.0.1:${address.port}/v1/issue/${createdIssue.id}`, {
      method: "DELETE", headers: { Cookie: token(userA.id) },
    });
    expect(deleteIssueResponse.status).toBe(204);
    expect((await b.wait((m) => m.type === "issue_deleted" && m.issueId === createdIssue.id)).issueId).toBe(createdIssue.id);

    b.ws.send(JSON.stringify({ type: "issue_move", issueId: issue.id, sectionId: second.id, requestId: "move-1" }));
    expect((await b.wait((m) => m.type === "move_ack" && m.requestId === "move-1")).sectionId).toBe(second.id);
    expect((await a.wait((m) => m.type === "issue_moved" && m.requestId === "move-1")).movedBy.id).toBe(userB.id);
    expect((await secondTab.wait((m) => m.type === "issue_moved" && m.requestId === "move-1")).sectionId).toBe(second.id);
    expect((await prisma.issue.findUniqueOrThrow({ where: { id: issue.id } })).sectionId).toBe(second.id);
    expect(other.messages.some((m) => m.type === "issue_moved")).toBe(false);

    b.ws.send(JSON.stringify({ type: "issue_move", issueId: issue.id, sectionId: otherSection.id, requestId: "bad" }));
    expect((await b.wait((m) => m.type === "error" && m.requestId === "bad")).code).toBe("invalid_section");
    expect((await prisma.issue.findUniqueOrThrow({ where: { id: issue.id } })).sectionId).toBe(second.id);

    const response = await fetch(`http://127.0.0.1:${address.port}/v1/issue/${issue.id}/move`, {
      method: "PUT", headers: { Cookie: token(userA.id), "Content-Type": "application/json" }, body: JSON.stringify({ sectionId: first.id }),
    });
    expect(response.status).toBe(200);
    expect((await b.wait((m) => m.type === "issue_moved" && m.sectionId === first.id)).movedBy.id).toBe(userA.id);

    secondTab.ws.close();
    await new Promise<void>((resolve) => secondTab.ws.once("close", () => resolve()));
    expect((await b.wait((m) => m.type === "presence" && m.activeUsers.length === 2)).activeUsers).toHaveLength(2);
    a.ws.close();
    await new Promise<void>((resolve) => a.ws.once("close", () => resolve()));
    expect((await b.wait((m) => m.type === "presence" && m.activeUsers.length === 1)).activeUsers[0].id).toBe(userB.id);
  } finally {
    for (const ws of opened) ws.terminate();
    await realtime?.close();
    if (http) await new Promise<void>((resolve) => http!.close(() => resolve()));
    await prisma.issue.deleteMany({ where: { board: { organizationId: org.id } } });
    await prisma.section.deleteMany({ where: { board: { organizationId: org.id } } });
    await prisma.board.deleteMany({ where: { organizationId: org.id } });
    await prisma.membership.deleteMany({ where: { organizationId: org.id } });
    await prisma.organization.delete({ where: { id: org.id } });
    await prisma.user.deleteMany({ where: { id: { in: [userA.id, userB.id, outsider.id] } } });
  }
});
