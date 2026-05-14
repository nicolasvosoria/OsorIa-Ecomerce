/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- Test-only next/image mock renders a native img. */
import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const routerPush = vi.hoisted(() => vi.fn());
const searchParamsGet = vi.hoisted(() => vi.fn());
const loginMock = vi.hoisted(() => vi.fn());
const refreshUserMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
  usePathname: () => "/",
  useSearchParams: () => ({ get: searchParamsGet }),
}));

vi.mock("next/image", () => ({ default: ({ priority: _priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => <img {...props} /> }));
vi.mock("next/link", () => ({ default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a> }));

vi.mock("lucide-react", () => ({
  Search: () => <span aria-hidden="true" />,
  Heart: () => <span aria-hidden="true" />,
  ShoppingCart: () => <span aria-hidden="true" />,
  Palette: () => <span aria-hidden="true" />,
  AlignLeft: () => <span aria-hidden="true" />,
  Menu: () => <span aria-hidden="true" />,
  LogIn: () => <span aria-hidden="true" />,
  LogOut: () => <span aria-hidden="true" />,
  User: () => <span aria-hidden="true" />,
  Eye: () => <span aria-hidden="true" />,
  EyeOff: () => <span aria-hidden="true" />,
  CreditCard: () => <span aria-hidden="true" />,
  Building2: () => <span aria-hidden="true" />,
  Wallet: () => <span aria-hidden="true" />,
  LayoutDashboard: () => <span aria-hidden="true" />,
  Edit: () => <span aria-hidden="true" />,
  Trash2: () => <span aria-hidden="true" />,
  Plus: () => <span aria-hidden="true" />,
  Minus: () => <span aria-hidden="true" />,
}));

vi.mock("@/components/ui/button", () => ({ Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button> }));
vi.mock("@/components/ui/input", () => ({ Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} /> }));
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({ children }: React.PropsWithChildren) => <>{children}</>,
  SheetContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SheetHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SheetTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: React.PropsWithChildren<{ open?: boolean }>) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogDescription: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
  DialogHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
}));
vi.mock("@/components/ui/alert-dialog", () => ({
  AlertDialog: ({ children }: React.PropsWithChildren) => <>{children}</>,
  AlertDialogAction: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  AlertDialogCancel: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  AlertDialogContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
}));
vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: React.PropsWithChildren) => <>{children}</>,
  DropdownMenuContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuItem: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  DropdownMenuLabel: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock("@/contexts/styles-context", () => ({ useComponentStyle: (_name: string, defaults: Record<string, string>) => ({ styles: defaults }) }));
vi.mock("@/contexts/theme-context", () => ({ useTheme: () => ({ activeTheme: null }) }));
vi.mock("@/contexts/store-context", () => ({ useStore: () => ({ store: null }) }));
vi.mock("@/contexts/cart-context", () => ({ useCart: () => ({ items: [], removeFromCart: vi.fn(), updateQuantity: vi.fn(), getTotal: () => 0, getItemSubtotal: () => 0, getTotalItems: () => 0 }) }));
vi.mock("@/contexts/wishlist-context", () => ({ useWishlist: () => ({ getTotalItems: () => 0 }) }));
vi.mock("@/contexts/auth-context", () => ({ useAuth: () => ({ user: null, isAuthenticated: false, login: loginMock, register: vi.fn(), logout: vi.fn(), refreshUser: refreshUserMock }) }));
vi.mock("@/contexts/language-context", () => ({
  useLanguage: () => ({
    t: {
      auth: { login: "Iniciar sesión", createAccount: "Crear cuenta", signIn: "Entrar" },
      header: {
        sessionStarted: "Sesión iniciada",
        welcomeAdminLogin: "Admin listo",
        errorLoggingIn: "Error al iniciar sesión",
        passwordsDoNotMatch: "Las contraseñas no coinciden",
        passwordsDoNotMatchDescription: "Revisa las contraseñas",
        confirmEmailSent: "Confirma tu correo",
        confirmEmailDescription: "Te enviamos un correo",
        accountCreated: "Cuenta creada",
        welcomeAdminMessage: "Admin creado",
        accountCreatedSuccess: "Cuenta creada",
        errorCreatingAccount: "Error al crear cuenta",
        loginRequired: "Login requerido",
        loginRequiredDescription: "Debes iniciar sesión",
        loginRequiredDescription2: "Continúa para comprar",
      },
      cart: { checkout: "Checkout" },
      nav: { wishlist: "Wishlist", cart: "Cart" },
    },
  }),
}));
vi.mock("@/components/theme/theme-selector-modal", () => ({ ThemeSelectorModal: () => null }));
vi.mock("@/components/font/font-selector-modal", () => ({ FontSelectorModal: () => null }));
vi.mock("@/components/cart/checkout-options-dialog", () => ({ CheckoutOptionsDialog: () => null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/supabase/auth-api", () => ({ resetPassword: vi.fn() }));

import { Header } from "@/components/layout/header";

describe("Header login return intent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    searchParamsGet.mockImplementation((key: string) => {
      const values: Record<string, string | null> = { auth: "login", next: "/admin/orders" };
      return values[key] ?? null;
    });
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify([]), { status: 200 })));
    loginMock.mockResolvedValue({ success: true, user: { id: "admin-1", email: "admin@example.com", role: "admin" } });
    refreshUserMock.mockResolvedValue(undefined);
  });

  it("opens the login modal once for a safe admin return intent query", async () => {
    const { rerender } = render(<Header />);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Iniciar sesión" })).toBeInTheDocument();

    rerender(<Header />);

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("routes an admin login to the safe next path once", async () => {
    render(<Header />);

    fireEvent.change(await screen.findByPlaceholderText("tu@email.com"), { target: { value: "admin@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/admin/orders");
    });
    expect(routerPush).toHaveBeenCalledTimes(1);
  });

  it("does not route a non-admin login into the admin next path", async () => {
    loginMock.mockResolvedValue({ success: true, user: { id: "user-1", email: "user@example.com", role: "user" } });
    render(<Header />);

    fireEvent.change(await screen.findByPlaceholderText("tu@email.com"), { target: { value: "user@example.com" } });
    fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "secret123" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/?admin_access=denied");
    });
    expect(routerPush).not.toHaveBeenCalledWith("/admin/orders");
  });
});
