import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { DataTable, type Column } from '@/components/admin/data-table';

type Row = { id: string; name: string };

const columns: Column<Row>[] = [
  { key: 'name', header: 'Nombre', cell: row => row.name },
  { key: 'id', header: 'ID', cell: row => row.id },
];

const rows: Row[] = [
  { id: '1', name: 'Fila uno' },
  { id: '2', name: 'Fila dos' },
];

describe('DataTable', () => {
  it('shows a spinner while loading, with no rows rendered', () => {
    render(<DataTable columns={columns} rows={[]} state="loading" />);

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('Fila uno')).not.toBeInTheDocument();
  });

  it('shows a first-class error affordance, distinct from the empty state', () => {
    render(<DataTable columns={columns} rows={[]} state="error" errorMessage="Fallo al cargar" />);

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Fallo al cargar');
    expect(screen.queryByText('No hay datos para mostrar')).not.toBeInTheDocument();
  });

  it('falls back to a default error message when none is provided', () => {
    render(<DataTable columns={columns} rows={[]} state="error" />);

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudieron cargar los datos');
  });

  it('shows the empty message, with no error affordance present', () => {
    render(<DataTable columns={columns} rows={[]} state="empty" emptyMessage="Sin resultados" />);

    expect(screen.getByText('Sin resultados')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders each row through the column cell functions when ready', () => {
    render(<DataTable columns={columns} rows={rows} state="ready" />);

    expect(screen.getByText('Fila uno')).toBeInTheDocument();
    expect(screen.getByText('Fila dos')).toBeInTheDocument();
    expect(screen.getAllByRole('row')).toHaveLength(rows.length + 1); // + header row
  });

  it('renders the pager and disables prev on page 1', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        state="ready"
        pagination={{ page: 1, pageSize: 2, total: 5 }}
      />,
      { wrapper: ({ children }) => <NuqsTestingAdapter>{children}</NuqsTestingAdapter> }
    );

    expect(screen.getByText(/Página 1 de 3/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeEnabled();
  });

  it('disables next on the last page', () => {
    render(
      <DataTable
        columns={columns}
        rows={rows}
        state="ready"
        pagination={{ page: 3, pageSize: 2, total: 5 }}
      />,
      { wrapper: ({ children }) => <NuqsTestingAdapter>{children}</NuqsTestingAdapter> }
    );

    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();
  });

  it('writes the next page to the URL through nuqs when "next" is clicked', async () => {
    const onUrlUpdate = vi.fn();
    const { default: userEvent } = await import('@testing-library/user-event');

    render(
      <DataTable
        columns={columns}
        rows={rows}
        state="ready"
        pagination={{ page: 1, pageSize: 2, total: 5 }}
      />,
      {
        wrapper: ({ children }) => (
          <NuqsTestingAdapter onUrlUpdate={onUrlUpdate}>{children}</NuqsTestingAdapter>
        ),
      }
    );

    await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));

    expect(onUrlUpdate).toHaveBeenCalled();
    const lastCall = onUrlUpdate.mock.calls.at(-1)?.[0];
    expect(lastCall.searchParams.get('page')).toBe('2');
  });
});
