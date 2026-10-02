import { afterEach, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { saveIssue } from "../app/lib/issue-actions";
import { addComment } from "../app/lib/issue-collaboration";
import { IssueDialog } from "../app/components/issue-dialog";

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
});
function setup() {
  const issue = {
    id: "one",
    title: "Issue",
    description: "Saved description\nSecond line",
    sectionId: "backlog",
    boardId: "board",
  };
  const state = {
    selectedIssue: issue,
    issues: [issue],
    issueComments: [],
    error: "",
    setIssues(update) {
      state.issues = update(state.issues);
    },
    setSelectedIssueId(update) {
      const currentId = state.selectedIssue?.id;
      const nextId = typeof update === "function" ? update(currentId) : update;
      state.selectedIssue =
        state.issues.find((issue) => issue.id === nextId) ?? null;
    },
    setIssueComments(update) {
      state.issueComments = update(state.issueComments);
    },
    setError(error) {
      state.error = error;
    },
  };
  return state;
}

test("saving updates the card and closes the selected issue", async () => {
  const state = setup();
  globalThis.fetch = async () =>
    Response.json({
      issue: {
        ...state.selectedIssue,
        title: "Updated title",
        description: "Updated description",
      },
    });
  await saveIssue(
    state,
    {
      title: "Updated title",
      description: "Updated description",
    },
    () => {},
  );
  expect(state.selectedIssue).toBeNull();
  expect(state.issues[0].description).toBe("Updated description");
});

test("failed saves leave the modal open and preserve the saved issue", async () => {
  const state = setup();
  globalThis.fetch = async () =>
    Response.json({ message: "Save failed" }, { status: 503 });
  await saveIssue(
    state,
    {
      title: "Updated title",
      description: "Updated description",
    },
    () => {},
  );
  expect(state.selectedIssue.id).toBe("one");
  expect(state.issues[0].description).toBe("Saved description\nSecond line");
  expect(state.error).toBe("Save failed");
});

test("posting uses the created comment without a second request or duplicate realtime entry", async () => {
  const state = setup();
  const comment = {
    id: "comment-1",
    content: "New comment",
    user: { username: "Member" },
  };
  let requests = 0;
  globalThis.fetch = async () => {
    requests++;
    state.issueComments = [comment];
    return Response.json({ comment });
  };
  await addComment(state, "New comment");
  expect(requests).toBe(1);
  expect(state.issueComments).toEqual([comment]);
});

test("failed comments report failure so the dialog can keep its draft", async () => {
  const state = setup();
  globalThis.fetch = async () =>
    Response.json({ message: "Comment failed" }, { status: 503 });
  expect(await addComment(state, "New comment")).toBe(false);
  expect(state.issueComments).toEqual([]);
  expect(state.error).toBe("Comment failed");
});

test("saved descriptions display as readable text with an edit button", () => {
  const state = setup();
  const html = renderToStaticMarkup(
    createElement(IssueDialog, {
      selectedIssue: state.selectedIssue,
      error: "",
      loadingDetails: false,
      issueAssignments: [],
      organizationPeople: [],
      issueComments: [],
      onCloseIssue() {},
    }),
  );
  expect(html).toContain("Saved description\nSecond line");
  expect(html).toContain("Edit description");
  expect(html).toContain("whitespace-pre-wrap");
  expect(html).not.toContain('id="issue-description"');
});

test("saving a description does not undo a newer card move", async () => {
  const state = setup();
  globalThis.fetch = async () => {
    const savedIssue = {
      ...state.selectedIssue,
      description: "Updated description",
    };
    state.issues[0] = { ...state.issues[0], sectionId: "done" };
    return Response.json({ issue: savedIssue });
  };
  await saveIssue(
    state,
    { title: "Issue", description: "Updated description" },
    () => {},
  );
  expect(state.issues[0].sectionId).toBe("done");
  expect(state.issues[0].description).toBe("Updated description");
});
