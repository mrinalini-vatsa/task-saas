import { notFound, redirect } from "next/navigation";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createListAction } from "./actions";
import { BoardDnd } from "./board-dnd";

type BoardPageProps = {
  params: {
    boardId: string;
  };
};

export default async function BoardPage({ params }: BoardPageProps) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const board = await prisma.board.findUnique({
    where: {
      id: params.boardId,
    },
    include: {
      lists: {
        orderBy: { order: "asc" },
        include: {
          tasks: {
            orderBy: { order: "asc" },
          },
        },
      },
    },
  });

  if (!board) {
    notFound();
  }

  if (board.ownerId !== session.user.id) {
    redirect("/boards");
  }

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900">{board.title}</h1>
        </div>
        <a
          href="/boards"
          className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
        >
          ← Back to boards
        </a>
      </div>

      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Add list
        </h2>
        <form
          action={createListAction}
          className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-4"
        >
          <input type="hidden" name="boardId" value={board.id} />
          <div className="flex-1 min-w-[200px] space-y-1">
            <label
              htmlFor="list-title"
              className="block text-xs font-medium uppercase text-neutral-600"
            >
              List title
            </label>
            <input
              id="list-title"
              name="title"
              type="text"
              required
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500"
              placeholder="e.g., To Do"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
          >
            Add list
          </button>
        </form>
      </section>

      <BoardDnd
        boardId={board.id}
        initialLists={board.lists.map((l) => ({
          id: l.id,
          title: l.title,
          tasks: l.tasks.map((t) => ({
            id: t.id,
            title: t.title,
            description: t.description,
          })),
        }))}
      />
    </main>
  );
}

