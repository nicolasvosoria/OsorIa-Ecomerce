import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  adminPermissionsContextMock,
  authApiMock,
  cartContextMock,
  checkoutOptionsDialogMock,
  fontSelectorModalMock,
  lucideReactMock,
  modeContextMock,
  nextImageMock,
  nextLinkMock,
  sonnerMock,
  storeContextMock,
  themeContextMock,
  themeSelectorModalMock,
  uiAlertDialogMock,
  uiButtonMock,
  uiDialogMock,
  uiDropdownMenuMock,
  uiInputMock,
  uiSheetMock,
  wishlistContextMock,
} from "./_helpers/header-test-mocks";

const routerPush = vi.hoisted(() => vi.fn());
const searchParamsGet = vi.hoisted(() => vi.fn());
const loginMock = vi.hoisted(() => vi.fn());
const refreshUserMock = vi.hoisted(() => vi.fn());
const isCurrentUserAdminOrUnverifiedMock = vi.hoisted(() => vi.fn());
const currentUserMustChangePasswordMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: routerPush }),
  usePathname: () => "/",
  useSearchParams: () => ({ get: searchParamsGet }),
}));

vi.mock("next/image", () => nextImageMock);
vi.mock("next/link", () => nextLinkMock);

vi.mock("lucide-react", () => lucideReactMock);

vi.mock("@/components/ui/button", () => uiButtonMock);
vi.mock("@/components/ui/input", () => uiInputMock);
vi.mock("@/components/ui/sheet", () => uiSheetMock);
vi.mock("@/components/ui/dialog", () => uiDialogMock);
vi.mock("@/components/ui/alert-dialog", () => uiAlertDialogMock);
vi.mock("@/components/ui/dropdown-menu", () => uiDropdownMenuMock);

vi.mock("@/contexts/styles-context", () => ({ useComponentStyle: (_name: string, defaults: Record<string, string>) => ({ styles: defaults }) }));
vi.mock("@/contexts/theme-context", () => themeContextMock);
vi.mock("@/contexts/mode-context", () => modeContextMock);
vi.mock("@/contexts/store-context", () => storeContextMock);
vi.mock("@/contexts/cart-context", () => cartContextMock);
vi.mock("@/contexts/wishlist-context", () => wishlistContextMock);
vi.mock("@/contexts/admin-permissions-context", () => adminPermissionsContextMock);
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
vi.mock("@/components/theme/theme-selector-modal", () => themeSelectorModalMock);
vi.mock("@/components/font/font-selector-modal", () => fontSelectorModalMock);
vi.mock("@/components/cart/checkout-options-dialog", () => checkoutOptionsDialogMock);
vi.mock("sonner", () => sonnerMock);
vi.mock("@/lib/supabase/auth-api", () => authApiMock);
vi.mock("@/lib/supabase/permissions-api", () => ({
  isCurrentUserAdminOrUnverified: isCurrentUserAdminOrUnverifiedMock,
  currentUserMustChangePassword: currentUserMustChangePasswordMock,
}));

import { Header } from "@/components/layout/header";

async function submitLogin(email: string) {
  fireEvent.change(await screen.findByPlaceholderText("tu@email.com"), { target: { value: email } });
  fireEvent.change(screen.getByPlaceholderText("••••••••"), { target: { value: "secret123" } });
  fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
}

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
    isCurrentUserAdminOrUnverifiedMock.mockResolvedValue(true);
    currentUserMustChangePasswordMock.mockResolvedValue(false);
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

    await submitLogin("admin@example.com");

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/admin/orders");
    });
    expect(routerPush).toHaveBeenCalledTimes(1);
  });

  it("routes a super_admin login to the safe next path once", async () => {
    loginMock.mockResolvedValue({ success: true, user: { id: "super-admin-1", email: "superadmin@example.com", role: "super_admin" } });
    render(<Header />);

    await submitLogin("superadmin@example.com");

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/admin/orders");
    });
    expect(routerPush).toHaveBeenCalledTimes(1);
  });

  it("routes a store owner whose global role is 'user' to the safe next path", async () => {
    loginMock.mockResolvedValue({ success: true, user: { id: "store-owner-1", email: "gerardo@example.com", role: "user" } });
    isCurrentUserAdminOrUnverifiedMock.mockResolvedValue(true);
    render(<Header />);

    await submitLogin("gerardo@example.com");

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/admin/orders");
    });
    expect(routerPush).not.toHaveBeenCalledWith("/?admin_access=denied");
  });

  it("does not route a 'user' that manages no store into the admin next path", async () => {
    loginMock.mockResolvedValue({ success: true, user: { id: "user-1", email: "user@example.com", role: "user" } });
    isCurrentUserAdminOrUnverifiedMock.mockResolvedValue(false);
    render(<Header />);

    await submitLogin("user@example.com");

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/?admin_access=denied");
    });
    expect(routerPush).not.toHaveBeenCalledWith("/admin/orders");
  });

  it("forces a minted owner with a temporary password to the change screen before the next path", async () => {
    loginMock.mockResolvedValue({ success: true, user: { id: "store-owner-1", email: "gerardo@example.com", role: "user" } });
    currentUserMustChangePasswordMock.mockResolvedValue(true);
    render(<Header />);

    await submitLogin("gerardo@example.com");

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/auth/force-password-change");
    });
    expect(routerPush).not.toHaveBeenCalledWith("/admin/orders");
  });

  it("finishes the login handler cleanly when the admin check is unverified", async () => {
    loginMock.mockResolvedValue({ success: true, user: { id: "store-owner-1", email: "gerardo@example.com", role: "user" } });
    isCurrentUserAdminOrUnverifiedMock.mockResolvedValue(true);
    render(<Header />);

    await submitLogin("gerardo@example.com");

    await waitFor(() => {
      expect(routerPush).toHaveBeenCalledWith("/admin/orders");
    });
    expect(sonnerMock.toast.success).toHaveBeenCalledWith("Sesión iniciada", expect.objectContaining({ description: "Admin listo" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });
});
