import type React from "react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  description: "Panel de administración para gestionar estilos del sitio web",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
