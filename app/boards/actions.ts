"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { prisma } from "@/lib/prisma";
import { getServerAuthSession } from "@/lib/auth";

const createBoardSchema = z.object({
  title: z.string().min(1, "Title is required").max(100, "Title must be less than 100 characters"),
  description: z.string().max(500, "Description must be less than 500 characters").optional(),
});

export type CreateBoardState = {
  error?: string;
  success?: boolean;
};

export async function createBoardAction(
  _prevState: CreateBoardState | null,
  formData: FormData,
): Promise<CreateBoardState> {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const rawData = {
    title: formData.get("title"),
    description: formData.get("description") || undefined,
  };

  const validation = createBoardSchema.safeParse(rawData);

  if (!validation.success) {
    return {
      error: validation.error.issues[0]?.message || "Validation failed",
    };
  }

  const { title, description } = validation.data;

  try {
    await prisma.board.create({
      data: {
        title,
        description: description || null,
        ownerId: session.user.id,
      },
    });

    revalidatePath("/boards");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    return {
      error: "Failed to create board. Please try again.",
    };
  }
}

export async function deleteBoardAction(boardId: string): Promise<{ error?: string }> {
  const session = await getServerAuthSession();

  if (!session?.user?.id) {
    return { error: "Unauthorized" };
  }

  try {
    // Verify the user is the owner of the board
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { ownerId: true },
    });

    if (!board) {
      return { error: "Board not found" };
    }

    if (board.ownerId !== session.user.id) {
      return { error: "You can only delete boards you own" };
    }

    await prisma.board.delete({
      where: { id: boardId },
    });

    revalidatePath("/boards");
    revalidatePath("/dashboard");
    return {};
  } catch (error) {
    return {
      error: "Failed to delete board. Please try again.",
    };
  }
}
