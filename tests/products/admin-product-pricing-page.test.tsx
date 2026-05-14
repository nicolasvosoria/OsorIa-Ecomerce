import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import CreateProductPage from '@/app/admin/products/create/page';

const mockUseAdminPermissions = vi.fn();
const mockPush = vi.fn();
const mockCreateItem = vi.fn();
const mockGetCategories = vi.fn();
const mockToastWarning = vi.fn();
const mockToastError = vi.fn();
const mockToastSuccess = vi.fn();

vi.mock('@/contexts/admin-permissions-context', () => ({
  useAdminPermissions: () => mockUseAdminPermissions(),
}));

vi.mock('@/lib/supabase/products-api', () => ({
  createItem: (...args: unknown[]) => mockCreateItem(...args),
  getCategories: (...args: unknown[]) => mockGetCategories(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: ReactNode }) =>
    createElement('a', { href }, children),
}));

vi.mock('lucide-react', () => {
  const Icon = () => createElement('span');
  return {
    ArrowLeft: Icon,
    Loader2: Icon,
    Save: Icon,
    ShieldAlert: Icon,
  };
});

vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: { children: ReactNode }) => createElement('div', {}, children),
  SelectContent: ({ children }: { children: ReactNode }) => createElement('div', {}, children),
  SelectItem: ({ children, value }: { children: ReactNode; value: string }) =>
    createElement('div', { 'data-value': value }, children),
  SelectTrigger: ({ children }: { children: ReactNode }) =>
    createElement('button', { type: 'button' }, children),
  SelectValue: ({ placeholder }: { placeholder?: string }) => createElement('span', {}, placeholder),
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ id, checked, onCheckedChange }: { id: string; checked: boolean; onCheckedChange: (value: boolean) => void }) =>
    createElement('input', {
      id,
      type: 'checkbox',
      checked,
      onChange: (event: Event) => onCheckedChange((event.target as HTMLInputElement).checked),
    }),
}));

vi.mock('@/components/admin/multi-image-upload', () => ({
  MultiImageUpload: () => createElement('div', { 'data-testid': 'mock-image-upload' }),
}));

vi.mock('sonner', () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
    success: (...args: unknown[]) => mockToastSuccess(...args),
    warning: (...args: unknown[]) => mockToastWarning(...args),
  },
}));

function setupAdminCreatePage() {
  mockUseAdminPermissions.mockReturnValue({ isAdmin: true, loading: false });
  mockGetCategories.mockResolvedValue([]);
  mockCreateItem.mockResolvedValue({
    success: true,
    item: { id: 'item-1', item_name: 'Café Especial' },
  });
}

describe('admin product pricing page clarity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupAdminCreatePage();
  });

  it('renders commercial price labels and guidance for current and comparison prices', async () => {
    render(<CreateProductPage />);

    expect(screen.getByLabelText(/precio de venta actual/i)).toBeInTheDocument();
    expect(screen.getByText(/precio que pagará el cliente/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/precio anterior \/ precio de comparación/i)).toBeInTheDocument();
    expect(screen.getByText(/se verá tachado como referencia/i)).toBeInTheDocument();
    await waitFor(() => expect(mockGetCategories).toHaveBeenCalledWith(true));
  });

  it('warns and omits compare_at_price when comparison is not greater than current price', async () => {
    render(<CreateProductPage />);

    fireEvent.change(screen.getByLabelText(/nombre del producto/i), {
      target: { value: 'Café Especial' },
    });
    fireEvent.change(screen.getByLabelText(/precio de venta actual/i), {
      target: { value: '72000' },
    });
    fireEvent.change(screen.getByLabelText(/precio anterior \/ precio de comparación/i), {
      target: { value: '70000' },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'El precio anterior debe ser mayor al precio de venta actual',
    );

    fireEvent.click(screen.getByRole('button', { name: /crear producto/i }));

    await waitFor(() => expect(mockCreateItem).toHaveBeenCalledTimes(1));
    expect(mockToastWarning).toHaveBeenCalledWith(
      'El precio anterior debe ser mayor al precio de venta actual para mostrar descuento. Se guardará sin precio tachado.',
    );
    expect(mockCreateItem).toHaveBeenCalledWith(
      expect.objectContaining({
        base_price: 72000,
        compare_at_price: undefined,
      }),
      [],
    );
  });
});
