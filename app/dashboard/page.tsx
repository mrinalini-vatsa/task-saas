import { redirect } from "next/navigation";

import { getServerAuthSession } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="text-sm text-neutral-600">
        Logged in as: <span className="font-medium">{session.user.email}</span>
      </p>
    </main>
  );
}

