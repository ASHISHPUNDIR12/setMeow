"use client";

import { Modal } from "./ui";
import type { WorkspaceDialogProps } from "./workspace-dialog-types";

export function CreateWorkspaceDialogs({
  props,
}: {
  props: WorkspaceDialogProps;
}) {
  return (
    <>
      {props.createOrganizationOpen && (
        <Modal
          title="Create a workspace"
          close={props.onCloseCreateOrganization}
        >
          <p className="modal-copy">
            Give your team a shared place to plan and make progress.
          </p>
          <form
            className="stack modal-form"
            onSubmit={props.onCreateOrganization}
          >
            <label>
              Workspace name
              <input
                autoFocus
                required
                maxLength={50}
                value={props.newOrgName}
                onChange={(event) => props.onOrgNameChange(event.target.value)}
                placeholder="Studio North"
              />
            </label>
            <label>
              A short description <span className="muted">(optional)</span>
              <textarea
                maxLength={100}
                rows={3}
                value={props.newOrgDescription}
                onChange={(event) =>
                  props.onOrgDescriptionChange(event.target.value)
                }
                placeholder="What are you working on together?"
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="button button-quiet"
                onClick={props.onCloseCreateOrganization}
              >
                Cancel
              </button>
              <button className="button button-primary">
                Create workspace <span>↗</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
      {props.createBoardOpen && (
        <Modal title="Create a board" close={props.onCloseCreateBoard}>
          <p className="modal-copy">
            Start with a name. We’ll set up Backlog, In progress, and Done.
          </p>
          <form className="stack modal-form" onSubmit={props.onCreateBoard}>
            <label>
              Board name
              <input
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
            <div className="modal-actions">
              <button
                type="button"
                className="button button-quiet"
                onClick={props.onCloseCreateBoard}
              >
                Cancel
              </button>
              <button className="button button-primary">
                Create board <span>↗</span>
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
