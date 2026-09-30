import z from "zod";

export const SignUpSchema = z.object({
  username: z.string(),
  email: z.email(),
  password: z.string().min(8),
});

export const LoginSchema = z.object({
  email: z.email(),
  password: z.string(),
});

export const OrganizationSchema = z.object({
  name: z.string().trim().min(1).max(50),
  description: z.string().max(100),
});

export const BoardSchema = z.object({
  title: z.string().trim().min(1).max(50),
});

export const SectionSchema = z.object({
  title: z.string().trim().min(1).max(50),
});

export const IssueSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim(),
  sectionId: z.uuid(),
});

export const IssueUpdateSchema = IssueSchema.pick({
  title: true,
  description: true,
})
  .partial()
  .refine((value) => Object.keys(value).length > 0);

export const MoveIssueSchema = z.object({
  sectionId: z.uuid(),
});

export const CommentSchema = z.object({
  content: z.string().trim().min(1),
});

export const AssigneeSchema = z.object({
  userId: z.uuid(),
});

export const InviteSchema = z.object({
  email: z.email(),
  orgId: z.uuid(),
});
