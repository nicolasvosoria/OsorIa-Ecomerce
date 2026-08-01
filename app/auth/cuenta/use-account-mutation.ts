"use client";

import { useTransition } from "react";
import { toast } from "sonner";

import { useLanguage } from "@/contexts/language-context";
import type { AccountActionResult } from "./actions";

// Todas las escrituras de la cuenta fracasan igual: un toast que nombra el
// motivo concreto que devolvió la action, nunca un "algo salió mal".
export function useAccountMutation() {
  const { t } = useLanguage();
  const [isPending, startTransition] = useTransition();

  const runMutation = (mutate: () => Promise<AccountActionResult>, onSuccess: () => void) => {
    startTransition(async () => {
      const result = await mutate();
      if (!result.success) {
        toast.error(t.account.saveFailed, { description: result.error, duration: 5000 });
        return;
      }

      onSuccess();
    });
  };

  return { isPending, runMutation };
}
