"use client";

import { useState } from "react";

import { buttonStyles, formStyles } from "../lib/ui-styles";

import { ActionSpinner } from "./ui";
import { Modal } from "./modal";

type CreateWorkspaceDialogsProps = {
  creatingOrganization: boolean;
  creatingBoard: boolean;
  createOrganizationOpen: boolean;
  onCloseCreateOrganization: () => void;
  onCreateOrganization: (values: {
    name: string;
    description: string;
  }) => Promise<boolean | undefined>;
  createBoardOpen: boolean;
  onCloseCreateBoard: () => void;
  onCreateBoard: (title: string) => Promise<boolean | undefined>;
};

export function CreateWorkspaceDialogs(props: CreateWorkspaceDialogsProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [boardTitle, setBoardTitle] = useState("");
  return (
    <>
      {props.createOrganizationOpen && (
        <Modal
          title="Create a workspace"
          close={() => {
            if (!props.creatingOrganization) props.onCloseCreateOrganization();
          }}
          closeDisabled={props.creatingOrganization}
        >
          <p className="mt-2 mb-5 text-xs leading-relaxed text-[#8f8979] dark:text-muted">
            Give your team a shared place to plan and make progress.
          </p>
          <form
            className="flex flex-col gap-3.5"
            onSubmit={async (event) => {
              event.preventDefault();
              if (await props.onCreateOrganization({ name, description })) {
                setName("");
                setDescription("");
              }
            }}
            aria-busy={props.creatingOrganization}
          >
            <label className={formStyles.label}>
              Workspace name
              <input
                className={formStyles.input}
                autoFocus
                required
                maxLength={50}
                value={name}
                disabled={props.creatingOrganization}
                onChange={(event) => setName(event.target.value)}
                placeholder="Studio North"
              />
            </label>
            <label className={formStyles.label}>
              A short description <span className="text-muted">(optional)</span>
              <textarea
                className={formStyles.textarea}
                maxLength={100}
                rows={3}
                value={description}
                disabled={props.creatingOrganization}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What are you working on together?"
              />
            </label>
            <div className="mt-1.5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={buttonStyles.quiet}
                onClick={props.onCloseCreateOrganization}
                disabled={props.creatingOrganization}
              >
                Cancel
              </button>
              <button
                className={buttonStyles.primary}
                disabled={props.creatingOrganization}
              >
                {props.creatingOrganization && <ActionSpinner />}
                {props.creatingOrganization ? (
                  "Creating…"
                ) : (
                  <>
                    Create workspace <span>↗</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {props.createBoardOpen && (
        <Modal
          title="Create a board"
          close={() => {
            if (!props.creatingBoard) props.onCloseCreateBoard();
          }}
          closeDisabled={props.creatingBoard}
        >
          <p className="mt-2 mb-5 text-xs leading-relaxed text-[#8f8979] dark:text-muted">
            Start with a name. We’ll set up Backlog, In progress, and Done.
          </p>
          <form
            className="flex flex-col gap-3.5"
            onSubmit={async (event) => {
              event.preventDefault();
              if (await props.onCreateBoard(boardTitle)) setBoardTitle("");
            }}
            aria-busy={props.creatingBoard}
          >
            <label className={formStyles.label}>
              Board name
              <input
                className={formStyles.input}
                autoFocus
                required
                maxLength={50}
                value={boardTitle}
                disabled={props.creatingBoard}
                onChange={(event) => setBoardTitle(event.target.value)}
                placeholder="Product launch"
              />
            </label>
            <div className="mt-1.5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={buttonStyles.quiet}
                onClick={props.onCloseCreateBoard}
                disabled={props.creatingBoard}
              >
                Cancel
              </button>
              <button
                className={buttonStyles.primary}
                disabled={props.creatingBoard}
              >
                {props.creatingBoard && <ActionSpinner />}
                {props.creatingBoard ? (
                  "Creating…"
                ) : (
                  <>
                    Create board <span>↗</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
