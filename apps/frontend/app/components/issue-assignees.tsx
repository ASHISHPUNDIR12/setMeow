import type { Assignment, Person } from "../lib/types";
import { ActionSpinner, Avatar } from "./ui";

type IssueAssigneesProps = {
  loading: boolean;
  people: Person[];
  assignments: Assignment[];
  disabled: boolean;
  assigning: boolean;
  removingUserId: string | null;
  onAssign: (userId: string) => void;
  onRemove: (userId: string) => void;
};

export function IssueAssignees({
  people,
  assignments,
  disabled,
  assigning,
  loading,
  removingUserId,
  onAssign,
  onRemove,
}: IssueAssigneesProps) {
  const availablePeople = people.filter(
    (person) =>
      !assignments.some((assignment) => assignment.userId === person.id),
  );
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold text-[#5b574a] dark:text-[#e1dac8]">
          People
          {assigning && <ActionSpinner />}
        </h3>
        <select
          className="min-w-0 max-w-full rounded-lg border-0 bg-[#f4f0e2] p-2 text-[10px] text-[#7b704e] dark:bg-[#39352b] dark:text-[#d4cbb8]"
          aria-label="Assign a member"
          value=""
          disabled={disabled || loading}
          onChange={(event) => {
            const userId = event.target.value;
            if (userId) onAssign(userId);
          }}
        >
          <option value="">{assigning ? "Assigning…" : "＋ Assign"}</option>
          {availablePeople.map((person) => (
            <option key={person.id} value={person.id}>
              {person.username}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        {assignments.length ? (
          assignments.map((assignment) => (
            <span
              className="flex min-w-0 max-w-full items-center gap-1.5 rounded-full border border-line bg-[#fbf9f0] py-1 pr-2 pl-0.5 text-[10px] text-[#716b5b] dark:bg-[#39352b] dark:text-[#d4cbb8]"
              key={assignment.userId}
            >
              <Avatar name={assignment.user.username} small />
              <span className="min-w-0 truncate">
                {assignment.user.username}
              </span>
              <button
                className="size-4 shrink-0 max-sm:size-8 cursor-pointer rounded-full border-0 bg-[#eeeadd] leading-none text-[#8b8474] dark:bg-[#494333] dark:text-[#d4cbb8]"
                onClick={() => {
                  onRemove(assignment.userId);
                }}
                disabled={disabled}
                aria-label={`Remove ${assignment.user.username}`}
              >
                {removingUserId === assignment.userId ? <ActionSpinner /> : "×"}
              </button>
            </span>
          ))
        ) : (
          <span
            className="text-muted text-xs"
            role={loading ? "status" : undefined}
          >
            {loading ? (
              <>
                <ActionSpinner /> Loading people…
              </>
            ) : (
              "No one assigned yet."
            )}
          </span>
        )}
      </div>
    </div>
  );
}
