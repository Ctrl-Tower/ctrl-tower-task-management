"use client";

import useSWR from "swr";
import { Board } from "./Board";
import { BoardSkeleton } from "./BoardSkeleton";
import type { CategoryDTO, ColumnDTO, TaskDTO, UserDTO } from "@/lib/types";

interface BoardData {
  columns: ColumnDTO[];
  categories: CategoryDTO[];
  users: UserDTO[];
  tasks: TaskDTO[];
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function BoardClient() {
  // SWR caches in memory across client navigations: returning to the board
  // shows the cached data instantly, then revalidates in the background.
  const { data } = useSWR<BoardData>("/api/board", fetcher, {
    revalidateOnFocus: false,
    keepPreviousData: true,
  });

  if (!data || !data.columns) return <BoardSkeleton />;

  return (
    <Board
      columns={data.columns}
      categories={data.categories}
      initialTasks={data.tasks}
      users={data.users}
    />
  );
}
