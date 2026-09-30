export type Organization = {
  id: string;
  name: string;
  description: string;
};

export type OrganizationMembership = {
  role: "admin" | "member";
  organization: Organization;
};

export type Board = {
  id: string;
  title: string;
  organizationId: string;
};

export type Section = {
  id: string;
  title: string;
  boardId: string;
};

export type Issue = {
  id: string;
  title: string;
  description: string;
  boardId: string;
  sectionId: string;
};

export type Person = {
  id: string;
  username: string;
  email?: string;
};

export type Invitation = {
  id: string;
  organization: {
    id: string;
    name: string;
  };
  invitedBy: {
    username: string;
  };
};

export type Comment = {
  id: string;
  content: string;
  userId: string;
  user: {
    id: string;
    username: string;
  };
};

export type Assignment = {
  userId: string;
  user: {
    username: string;
    email: string;
  };
};

export type SocketMessage = {
  type: string;
  [key: string]: unknown;
};
