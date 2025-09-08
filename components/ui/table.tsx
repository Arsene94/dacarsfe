'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Column, SortState, DataTableProps } from '@/types/ui';

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  pageSize,
  renderRowDetails,
}: DataTableProps<T>) {
  const [sort, setSort] = React.useState<SortState<T> | undefined>();
  const [page, setPage] = React.useState(0);
  const [expanded, setExpanded] = React.useState<Record<number, boolean>>({});

  const sortedData = React.useMemo(() => {
    if (!sort) return data;
    const { accessor, direction } = sort;
    return [...data].sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      if (va < vb) return direction === 'asc' ? -1 : 1;
      if (va > vb) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sort]);

  const paginatedData = React.useMemo(() => {
    if (!pageSize) return sortedData;
    const start = page * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, page, pageSize]);

  const pageCount = React.useMemo(() => {
    if (!pageSize) return 1;
    return Math.max(1, Math.ceil(sortedData.length / pageSize));
  }, [sortedData.length, pageSize]);

  const toggleSort = (column: Column<T>) => {
    if (!column.sortable) return;
    setSort((current) => {
      if (!current || current.id !== column.id) {
        return { id: column.id, accessor: column.accessor, direction: 'asc' };
      }
      if (current.direction === 'asc') {
        return { id: column.id, accessor: column.accessor, direction: 'desc' };
      }
      return undefined;
    });
  };

  React.useEffect(() => {
    if (page > pageCount - 1) {
      setPage(0);
    }
  }, [pageCount, page]);

  const toggleRow = (index: number) => {
    setExpanded((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left">
        <thead>
          <tr className="border-b">
            {renderRowDetails && <th className="w-8"></th>}
            {columns.map((col) => (
              <th
                key={col.id}
                onClick={() => toggleSort(col)}
                className={cn(
                  'py-3 px-4 font-dm-sans font-semibold text-gray-600',
                  col.sortable && 'cursor-pointer select-none'
                )}
              >
                <div className="flex items-center">
                  {col.header}
                  {sort?.id === col.id && (
                    <span className="ml-1 text-xs">
                      {sort.direction === 'asc' ? '▲' : '▼'}
                    </span>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {paginatedData.map((row, i) => (
            <React.Fragment key={i}>
              <tr
                className="border-b hover:bg-gray-50 transition-colors"
              >
                {renderRowDetails && (
                  <td className="py-3 px-4">
                    <button
                      onClick={() => toggleRow(i)}
                      aria-label="Afișează detalii"
                      className="text-sm"
                    >
                      {expanded[i] ? '▲' : '▼'}
                    </button>
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.id} className="py-3 px-4">
                    {col.cell ? col.cell(row) : col.accessor(row)}
                  </td>
                ))}
              </tr>
              {renderRowDetails && expanded[i] && (
                <tr className="bg-gray-50">
                  <td
                    className="py-2 px-4"
                    colSpan={columns.length + 1}
                  >
                    {renderRowDetails(row)}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
      {pageSize && sortedData.length > pageSize && (
        <div className="flex items-center justify-between py-2 px-4 text-sm">
          <button
            onClick={() => setPage((p) => Math.max(p - 1, 0))}
            disabled={page === 0}
            className="px-2 py-1 text-gray-600 disabled:opacity-50"
            aria-label="Pagina anterioară"
          >
            Anterior
          </button>
          <span className="text-gray-600">
            Pagina {page + 1} din {pageCount}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(p + 1, pageCount - 1))}
            disabled={page + 1 >= pageCount}
            className="px-2 py-1 text-gray-600 disabled:opacity-50"
            aria-label="Pagina următoare"
          >
            Următoarea
          </button>
        </div>
      )}
    </div>
  );
}

export default DataTable;
