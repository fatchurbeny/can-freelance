'use client';

import { ColumnConfig } from './kanban-config';

interface KanbanBoardHeaderProps {
  columns: Array<ColumnConfig & { tasks: any[] }>;
  headerScrollRef: React.RefObject<HTMLDivElement | null>;
  onHeaderScroll: () => void;
}

export default function KanbanBoardHeader({
  columns,
  headerScrollRef,
  onHeaderScroll,
}: KanbanBoardHeaderProps) {
  return (
    <div
      ref={headerScrollRef}
      onScroll={onHeaderScroll}
      className="w-full overflow-x-auto [&::-webkit-scrollbar]:hidden border-b border-[#f0f0f0] dark:border-[#272a34] bg-[#f8f9fa] dark:bg-[#0d0e12]"
    >
      <div className="min-w-max flex items-stretch divide-x divide-[#f0f0f0] dark:divide-[#272a34]">
        {columns.map((column) => (
          <div
            key={column.id}
            className="w-[260px] shrink-0 px-4 py-2.5 flex items-center justify-between text-xs font-sans font-bold"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`size-2 shrink-0 rounded-full ${column.dot}`} />
              <span className="truncate text-gray-700 dark:text-gray-300">{column.title}</span>
            </div>
            <span className="font-sans text-[10px] font-bold px-2 py-0.5 rounded-none border border-[#f0f0f0] dark:border-[#272a34] bg-white dark:bg-[#16181d] text-gray-700 dark:text-gray-300 shadow-none">
              {column.tasks.length}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
