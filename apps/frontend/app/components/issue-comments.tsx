import type { FormEvent } from "react";
import type { Comment } from "../lib/types";
import { buttonStyles } from "../lib/ui-styles";
import { ActionSpinner, Avatar } from "./ui";

type IssueCommentsProps = {
  loading: boolean;
  comments: Comment[];
  comment: string;
  disabled: boolean;
  sending: boolean;
  onCommentChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function IssueComments({
  comments,
  comment,
  disabled,
  sending,
  loading,
  onCommentChange,
  onSubmit,
}: IssueCommentsProps) {
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold text-[#5b574a] dark:text-[#e1dac8]">
          Conversation{" "}
          <span className="inline-grid h-5 min-w-5 place-items-center rounded-lg bg-white/60 px-1 text-[9px] font-bold text-[#938d7d] dark:bg-[#403b30] dark:text-[#c2baa8]">
            {comments.length}
          </span>
        </h3>
      </div>
      <div className="flex max-h-45 flex-col gap-3 overflow-y-auto">
        {comments.map((comment) => (
          <article className="flex items-start gap-2" key={comment.id}>
            <Avatar name={comment.user.username} small />
            <div className="min-w-0">
              <strong className="text-[10px] [overflow-wrap:anywhere] text-[#615c4f] dark:text-[#d4cbb8]">
                {comment.user.username}
              </strong>
              <p className="mt-1 text-[11px] leading-relaxed text-[#7e796c] [overflow-wrap:anywhere] dark:text-muted">
                {comment.content}
              </p>
            </div>
          </article>
        ))}
        {comments.length === 0 && (
          <p
            className="text-muted text-xs"
            role={loading ? "status" : undefined}
          >
            {loading ? (
              <>
                <ActionSpinner /> Loading comments…
              </>
            ) : (
              "No comments yet. Start the conversation."
            )}
          </p>
        )}
      </div>
      <form
        className="mt-3.5 flex items-end gap-2"
        onSubmit={onSubmit}
        aria-busy={sending}
      >
        <textarea
          className="min-w-0 flex-1 resize-y rounded-xl border border-line bg-input p-2.5 text-[11px]"
          rows={2}
          value={comment}
          disabled={disabled}
          onChange={(event) => onCommentChange(event.target.value)}
          placeholder="Write a comment…"
          aria-label="Write a comment"
        />
        <button
          type="submit"
          className={`${buttonStyles.primary} disabled:cursor-wait disabled:opacity-60`}
          disabled={disabled || !comment.trim()}
        >
          {sending && <ActionSpinner />}
          {sending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
