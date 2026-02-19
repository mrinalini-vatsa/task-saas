import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CreateBoardForm } from "./create-board-form";
import { BoardList } from "./board-list";

export default async function BoardsPage() {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const boards = await prisma.board.findMany({
    where: {
      ownerId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      _count: {
        select: {
          lists: true,
        },
      },
    },
  });

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-neutral-900">Boards</h1>
        <p className="mt-2 text-sm text-neutral-600">
          Manage your task boards and collaborate with your team
        </p>
      </div>

      <div className="mb-8">
        <CreateBoardForm />
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold text-neutral-900">Your Boards</h2>
        {boards.length === 0 ? (
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-12 text-center">
            <p className="text-sm text-neutral-600">
              You don't have any boards yet. Create your first board above to get started.
            </p>
          </div>
        ) : (
          <BoardList boards={boards} userId={session.user.id} />
        )}
      </div>
    </main>
  );
}
