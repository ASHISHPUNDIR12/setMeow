import { test, expect } from "bun:test";
import { prisma } from "db/client";
import { app } from "../index";

test("authenticated organization workflow", async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (
    !databaseUrl ||
    !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)
  ) {
    throw new Error("This end-to-end test only runs against a local database");
  }

  const tag = crypto.randomUUID();
  const adminEmail = `admin-${tag}@example.test`;
  const memberEmail = `member-${tag}@example.test`;
  const password = "temporary-password";
  let organizationId: string | undefined;
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once("listening", resolve));
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("No test server port");
  const base = `http://127.0.0.1:${address.port}`;

  async function request(
    method: string,
    path: string,
    cookie?: string,
    body?: unknown,
  ) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data: any =
      response.status === 204 ? null : await response.json().catch(() => null);
    return { response, data };
  }

  function cookieFor(response: Response) {
    const cookie = response.headers.get("set-cookie")?.split(";")[0];
    if (!cookie) throw new Error("Auth response did not set a cookie");
    return cookie;
  }

  try {
    const preflight = await fetch(`${base}/v1/invites`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-credentials")).toBe(
      "true",
    );

    const adminSignup = await request("POST", "/auth/signup", undefined, {
      username: "Admin Test",
      email: adminEmail,
      password,
    });
    expect(adminSignup.response.status).toBe(201);
    const adminCookie = cookieFor(adminSignup.response);

    const memberSignup = await request("POST", "/auth/signup", undefined, {
      username: "Member Test",
      email: memberEmail,
      password,
    });
    expect(memberSignup.response.status).toBe(201);

    const signedOutInbox = await request("GET", "/v1/invites");
    expect(signedOutInbox.response.status).toBe(401);

    const createdOrg = await request("POST", "/v1/organization", adminCookie, {
      name: "End-to-end test",
      description: "Temporary organization",
    });
    expect(createdOrg.response.status).toBe(201);
    organizationId = createdOrg.data.organization.id;

    const invited = await request("POST", "/v1/invite", adminCookie, {
      email: memberEmail,
      orgId: organizationId,
    });
    expect(invited.response.status).toBe(201);
    const invitationId = invited.data.invitation.id;

    const duplicate = await request("POST", "/v1/invite", adminCookie, {
      email: memberEmail,
      orgId: organizationId,
    });
    expect(duplicate.response.status).toBe(409);

    const memberLogin = await request("POST", "/auth/signin", undefined, {
      email: memberEmail,
      password,
    });
    expect(memberLogin.response.status).toBe(200);
    const memberCookie = cookieFor(memberLogin.response);

    const inbox = await request("GET", "/v1/invites", memberCookie);
    expect(inbox.response.status).toBe(200);
    expect(
      inbox.data.invitations.some(
        (item: { id: string }) => item.id === invitationId,
      ),
    ).toBe(true);

    const declined = await request(
      "POST",
      `/v1/invite/${invitationId}/decline`,
      memberCookie,
    );
    expect(declined.response.status).toBe(204);
    const resent = await request("POST", "/v1/invite", adminCookie, {
      email: memberEmail,
      orgId: organizationId,
    });
    expect(resent.response.status).toBe(201);

    const accepted = await request(
      "POST",
      `/v1/invite/${invitationId}/accept`,
      memberCookie,
    );
    expect(accepted.response.status).toBe(200);
    expect(accepted.data.membership.role).toBe("member");

    const organizations = await request(
      "GET",
      "/v1/organizations",
      memberCookie,
    );
    expect(organizations.response.status).toBe(200);
    expect(
      organizations.data.allOrganization.some(
        (item: { organization: { id: string } }) =>
          item.organization.id === organizationId,
      ),
    ).toBe(true);
    const orgDetail = await request(
      "GET",
      `/v1/organization/${organizationId}`,
      memberCookie,
    );
    expect(orgDetail.data.role).toBe("member");
    const deniedOrgUpdate = await request(
      "PUT",
      `/v1/organization/${organizationId}`,
      memberCookie,
      {
        name: "Not allowed",
      },
    );
    expect(deniedOrgUpdate.response.status).toBe(403);
    const orgUpdated = await request(
      "PUT",
      `/v1/organization/${organizationId}`,
      adminCookie,
      {
        name: "Renamed organization",
      },
    );
    expect(orgUpdated.response.status).toBe(200);
    const members = await request(
      "GET",
      `/v1/organization/${organizationId}/memberships`,
      memberCookie,
    );
    expect(members.data.memberships).toHaveLength(2);

    const boardCreated = await request(
      "POST",
      `/v1/organization/${organizationId}/board`,
      memberCookie,
      {
        title: "Test board",
      },
    );
    expect(boardCreated.response.status).toBe(201);
    const boardId = boardCreated.data.board.id;

    const boardDetail = await request(
      "GET",
      `/v1/organization/${organizationId}/board/${boardId}`,
      memberCookie,
    );
    expect(boardDetail.data.board.id).toBe(boardId);
    const blockedOrgDelete = await request(
      "DELETE",
      `/v1/organization/${organizationId}`,
      adminCookie,
    );
    expect(blockedOrgDelete.response.status).toBe(409);
    const deniedBoardDelete = await request(
      "DELETE",
      `/v1/organization/${organizationId}/board/${boardId}`,
      memberCookie,
    );
    expect(deniedBoardDelete.response.status).toBe(403);

    const boards = await request(
      "GET",
      `/v1/organization/${organizationId}/boards`,
      adminCookie,
    );
    expect(boards.response.status).toBe(200);
    expect(
      boards.data.allBoards.some(
        (board: { id: string }) => board.id === boardId,
      ),
    ).toBe(true);

    const renamed = await request(
      "PUT",
      `/v1/organization/${organizationId}/board/${boardId}`,
      memberCookie,
      {
        title: "Renamed board",
      },
    );
    expect(renamed.response.status).toBe(200);
    expect(renamed.data.updatedBoard.title).toBe("Renamed board");

    const firstSection = await request("POST", "/v1/section", memberCookie, {
      boardId,
      title: "To do",
    });
    const secondSection = await request("POST", "/v1/section", memberCookie, {
      boardId,
      title: "Done",
    });
    expect(firstSection.response.status).toBe(201);
    expect(secondSection.response.status).toBe(201);
    const sectionId = firstSection.data.section.id;
    const doneSectionId = secondSection.data.section.id;

    const sections = await request(
      "GET",
      `/v1/sections?boardId=${boardId}`,
      memberCookie,
    );
    expect(sections.data.sections).toHaveLength(2);
    const sectionDetail = await request(
      "GET",
      `/v1/section/${sectionId}`,
      memberCookie,
    );
    expect(sectionDetail.data.section.id).toBe(sectionId);
    const sectionUpdated = await request(
      "PUT",
      `/v1/section/${sectionId}`,
      memberCookie,
      { title: "Ready" },
    );
    expect(sectionUpdated.data.section.title).toBe("Ready");

    const issueCreated = await request("POST", "/v1/issue", memberCookie, {
      boardId,
      sectionId,
      title: "Test issue",
      description: "Temporary",
    });
    expect(issueCreated.response.status).toBe(201);
    const issueId = issueCreated.data.issue.id;

    const issueList = await request(
      "GET",
      `/v1/issues?boardId=${boardId}`,
      memberCookie,
    );
    expect(issueList.data.issues).toHaveLength(1);
    const issueDetail = await request(
      "GET",
      `/v1/issue/${issueId}`,
      memberCookie,
    );
    expect(issueDetail.data.issue.id).toBe(issueId);
    const issueUpdated = await request(
      "PUT",
      `/v1/issue/${issueId}`,
      memberCookie,
      { title: "Updated issue" },
    );
    expect(issueUpdated.data.issue.title).toBe("Updated issue");
    const blockedSectionDelete = await request(
      "DELETE",
      `/v1/section/${sectionId}`,
      memberCookie,
    );
    expect(blockedSectionDelete.response.status).toBe(409);
    const blockedBoardDelete = await request(
      "DELETE",
      `/v1/organization/${organizationId}/board/${boardId}`,
      adminCookie,
    );
    expect(blockedBoardDelete.response.status).toBe(409);

    const moved = await request(
      "PUT",
      `/v1/issue/${issueId}/move`,
      memberCookie,
      {
        sectionId: doneSectionId,
      },
    );
    expect(moved.response.status).toBe(200);
    expect(moved.data.issue.sectionId).toBe(doneSectionId);

    const commented = await request("POST", "/v1/comment", memberCookie, {
      issueId,
      content: "A comment",
    });
    expect(commented.response.status).toBe(201);
    const commentId = commented.data.comment.id;
    const editedComment = await request(
      "PUT",
      `/v1/comment/${commentId}`,
      memberCookie,
      {
        content: "Updated comment",
      },
    );
    expect(editedComment.response.status).toBe(200);

    const commentList = await request(
      "GET",
      `/v1/issue/${issueId}/comments`,
      memberCookie,
    );
    expect(commentList.data.comments).toHaveLength(1);
    const commentDetail = await request(
      "GET",
      `/v1/comment/${commentId}`,
      memberCookie,
    );
    expect(commentDetail.data.comment.content).toBe("Updated comment");
    const extraComment = await request("POST", "/v1/comment", adminCookie, {
      issueId,
      content: "Temporary admin comment",
    });
    expect(extraComment.response.status).toBe(201);
    const removedComment = await request(
      "DELETE",
      `/v1/comment/${extraComment.data.comment.id}`,
      adminCookie,
    );
    expect(removedComment.response.status).toBe(204);

    const memberId = memberLogin.data.user.id;
    const assigned = await request(
      "POST",
      `/v1/issue/${issueId}/assignees`,
      adminCookie,
      {
        userId: memberId,
      },
    );
    expect(assigned.response.status).toBe(201);

    const assigneeList = await request(
      "GET",
      `/v1/issue/${issueId}/assignees`,
      memberCookie,
    );
    expect(assigneeList.data.assignees).toHaveLength(1);
    const unassigned = await request(
      "DELETE",
      `/v1/issue/${issueId}/assignees/${memberId}`,
      adminCookie,
    );
    expect(unassigned.response.status).toBe(204);
    const assignedAgain = await request(
      "POST",
      `/v1/issue/${issueId}/assignees`,
      adminCookie,
      { userId: memberId },
    );
    expect(assignedAgain.response.status).toBe(201);

    const removeMembership = await request(
      "DELETE",
      `/v1/organization/${organizationId}/membership/${memberId}`,
      memberCookie,
    );
    expect(removeMembership.response.status).toBe(204);
    const assignments = await request(
      "GET",
      `/v1/issue/${issueId}/assignees`,
      adminCookie,
    );
    expect(assignments.data.assignees).toHaveLength(0);

    const forbidden = await request(
      "GET",
      `/v1/organization/${organizationId}/boards`,
      memberCookie,
    );
    expect(forbidden.response.status).toBe(403);

    const deletedIssue = await request(
      "DELETE",
      `/v1/issue/${issueId}`,
      adminCookie,
    );
    expect(deletedIssue.response.status).toBe(204);
    const deletedSectionOne = await request(
      "DELETE",
      `/v1/section/${sectionId}`,
      adminCookie,
    );
    const deletedSectionTwo = await request(
      "DELETE",
      `/v1/section/${doneSectionId}`,
      adminCookie,
    );
    expect(deletedSectionOne.response.status).toBe(204);
    expect(deletedSectionTwo.response.status).toBe(204);
    const deletedBoard = await request(
      "DELETE",
      `/v1/organization/${organizationId}/board/${boardId}`,
      adminCookie,
    );
    expect(deletedBoard.response.status).toBe(204);
    const deletedOrg = await request(
      "DELETE",
      `/v1/organization/${organizationId}`,
      adminCookie,
    );
    expect(deletedOrg.response.status).toBe(204);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (organizationId) {
      await prisma.comment.deleteMany({
        where: { issue: { board: { organizationId } } },
      });
      await prisma.issueMapping.deleteMany({
        where: { issue: { board: { organizationId } } },
      });
      await prisma.issue.deleteMany({ where: { board: { organizationId } } });
      await prisma.section.deleteMany({ where: { board: { organizationId } } });
      await prisma.board.deleteMany({ where: { organizationId } });
      await prisma.invitation.deleteMany({ where: { organizationId } });
      await prisma.membership.deleteMany({ where: { organizationId } });
      await prisma.organization.deleteMany({ where: { id: organizationId } });
    }
    await prisma.user.deleteMany({
      where: { email: { in: [adminEmail, memberEmail] } },
    });
    await prisma.$disconnect();
  }
});
