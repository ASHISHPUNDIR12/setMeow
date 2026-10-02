export function messageOf(cause: unknown) {
  return cause instanceof Error
    ? cause.message
    : "Something went wrong. Please try again.";
}
