"use client";

import { useActionState } from "react";
import { createBoardAction } from "./actions";

export function CreateBoardForm() {
  const [state, formAction] = useActionState(createBoardAction, null);

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-semibold text-neutral-900">Create New Board</h2>
      <form action={formAction} className="space-y-4">
        {state?.error && (
          <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-800">
            {state.error}
          </div>
        )}

        {state?.success && (
          <div className="rounded-md bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
            Board created successfully!
          </div>
        )}

        <div className="space-y-2">
          <label
            htmlFor="title"
            className="block text-sm font-medium text-neutral-700"
          >
            Board Title *
          </label>
          <input
            id="title"
            name="title"
            type="text"
            required
            maxLength={100}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            placeholder="e.g., Marketing Campaign"
          />
        </div>

        <div className="space-y-2">
          <label
            htmlFor="description"
            className="block text-sm font-medium text-neutral-700"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows={3}
            maxLength={500}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
            placeholder="Optional description for your board"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
        >
          Create Board
        </button>
      </form>
    </div>
  );
}
