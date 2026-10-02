import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { after, before, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";

let backend;
let frontend;
let origin;
let output = "";
const accountRequests = [];

async function listen(server) {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server.address().port;
}

before(async () => {
  backend = createServer((request, response) => {
    if (request.url === "/auth/me") accountRequests.push(request.headers.cookie);
    response.setHeader("Content-Type", "application/json");
    const token = request.headers.cookie;
    if (token === "accessToken=backend-down") {
      response.writeHead(503).end('{}');
      return;
    }
    if (token !== "accessToken=valid" && token !== "accessToken=empty") {
      response.writeHead(401).end('{"message":"unauthorized"}');
      return;
    }
    if (request.url === "/auth/me") {
      response.end(JSON.stringify({ user: { id: "user", username: "Test user" } }));
    } else if (request.url === "/v1/organizations") {
      response.end(JSON.stringify({ allOrganization: token === "accessToken=empty" ? [] : [
        { role: "admin", organization: { id: "team", name: "Private team", description: "" } },
        { role: "member", organization: { id: "second-team", name: "Second team", description: "" } },
      ] }));
    } else if (request.url === "/v1/organization/team/boards") {
      response.end(JSON.stringify({ allBoards: [
        { id: "one", organizationId: "team", title: "First private board" },
        { id: "two", organizationId: "team", title: "Second private board" },
      ] }));
    } else if (request.url === "/v1/organization/second-team/boards") {
      response.end(JSON.stringify({ allBoards: [
        { id: "three", organizationId: "second-team", title: "Other workspace board" },
      ] }));
    } else {
      response.writeHead(404).end('{}');
    }
  });
  const backendPort = await listen(backend);
  const portReservation = createServer();
  const frontendPort = await listen(portReservation);
  await new Promise((resolve) => portReservation.close(resolve));
  origin = `http://127.0.0.1:${frontendPort}`;
  frontend = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", String(frontendPort)], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, API_URL: `http://127.0.0.1:${backendPort}` },
    stdio: ["ignore", "pipe", "pipe"],
  });
  frontend.stdout.on("data", (data) => { output += data; });
  frontend.stderr.on("data", (data) => { output += data; });
  for (let attempt = 0; attempt < 100; attempt++) {
    if (frontend.exitCode !== null) throw new Error(output);
    try {
      if ((await fetch(`${origin}/signin`)).ok) return;
    } catch { /* Server is still starting. */ }
    await delay(100);
  }
  throw new Error(`Frontend did not start: ${output}`);
}, { timeout: 20000 });

after(async () => {
  if (frontend && frontend.exitCode === null) {
    const exited = new Promise((resolve) => frontend.once("exit", resolve));
    frontend.kill("SIGTERM");
    await exited;
  }
  if (backend) await new Promise((resolve) => backend.close(resolve));
});

function request(path, token) {
  return fetch(`${origin}${path}`, {
    redirect: "manual",
    headers: token ? { Cookie: `accessToken=${token}` } : {},
  });
}

async function assertRedirect(response, path) {
  let destination = response.headers.get("location");
  if (!destination) {
    assert.equal(response.status, 200);
    const html = await response.clone().text();
    destination = /http-equiv="refresh"[^>]*content="\d+;url=([^"]+)"/.exec(html)?.[1]?.replaceAll("&amp;", "&");
    assert.ok(destination, "Expected a redirect in the streamed response");
  } else {
    assert.equal(response.status, 307);
  }
  const url = new URL(destination, origin);
  assert.equal(url.pathname + url.search, path);
}

test("auth routes render separate forms and preserve the return destination", async () => {
  const signin = await request("/signin?next=%2Finvitations");
  assert.equal(signin.status, 200);
  assert.match(await signin.text(), /\/signup\?next=%2Finvitations/);
  const signup = await request("/signup");
  assert.equal(signup.status, 200);
  assert.match(await signup.text(), /Your name/);
});

test("every protected route rejects missing and invalid sessions", async () => {
  for (const path of ["/dashboard", "/invitations", "/workspaces/team", "/workspaces/team/boards/two"]) {
    for (const token of [undefined, "forged-token"]) {
      const response = await request(path, token);
      await assertRedirect(response, `/signin?next=${encodeURIComponent(path)}`);
      assert.doesNotMatch(await response.text(), /Private team|Second private board/);
    }
  }
});

