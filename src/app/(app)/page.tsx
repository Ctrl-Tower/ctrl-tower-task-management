import { BoardClient } from "@/components/board/BoardClient";

// The board fetches its data client-side via SWR (cached across navigations),
// so this page renders instantly and the data loads/refreshes without blocking.
export default function BoardPage() {
  return <BoardClient />;
}
