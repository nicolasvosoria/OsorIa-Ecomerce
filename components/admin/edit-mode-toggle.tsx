"use client"

import { useAdmin } from "@/contexts/admin-context"
import { Button } from "@/components/ui/button"
import { Edit, X } from "lucide-react"

export function EditModeToggle() {
  const { isAdmin, isEditMode, toggleEditMode } = useAdmin()

  if (!isAdmin) {
    return null
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={toggleEditMode}
        size="lg"
        className={`shadow-lg ${
          isEditMode
            ? "bg-red-600 hover:bg-red-700 text-white"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {isEditMode ? (
          <>
            <X className="h-4 w-4 mr-2" />
            Salir de Edición
          </>
        ) : (
          <>
            <Edit className="h-4 w-4 mr-2" />
            Modo Edición
          </>
        )}
      </Button>
    </div>
  )
}

