import { afterEach, expect, test } from "bun:test";
import { createIssueMover } from "../app/lib/issue-mover";
import { handleBoardEvent } from "../app/lib/board-events";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});

function setup() {
  const state = {
    issues: [{ id: "issue-1", sectionId: "backlog", title: "An issue" }],
    movingIssueIds: new Set(),
    error: "",
    setIssues(update) {
      state.issues =
        typeof update === "function" ? update(state.issues) : update;
    },
    setMovingIssueIds(update) {
      state.movingIssueIds = update(state.movingIssueIds);
    },
    setError(error) {
      state.error = error;
    },
    setLoadingBoard() {},
    setSections() {},
    setActiveUsers() {},
  };
  const pending = { current: new Map() };
  return { state, pending, move: createIssueMover(state, pending) };
}
function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
function saved(sectionId) {
  return Response.json({ issue: { id: "issue-1", sectionId } });
}

test("moves immediately and stays pending until HTTP confirms without a socket acknowledgement", async () => {
  const response = deferred();
  globalThis.fetch = () => response.promise;
  const { state, move, pending } = setup();
  const saving = move("issue-1", "doing");
  expect(state.issues[0].sectionId).toBe("doing");
  expect(state.movingIssueIds.has("issue-1")).toBe(true);
  response.resolve(saved("doing"));
  await saving;
  expect(state.issues[0].sectionId).toBe("doing");
  expect(state.movingIssueIds.size).toBe(0);
  expect(pending.current.size).toBe(0);
  expect(state.error).toBe("");
});

test("rapid moves save in order and old events or snapshots cannot undo the latest destination", async () => {
  const first = deferred(),
    second = deferred(),
    requests = [];
  globalThis.fetch = (_url, init) => {
    requests.push(JSON.parse(init.body).sectionId);
    return requests.length === 1 ? first.promise : second.promise;
  };
  const { state, move, pending } = setup();
  const saving = move("issue-1", "doing");
  expect(move("issue-1", "done")).toBe(saving);
  expect(requests).toEqual(["doing"]);
  expect(state.issues[0].sectionId).toBe("done");
  handleBoardEvent(
    { type: "issue_moved", issueId: "issue-1", sectionId: "doing" },
    "board",
    state,
    { current: null },
    pending.current,
  );
  handleBoardEvent(
    { type: "board_snapshot", issues: [{ id: "issue-1", sectionId: "doing" }] },
    "board",
    state,
    { current: null },
    pending.current,
  );
  expect(state.issues[0].sectionId).toBe("done");
  first.resolve(saved("doing"));
  for (let tick = 0; tick < 20 && requests.length < 2; tick++)
    await Promise.resolve();
  expect(requests).toEqual(["doing", "done"]);
  expect(state.issues[0].sectionId).toBe("done");
  second.resolve(saved("done"));
  await saving;
  expect(state.issues[0].sectionId).toBe("done");
  expect(state.error).toBe("");
});

test("a transient server error retries once and completes successfully", async () => {
  let attempts = 0;
  globalThis.fetch = async () =>
    ++attempts === 1
      ? Response.json({ message: "temporary failure" }, { status: 503 })
      : saved("doing");
  const { state, move } = setup();
  await move("issue-1", "doing");
  expect(attempts).toBe(2);
  expect(state.issues[0].sectionId).toBe("doing");
  expect(state.error).toBe("");
});

test("a lost response does not undo a move that the server already committed", async () => {
  let writes = 0;
  globalThis.fetch = async (_url, init) => {
    if (init.method === "PUT") {
      writes++;
      throw new TypeError("Connection lost");
    }
    return saved("doing");
  };
  const { state, move } = setup();
  await move("issue-1", "doing");
  expect(writes).toBe(2);
  expect(state.issues[0].sectionId).toBe("doing");
  expect(state.error).toBe("");
});

test("invalid moves are not retried and restore the server's current destination", async () => {
  let writes = 0;
  globalThis.fetch = async (_url, init) => {
    if (init.method === "PUT") {
      writes++;
      return Response.json({ message: "invalid section" }, { status: 400 });
    }
    return saved("review");
  };
  const { state, move } = setup();
  await move("issue-1", "doing");
  expect(writes).toBe(1);
  expect(state.issues[0].sectionId).toBe("review");
  expect(state.error).toContain("Could not save");
  expect(state.movingIssueIds.size).toBe(0);
});

test("a failed older move cannot roll back a newer queued destination", async () => {
  const first = deferred(),
    requests = [];
  globalThis.fetch = async (_url, init) => {
    if (init.method !== "PUT") return saved("backlog");
    const section = JSON.parse(init.body).sectionId;
    requests.push(section);
    return section === "doing" ? first.promise : saved("done");
  };
  const { state, move } = setup();
  const saving = move("issue-1", "doing");
  move("issue-1", "done");
  first.resolve(Response.json({ message: "invalid section" }, { status: 400 }));
  await saving;
  expect(requests).toEqual(["doing", "done"]);
  expect(state.issues[0].sectionId).toBe("done");
  expect(state.error).toBe("");
});

test("board cleanup cancels pending saves without late state changes", async () => {
  const response = deferred();
  globalThis.fetch = () => response.promise;
  const { state, move, pending } = setup();
  const saving = move("issue-1", "doing");
  pending.current.get("issue-1").controller.abort();
  pending.current.clear();
  state.issues = [];
  response.resolve(saved("doing"));
  await saving;
  expect(state.issues).toEqual([]);
  expect(state.error).toBe("");
});

test("a refresh from a board that unmounted cannot replace current state", async () => {
  const response = deferred();
  globalThis.fetch = () => response.promise;
  const { state, pending } = setup();
  const controller = new AbortController();
  handleBoardEvent(
    { type: "board_refresh", boardId: "board" },
    "board",
    state,
    { current: null },
    pending.current,
    controller.signal,
  );
  controller.abort();
  response.resolve(Response.json({ sections: [], issues: [] }));
  await response.promise;
  for (let tick = 0; tick < 20; tick++) await Promise.resolve();
  expect(state.issues[0].id).toBe("issue-1");
  expect(state.error).toBe("");
});

test("events for another board and incomplete move events are ignored", () => {
  const { state, pending } = setup();
  handleBoardEvent(
    { type: "board_snapshot", boardId: "other", issues: [] },
    "board",
    state,
    { current: null },
    pending.current,
  );
  handleBoardEvent(
    { type: "issue_moved", issueId: "issue-1" },
    "board",
    state,
    { current: null },
    pending.current,
  );
  expect(state.issues[0].sectionId).toBe("backlog");
});
