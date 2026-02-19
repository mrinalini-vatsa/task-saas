"use client";

import { useState, useTransition } from "react";
import { deleteBoardAction } from "./actions";

type Board = {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  _count: {
    lists: number;
  };
};

type BoardListProps = {
  boards: Board[];
  userId: string;
};

export function BoardList({ boards, userId }: BoardListProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {boards.map((board) => (
        <BoardCard key={board.id} board={board} userId={userId} />
      ))}
    </div>
  );
}

function BoardCard({ board, userId }: { board: Board; userId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this board? This action cannot be undone.")) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteBoardAction(board.id);
      if (result.error) {
        setError(result.error);
      }
    });
  };

  return (
    <div className="group relative rounded-lg border border-neutral-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      {error && (
        <div className="mb-3 rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
          {error}
        </div>
      )}

      <div className="mb-2 flex items-start justify-between">
        <a
          href={`/boards/${board.id}`}
          className="text-lg font-semibold text-neutral-900 hover:underline"
        >
          {board.title}
        </a>
        <button
          onClick={handleDelete}
          disabled={isPending}
          className="ml-2 rounded-md p-1.5 text-neutral-400 opacity-0 transition-opacity hover:bg-neutral-100 hover:text-red-600 focus:opacity-100 focus:outline-none group-hover:opacity-100 disabled:opacity-50"
          aria-label="Delete board"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>
      </div>

      {board.description && (
        <p className="mb-4 text-sm text-neutral-600 line-clamp-2">{board.description}</p>
      )}

      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>{board._count.lists} list{board._count.lists !== 1 ? "s" : ""}</span>
        <span>{new Date(board.createdAt).toLocaleDateString()}</span>
      </div>
    </div>
  );
}
