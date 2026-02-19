"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { getServerAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const createListSchema = z.object({
  boardId: z.string().min(1),
  title: z.string().min(1, "List title is required").max(100),
});

const createTaskSchema = z.object({
  listId: z.string().min(1),
  title: z.string().min(1, "Task title is required").max(200),
  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .optional(),
});

const editTaskSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().min(1, "Task title is required").max(200),
  description: z
    .string()
    .max(2000, "Description must be less than 2000 characters")
    .optional(),
});

const persistTaskOrderSchema = z.object({
  boardId: z.string().min(1),
  lists: z
    .array(
      z.object({
        listId: z.string().min(1),
        taskIds: z.array(z.string().min(1)),
      }),
    )
    .min(1),
});

export async function createListAction(formData: FormData) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const raw = {
    boardId: formData.get("boardId"),
    title: formData.get("title"),
  };

  const parsed = createListSchema.safeParse(raw);

  if (!parsed.success) {
    return;
  }

  const { boardId, title } = parsed.data;

  // Ensure the current user owns the board
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { ownerId: true },
  });

  if (!board || board.ownerId !== session.user.id) {
    return;
  }

  const position =
    (await prisma.list.count({
      where: { boardId },
    })) + 1;

  await prisma.list.create({
    data: {
      title,
      order: position,
      boardId,
    },
  });

  revalidatePath(`/boards/${boardId}`);
}

export async function createTaskAction(formData: FormData) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const raw = {
    listId: formData.get("listId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  };

  const parsed = createTaskSchema.safeParse(raw);

  if (!parsed.success) {
    return;
  }

  const { listId, title, description } = parsed.data;

  const list = await prisma.list.findUnique({
    where: { id: listId },
    select: {
      board: {
        select: { id: true, ownerId: true },
      },
    },
  });

  if (!list || list.board.ownerId !== session.user.id) {
    return;
  }

  const position =
    (await prisma.task.count({
      where: { listId },
    })) + 1;

  await prisma.task.create({
    data: {
      title,
      description: description || null,
      order: position,
      listId,
    },
  });

  revalidatePath(`/boards/${list.board.id}`);
}

export async function editTaskAction(formData: FormData) {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const raw = {
    taskId: formData.get("taskId"),
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  };

  const parsed = editTaskSchema.safeParse(raw);

  if (!parsed.success) {
    return;
  }

  const { taskId, title, description } = parsed.data;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      list: {
        select: {
          board: {
            select: { id: true, ownerId: true },
          },
        },
      },
    },
  });

  if (!task || task.list.board.ownerId !== session.user.id) {
    return;
  }

  await prisma.task.update({
    where: { id: taskId },
    data: {
      title,
      description: description || null,
    },
  });

  revalidatePath(`/boards/${task.list.board.id}`);
}

export async function deleteTaskAction(
  taskId: string,
): Promise<{ error?: string }> {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: {
      list: {
        select: {
          board: {
            select: { id: true, ownerId: true },
          },
        },
      },
    },
  });

  if (!task || task.list.board.ownerId !== session.user.id) {
    return { error: "Forbidden" };
  }

  await prisma.task.delete({
    where: { id: taskId },
  });

  revalidatePath(`/boards/${task.list.board.id}`);
  return {};
}

export async function persistTaskOrderAction(input: unknown): Promise<{
  error?: string;
}> {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  const parsed = persistTaskOrderSchema.safeParse(input);

  if (!parsed.success) {
    return { error: "Invalid payload" };
  }

  const { boardId, lists } = parsed.data;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { ownerId: true },
  });

  if (!board || board.ownerId !== session.user.id) {
    return { error: "Forbidden" };
  }

  const listIds = lists.map((l) => l.listId);
  const dbLists = await prisma.list.findMany({
    where: {
      id: { in: listIds },
      boardId,
    },
    select: { id: true },
  });

  if (dbLists.length !== listIds.length) {
    return { error: "Invalid lists" };
  }

  const movedTaskIds = lists.flatMap((l) => l.taskIds);
  const distinctTaskIds = Array.from(new Set(movedTaskIds));

  if (distinctTaskIds.length > 0) {
    const tasks = await prisma.task.findMany({
      where: { id: { in: distinctTaskIds } },
      select: {
        id: true,
        list: { select: { boardId: true } },
      },
    });

    if (tasks.length !== distinctTaskIds.length) {
      return { error: "Invalid tasks" };
    }

    if (tasks.some((t) => t.list.boardId !== boardId)) {
      return { error: "Invalid tasks" };
    }
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const list of lists) {
        for (let i = 0; i < list.taskIds.length; i++) {
          const taskId = list.taskIds[i]!;
          await tx.task.update({
            where: { id: taskId },
            data: {
              listId: list.listId,
              order: i + 1,
            },
          });
        }
      }
    });

    revalidatePath(`/boards/${boardId}`);
    return {};
  } catch {
    return { error: "Failed to persist changes" };
  }
}

