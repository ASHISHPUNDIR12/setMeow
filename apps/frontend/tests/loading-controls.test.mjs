import { expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BoardWelcome } from "../app/components/board-welcome";
import { BoardContent } from "../app/components/board-content";
import { CreateWorkspaceDialogs } from "../app/components/create-workspace-dialogs";
import { InvitationInbox } from "../app/components/invitation-inbox";

const render = (component, props) =>
  renderToStaticMarkup(createElement(component, props));

test("first-section creation shows progress and disables the form until finished", () => {
  const props = { kind: "section", creatingSection: true };
  const busy = render(BoardWelcome, props);
  expect(busy).toContain('aria-busy="true"');
  expect(busy).toContain("Creating…");
  expect(busy.match(/disabled=""/g)).toHaveLength(2);
  const ready = render(BoardWelcome, { ...props, creatingSection: false });
  expect(ready).toContain("Add section");
  expect(ready).not.toContain('disabled=""');
});

test("inline section creation disables save, cancel and input", () => {
  const props = {
    hasOrganization: true,
    hasBoard: true,
    loading: false,
    issues: [],
    sections: [{ id: "one", title: "Backlog" }],
    issuesBySection: new Map(),
    movingIssueIds: new Set(),
    addingSection: true,
    creatingSection: true,
  };
  const html = render(BoardContent, props);
  expect(html).toContain('aria-label="Creating section"');
  expect(html.match(/disabled=""/g)).toHaveLength(3);
  // A realtime section-created event can replace the empty-board form before
  // the POST response; the add button must still show the in-flight creation.
  const switched = render(BoardContent, { ...props, addingSection: false });
  expect(switched).toContain("Creating…");
  expect(switched).toContain('disabled=""');
});

test("board creation stays visibly pending while default sections are being created", () => {
  const html = render(CreateWorkspaceDialogs, {
    createBoardOpen: true,
    createOrganizationOpen: false,
    creatingBoard: true,
    creatingOrganization: false,
    newBoardTitle: "A board",
  });
  expect(html).toContain('aria-busy="true"');
  expect(html).toContain("Creating…");
  expect(html.match(/disabled=""/g)).toHaveLength(4);
});

test("answering an invitation disables both choices and labels the chosen action", () => {
  const html = render(InvitationInbox, {
    invitations: [
      {
        id: "invite",
        organization: { name: "Team" },
        invitedBy: { username: "Member" },
      },
    ],
    answeringInvites: new Map([["invite", "accept"]]),
  });
  expect(html).toContain("Joining…");
  expect(html.match(/disabled=""/g)).toHaveLength(2);
});
