"use client"

import { useState } from "react"
import { UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { AddMemberForm } from "./add-member-form"

export function AddMemberDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="shrink-0 gap-1.5 sm:gap-2">
          <UserPlus className="h-4 w-4 shrink-0" />
          <span className="hidden sm:inline">Agregar miembro</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="editor-chrome">
        <DialogHeader>
          <DialogTitle>Agregar miembro</DialogTitle>
          <DialogDescription>
            Da acceso a esta tienda. Si el correo no tiene cuenta, se creará una invitación.
          </DialogDescription>
        </DialogHeader>
        <AddMemberForm onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
