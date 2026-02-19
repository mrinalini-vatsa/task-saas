"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  createTaskAction,
  deleteTaskAction,
  editTaskAction,
  persistTaskOrderAction,
} from "./actions";

type Task = {
  id: string;
  title: string;
  description: string | null;
};

type List = {
  id: string;
  title: string;
  tasks: Task[];
};

export function BoardDnd({
  boardId,
  initialLists,
}: {
  boardId: string;
  initialLists: List[];
}) {
  const router = useRouter();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const [lists, setLists] = useState<List[]>(initialLists);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setLists(initialLists);
  }, [initialLists]);

  const tasksById = useMemo(() => {
    const map = new Map<string, Task>();
    for (const list of lists) {
      for (const task of list.tasks) {
        map.set(task.id, task);
      }
    }
    return map;
  }, [lists]);

  const activeTask = activeTaskId ? tasksById.get(activeTaskId) : null;

  function findListIdByTaskId(taskId: string) {
    for (const list of lists) {
      if (list.tasks.some((t) => t.id === taskId)) return list.id;
    }
    return null;
  }

  function findListIndexById(listId: string) {
    return lists.findIndex((l) => l.id === listId);
  }

  function findTaskIndex(listId: string, taskId: string) {
    const list = lists.find((l) => l.id === listId);
    if (!list) return -1;
    return list.tasks.findIndex((t) => t.id === taskId);
  }

  function buildPersistPayload(nextLists: List[], listIds: string[]) {
    const uniqueListIds = Array.from(new Set(listIds)).filter(Boolean);
    return {
      boardId,
      lists: uniqueListIds
        .map((listId) => {
          const list = nextLists.find((l) => l.id === listId);
          if (!list) return null;
          return { listId, taskIds: list.tasks.map((t) => t.id) };
        })
        .filter(Boolean),
    };
  }

  return (
    <section className="flex gap-4 overflow-x-auto pb-4">
      {error && (
        <div className="fixed bottom-6 left-1/2 z-50 w-[min(520px,calc(100%-2rem))] -translate-x-1/2 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 shadow-sm">
          {error}
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={({ active }) => {
          setError(null);
          setActiveTaskId(String(active.id));
        }}
        onDragCancel={() => {
          setActiveTaskId(null);
        }}
        onDragOver={({ active, over }) => {
          if (!over) return;
          const activeId = String(active.id);
          const overId = String(over.id);

          const activeListId = findListIdByTaskId(activeId);
          if (!activeListId) return;

          const overListId =
            lists.some((l) => l.id === overId) ? overId : findListIdByTaskId(overId);

          if (!overListId) return;

          if (activeListId === overListId) return;

          setLists((prev) => {
            const activeListIdx = prev.findIndex((l) => l.id === activeListId);
            const overListIdx = prev.findIndex((l) => l.id === overListId);
            if (activeListIdx === -1 || overListIdx === -1) return prev;

            const activeList = prev[activeListIdx]!;
            const overList = prev[overListIdx]!;

            const activeTaskIdx = activeList.tasks.findIndex((t) => t.id === activeId);
            if (activeTaskIdx === -1) return prev;

            const task = activeList.tasks[activeTaskIdx]!;

            const nextActiveTasks = activeList.tasks.filter((t) => t.id !== activeId);

            const overTaskIdx = overList.tasks.findIndex((t) => t.id === overId);
            const insertIdx = overTaskIdx === -1 ? overList.tasks.length : overTaskIdx;
            const nextOverTasks = [
              ...overList.tasks.slice(0, insertIdx),
              task,
              ...overList.tasks.slice(insertIdx),
            ];

            const next = [...prev];
            next[activeListIdx] = { ...activeList, tasks: nextActiveTasks };
            next[overListIdx] = { ...overList, tasks: nextOverTasks };
            return next;
          });
        }}
        onDragEnd={({ active, over }) => {
          const activeId = String(active.id);
          const overId = over ? String(over.id) : null;
          setActiveTaskId(null);

          if (!overId) return;

          const fromListId = findListIdByTaskId(activeId);
          if (!fromListId) return;

          const toListId =
            lists.some((l) => l.id === overId) ? overId : findListIdByTaskId(overId);
          if (!toListId) return;

          const fromIndex = findTaskIndex(fromListId, activeId);
          if (fromIndex === -1) return;

          const prevLists = lists;

          let nextLists = lists;

          if (fromListId === toListId) {
            const toIndex =
              lists.some((l) => l.id === overId)
                ? lists.find((l) => l.id === toListId)!.tasks.length - 1
                : findTaskIndex(toListId, overId);

            if (toIndex === -1 || fromIndex === toIndex) return;

            nextLists = lists.map((list) => {
              if (list.id !== fromListId) return list;
              return { ...list, tasks: arrayMove(list.tasks, fromIndex, toIndex) };
            });

            setLists(nextLists);

            const payload = buildPersistPayload(nextLists, [fromListId]);
            startTransition(async () => {
              const res = await persistTaskOrderAction(payload);
              if (res?.error) {
                setLists(prevLists);
                setError(res.error);
              } else {
                router.refresh();
              }
            });
            return;
          }

          // Different list: after onDragOver, state likely already reflects move,
          // but we still persist final ordering for both lists.
          const payload = buildPersistPayload(nextLists, [fromListId, toListId]);
          startTransition(async () => {
            const res = await persistTaskOrderAction(payload);
            if (res?.error) {
              setLists(prevLists);
              setError(res.error);
            } else {
              router.refresh();
            }
          });
        }}
      >
        {lists.length === 0 ? (
          <div className="flex h-40 w-full items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50">
            <p className="text-sm text-neutral-600">
              No lists yet. Create your first list above.
            </p>
          </div>
        ) : (
          lists.map((list) => (
            <ListColumn
              key={list.id}
              boardId={boardId}
              list={list}
              disabled={isPending}
              onDeleteTask={async (taskId) => {
                setError(null);
                const prev = lists;
                setLists((cur) =>
                  cur.map((l) =>
                    l.id === list.id
                      ? { ...l, tasks: l.tasks.filter((t) => t.id !== taskId) }
                      : l,
                  ),
                );
                const res = await deleteTaskAction(taskId);
                if (res?.error) {
                  setLists(prev);
                  setError(res.error);
                } else {
                  router.refresh();
                }
              }}
            />
          ))
        )}

        <DragOverlay>
          {activeTask ? (
            <div className="w-64 rounded-md bg-white p-3 text-sm shadow-lg ring-1 ring-neutral-200">
              <p className="font-medium text-neutral-900">{activeTask.title}</p>
              {activeTask.description && (
                <p className="mt-1 text-xs text-neutral-600">
                  {activeTask.description}
                </p>
              )}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}

function ListColumn({
  list,
  disabled,
  onDeleteTask,
}: {
  boardId: string;
  list: List;
  disabled: boolean;
  onDeleteTask: (taskId: string) => Promise<void>;
}) {
  const { setNodeRef } = useDroppable({
    id: list.id,
  });

  return (
    <div
      ref={setNodeRef}
      className="flex w-72 flex-shrink-0 flex-col rounded-lg border border-neutral-200 bg-neutral-50 p-4"
    >
      <h3 className="mb-3 text-sm font-semibold text-neutral-900">{list.title}</h3>

      <SortableContext
        items={list.tasks.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="mb-3 space-y-2">
          {list.tasks.length === 0 ? (
            <p className="text-xs text-neutral-500">No tasks in this list yet.</p>
          ) : (
            list.tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                disabled={disabled}
                onDelete={() => onDeleteTask(task.id)}
              />
            ))
          )}
        </div>
      </SortableContext>

      <form action={createTaskAction} className="mt-auto space-y-2">
        <input type="hidden" name="listId" value={list.id} />
        <div className="space-y-1">
          <label className="block text-xs text-neutral-600">New task title</label>
          <input
            name="title"
            type="text"
            required
            disabled={disabled}
            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:opacity-60"
            placeholder="Task title"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs text-neutral-600">
            Description (optional)
          </label>
          <textarea
            name="description"
            rows={2}
            disabled={disabled}
            className="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:opacity-60"
            placeholder="Add more details"
          />
        </div>
        <button
          type="submit"
          disabled={disabled}
          className="w-full rounded-md bg-white px-3 py-1.5 text-xs font-medium text-neutral-900 shadow-sm ring-1 ring-neutral-200 hover:bg-neutral-50 disabled:opacity-60"
        >
          Add task
        </button>
      </form>
    </div>
  );
}

function SortableTaskCard({
  task,
  disabled,
  onDelete,
}: {
  task: Task;
  disabled: boolean;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-md bg-white p-3 text-sm shadow-sm ring-1 ring-neutral-200"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <button
          type="button"
          className="flex-1 text-left"
          {...attributes}
          {...listeners}
        >
          <p className="font-medium text-neutral-900">{task.title}</p>
          {task.description && (
            <p className="mt-1 text-xs text-neutral-600">{task.description}</p>
          )}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="rounded-md p-1 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-red-600"
          aria-label="Delete task"
        >
          Delete
        </button>
      </div>

      <details className="mt-1">
        <summary className="cursor-pointer text-xs text-neutral-500 hover:text-neutral-800">
          Edit task
        </summary>
        <form action={editTaskAction} className="mt-2 space-y-2">
          <input type="hidden" name="taskId" value={task.id} />
          <div className="space-y-1">
            <label className="block text-xs text-neutral-600">Title</label>
            <input
              name="title"
              type="text"
              defaultValue={task.title}
              required
              disabled={disabled}
              className="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:opacity-60"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs text-neutral-600">Description</label>
            <textarea
              name="description"
              rows={2}
              defaultValue={task.description ?? ""}
              disabled={disabled}
              className="w-full rounded-md border border-neutral-300 px-2 py-1 text-xs focus:border-neutral-500 focus:outline-none focus:ring-1 focus:ring-neutral-500 disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled={disabled}
            className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-800 disabled:opacity-60"
          >
            Save
          </button>
        </form>
      </details>
    </div>
  );
}

