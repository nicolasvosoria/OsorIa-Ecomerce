/* eslint-disable @next/next/no-img-element, jsx-a11y/alt-text -- Test-only next/image mock renders a native img. */
import React from "react"
import { vi } from "vitest"

// Mocks compartidos por las suites de tests/components/header-*.test.tsx que renderizan
// <Header />. Cada suite conserva sus propios vi.mock(...) para los módulos cuyo
// comportamiento simulado difiere entre pruebas (navigation, styles-context, auth-context,
// language-context) y para los mocks que sólo una suite necesita.

export const nextImageMock = {
  default: ({ priority: _priority, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { priority?: boolean }) => <img {...props} />,
}

export const nextLinkMock = {
  default: ({ children, href, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
}

export const lucideReactMock = {
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
  X: () => <span aria-hidden="true" />,
  Sun: () => <span aria-hidden="true" />,
  Moon: () => <span aria-hidden="true" />,
}

export const uiButtonMock = {
  Button: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
}

export const uiInputMock = {
  Input: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}

export const uiSheetMock = {
  Sheet: ({ children }: React.PropsWithChildren) => <>{children}</>,
  SheetContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SheetHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  SheetTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
}

export const uiDialogMock = {
  Dialog: ({ children, open }: React.PropsWithChildren<{ open?: boolean }>) => open ? <div role="dialog">{children}</div> : null,
  DialogContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogDescription: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
  DialogHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DialogTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
}

export const uiAlertDialogMock = {
  AlertDialog: ({ children }: React.PropsWithChildren) => <>{children}</>,
  AlertDialogAction: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  AlertDialogCancel: ({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) => <button {...props}>{children}</button>,
  AlertDialogContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  AlertDialogDescription: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
  AlertDialogFooter: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  AlertDialogHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  AlertDialogTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
}

export const uiDropdownMenuMock = {
  DropdownMenu: ({ children }: React.PropsWithChildren) => <>{children}</>,
  DropdownMenuContent: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuItem: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => <div {...props}>{children}</div>,
  DropdownMenuLabel: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: React.PropsWithChildren) => <>{children}</>,
}

export const themeContextMock = { useTheme: () => ({ activeTheme: null }) }
export const modeContextMock = {
  useMode: () => ({ mode: "light", isDark: false, setMode: vi.fn() }),
}
export const storeContextMock = { useStore: () => ({ store: null }) }
export const cartContextMock = {
  useCart: () => ({
    items: [],
    removeFromCart: vi.fn(),
    updateQuantity: vi.fn(),
    getTotal: () => 0,
    getItemSubtotal: () => 0,
    getTotalItems: () => 0,
  }),
}
export const wishlistContextMock = { useWishlist: () => ({ getTotalItems: () => 0 }) }

export const themeSelectorModalMock = { ThemeSelectorModal: () => null }
export const fontSelectorModalMock = { FontSelectorModal: () => null }
export const checkoutOptionsDialogMock = { CheckoutOptionsDialog: () => null }
export const sonnerMock = { toast: { success: vi.fn(), error: vi.fn() } }
export const authApiMock = { resetPassword: vi.fn() }