test("root, dashboard and workspace redirects follow the verified account", async () => {
  await assertRedirect(await request("/"), "/signin");
  await assertRedirect(await request("/", "valid"), "/dashboard");
  await assertRedirect(await request("/dashboard", "valid"), "/workspaces/team");
  await assertRedirect(await request("/workspaces/team", "valid"), "/workspaces/team/boards/one");
  assert.equal((await request("/dashboard", "empty")).status, 200);
});

test("a direct board URL preserves selection and denies other resources", async () => {
  const response = await request("/workspaces/team/boards/two", "valid");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /aria-current="page" href="\/workspaces\/team\/boards\/two"|href="\/workspaces\/team\/boards\/two" aria-current="page"/);
  for (const path of ["/workspaces/other", "/workspaces/team/boards/missing", "/workspaces/other/boards/two"]) {
    const denied = await request(path, "valid");
    if (denied.status !== 404) {
      assert.equal(denied.status, 200);
      assert.match(await denied.text(), /NEXT_HTTP_ERROR_FALLBACK;404/);
    }
  }
  assert.equal((await request("/invitations", "valid")).status, 200);
});

test("authenticated auth pages return to safe app URLs only", async () => {
  await assertRedirect(await request("/signin?next=%2Finvitations", "valid"), "/invitations");
  await assertRedirect(await request("/signup?next=%2Fworkspaces%2Fteam%2Fboards%2Ftwo", "valid"), "/workspaces/team/boards/two");
  await assertRedirect(await request("/signin?next=%2Finvitations&next=%2Fdashboard", "valid"), "/dashboard");
  for (const target of ["https://example.com", "//example.com", "/signin", "/workspaces\\example.com"]) {
    await assertRedirect(await request(`/signup?next=${encodeURIComponent(target)}`, "valid"), "/dashboard");
  }
});

test("layouts preserve query parameters and ignore supplied redirect headers", async () => {
  const path = "/invitations?organizationId=second-team";
  await assertRedirect(await request(path), `/signin?next=${encodeURIComponent(path)}`);
  const response = await fetch(`${origin}/signin?next=%2Finvitations`, {
    redirect: "manual",
    headers: {
      Cookie: "accessToken=valid",
      "x-auth-request-url": "/signin?next=%2Fworkspaces%2Fteam",
    },
  });
  await assertRedirect(response, "/invitations");
});

test("layout and page share one account lookup and context supplies the user", async () => {
  accountRequests.length = 0;
  const response = await request("/invitations", "valid");
  assert.equal(response.status, 200);
  assert.match(await response.text(), /Test user/);
  assert.deepEqual(accountRequests, ["accessToken=valid"]);
});

test("invitations show board navigation for the selected workspace", async () => {
  const direct = await request("/invitations", "valid");
  assert.equal(direct.status, 200);
  const html = await direct.text();
  assert.match(html, /href="\/workspaces\/team\/boards\/one"/);
  assert.match(html, /href="\/workspaces\/team\/boards\/two"/);
  assert.doesNotMatch(html, /No boards yet/);

  const selected = await request("/invitations?organizationId=second-team", "valid");
  assert.equal(selected.status, 200);
  const selectedHtml = await selected.text();
  assert.match(selectedHtml, /href="\/workspaces\/second-team\/boards\/three"/);
  assert.doesNotMatch(selectedHtml, /href="\/workspaces\/team\/boards\/one"/);

  const unknown = await request("/invitations?organizationId=not-a-member", "valid");
  assert.equal(unknown.status, 200);
  assert.match(await unknown.text(), /href="\/workspaces\/team\/boards\/one"/);
  const empty = await request("/invitations", "empty");
  assert.equal(empty.status, 200);
  assert.match(await empty.text(), /No boards yet/);
});

test("backend outages surface as failures instead of a sign-in redirect", async () => {
  const response = await request("/dashboard", "backend-down");
  if (response.status !== 500) {
    assert.equal(response.status, 200);
    const html = await response.text();
    // Production streams redact the error message and carry a boundary digest.
    assert.match(html, /\$RX\("B:\d+","\d+"\)/);
    assert.doesNotMatch(html, /__next-page-redirect|Private team|First private board/);
  }
  assert.equal(response.headers.get("location"), null);
});
