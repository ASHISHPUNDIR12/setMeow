"use client";

import { buttonStyles, formStyles } from "../lib/ui-styles";

import { Modal } from "./ui";
import type { CreateWorkspaceDialogsProps } from "./workspace-dialog-types";

export function CreateWorkspaceDialogs(props: CreateWorkspaceDialogsProps) {
  return (
    <>
      {props.createOrganizationOpen && (
        <Modal
          title="Create a workspace"
          close={props.onCloseCreateOrganization}
        >
          <p className="mt-2 mb-5 text-xs leading-relaxed text-[#8f8979] dark:text-muted">
            Give your team a shared place to plan and make progress.
          </p>
          <form
            className="flex flex-col gap-3.5"
            onSubmit={props.onCreateOrganization}
          >
            <label className={formStyles.label}>
              Workspace name
              <input
                className={formStyles.input}
                autoFocus
                required
                maxLength={50}
                value={props.newOrgName}
                onChange={(event) => props.onOrgNameChange(event.target.value)}
                placeholder="Studio North"
              />
            </label>
            <label className={formStyles.label}>
              A short description <span className="text-muted">(optional)</span>
              <textarea
                className={formStyles.textarea}
                maxLength={100}
                rows={3}
                value={props.newOrgDescription}
                onChange={(event) =>
                  props.onOrgDescriptionChange(event.target.value)
                }
                placeholder="What are you working on together?"
              />
            </label>
            <div className="mt-1.5 flex justify-end gap-2">
              <button
                type="button"
                className={buttonStyles.quiet}
                onClick={props.onCloseCreateOrganization}
              >
                Cancel
              </button>
              <button className={buttonStyles.primary}>
                Create workspace <span>↗</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
      {props.createBoardOpen && (
        <Modal title="Create a board" close={props.onCloseCreateBoard}>
          <p className="mt-2 mb-5 text-xs leading-relaxed text-[#8f8979] dark:text-muted">
            Start with a name. We’ll set up Backlog, In progress, and Done.
          </p>
          <form
            className="flex flex-col gap-3.5"
            onSubmit={props.onCreateBoard}
          >
            <label className={formStyles.label}>
              Board name
              <input
                className={formStyles.input}
                autoFocus
                required
                maxLength={50}
                value={props.newBoardTitle}
                onChange={(event) =>
                  props.onBoardTitleChange(event.target.value)
                }
                placeholder="Product launch"
              />
            </label>
            <div className="mt-1.5 flex justify-end gap-2">
              <button
                type="button"
                className={buttonStyles.quiet}
                onClick={props.onCloseCreateBoard}
              >
                Cancel
              </button>
              <button className={buttonStyles.primary}>
                Create board <span>↗</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
