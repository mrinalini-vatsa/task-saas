"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export type RegisterState = {
  error?: string;
  success?: boolean;
};

export async function registerAction(
  _prevState: RegisterState | null,
  formData: FormData,
): Promise<RegisterState> {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const validation = registerSchema.safeParse(rawData);

  if (!validation.success) {
    return {
      error: validation.error.issues[0]?.message || "Validation failed",
    };
  }

  const { email, password } = validation.data;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
      },
    });

    redirect("/dashboard");
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "Email already registered",
      };
    }

    return {
      error: "Failed to create account. Please try again.",
    };
  }
}
