"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { deleteBoardAction } from "@/app/boards/actions";
import { useRouter } from "next/navigation";

type Board = {
  id: string;
  title: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    lists: number;
    members: number;
  };
};

type BoardGridProps = {
  boards: Board[];
};

export function BoardGrid({ boards }: BoardGridProps) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {boards.map((board) => (
        <BoardCard key={board.id} board={board} />
      ))}
    </div>
  );
}

function BoardCard({ board }: { board: Board }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const router = useRouter();

  const handleDelete = () => {
    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteBoardAction(board.id);
      if (result.error) {
        setError(result.error);
        setShowDeleteConfirm(false);
      } else {
        router.refresh();
      }
    });
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - new Date(date).getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-lg hover:border-gray-300">
      {error && (
        <div className="absolute top-0 left-0 right-0 z-10 rounded-t-xl bg-red-50 border-b border-red-200 px-4 py-2 text-xs text-red-800">
          {error}
        </div>
      )}

      <Link
        href={`/boards/${board.id}`}
        className="block p-6 pb-4"
      >
        <div className="mb-3 flex items-start justify-between">
          <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 group-hover:text-gray-700">
            {board.title}
          </h3>
        </div>

        {board.description && (
          <p className="mb-4 text-sm text-gray-600 line-clamp-2">
            {board.description}
          </p>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <span>{board._count.lists} list{board._count.lists !== 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-1">
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
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
            <span>{board._count.members} member{board._count.members !== 1 ? "s" : ""}</span>
          </div>
        </div>
      </Link>

      <div className="border-t border-gray-100 px-6 py-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500">
            Updated {formatDate(board.updatedAt)}
          </span>
          <div className="flex items-center gap-2">
            {showDeleteConfirm ? (
              <>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                  disabled={isPending}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isPending}
                  className="rounded px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {isPending ? "Deleting..." : "Confirm"}
                </button>
              </>
            ) : (
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="rounded p-1.5 text-gray-400 opacity-0 transition-opacity hover:bg-gray-100 hover:text-red-600 focus:opacity-100 focus:outline-none group-hover:opacity-100 disabled:opacity-50"
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
