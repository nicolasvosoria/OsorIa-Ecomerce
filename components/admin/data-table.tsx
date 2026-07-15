'use client';

import type { ReactNode } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, Inbox, Loader2 } from 'lucide-react';
import { parseAsInteger, useQueryState } from 'nuqs';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export type Column<T> = {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  className?: string;
};

type DataTablePagination = {
  page: number;
  pageSize: number;
  total: number;
};

export type DataTableState = 'loading' | 'error' | 'empty' | 'ready';

type DataTableProps<T> = {
  columns: Column<T>[];
  rows: T[];
  state: DataTableState;
  errorMessage?: ReactNode;
  emptyMessage?: ReactNode;
  pagination?: DataTablePagination;
};

const DEFAULT_ERROR_MESSAGE = 'No se pudieron cargar los datos';
const DEFAULT_EMPTY_MESSAGE = 'No hay datos para mostrar';

export function DataTable<T>({
  columns,
  rows,
  state,
  errorMessage = DEFAULT_ERROR_MESSAGE,
  emptyMessage = DEFAULT_EMPTY_MESSAGE,
  pagination,
}: DataTableProps<T>) {
  return (
    <div className="rounded-md border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map(column => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {state === 'loading' && (
            <DataTableStatusRow colSpan={columns.length}>
              <div role="status" className="flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <span className="sr-only">Cargando…</span>
              </div>
            </DataTableStatusRow>
          )}
          {state === 'error' && (
            <DataTableStatusRow colSpan={columns.length}>
              <div role="alert" className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <AlertCircle className="h-10 w-10 text-destructive" />
                <p className="text-sm font-medium text-destructive">{errorMessage}</p>
              </div>
            </DataTableStatusRow>
          )}
          {state === 'empty' && (
            <DataTableStatusRow colSpan={columns.length}>
              <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
                <Inbox className="h-10 w-10 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
              </div>
            </DataTableStatusRow>
          )}
          {state === 'ready' &&
            rows.map((row, index) => (
              <TableRow key={index}>
                {columns.map(column => (
                  <TableCell key={column.key} className={column.className}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
        </TableBody>
      </Table>
      {pagination && <DataTablePager pagination={pagination} />}
    </div>
  );
}

function DataTableStatusRow({ colSpan, children }: { colSpan: number; children: ReactNode }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="h-40 text-center align-middle whitespace-normal">
        {children}
      </TableCell>
    </TableRow>
  );
}

function DataTablePager({ pagination }: { pagination: DataTablePagination }) {
  const { page, pageSize, total } = pagination;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(page, 1), totalPages);
  const isFirstPage = currentPage <= 1;
  const isLastPage = currentPage >= totalPages;

  const [, setPage] = useQueryState('page', parseAsInteger.withDefault(1).withOptions({ shallow: false }));

  return (
    <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3">
      <p className="text-sm text-muted-foreground">
        Página {currentPage} de {totalPages} · {total} resultado{total === 1 ? '' : 's'}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Página anterior"
          disabled={isFirstPage}
          onClick={() => setPage(currentPage - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label="Página siguiente"
          disabled={isLastPage}
          onClick={() => setPage(currentPage + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
