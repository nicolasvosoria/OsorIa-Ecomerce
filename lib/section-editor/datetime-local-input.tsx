"use client";

import { useEffect, useState } from "react";

// Input datetime-local que impide elegir una fecha/hora anterior a la actual.
// El `min` arranca vacío para que el primer render coincida server/cliente
// (evita mismatch de hidratación) y se completa con la hora local al montar.
export function DatetimeLocalInput({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [min, setMin] = useState("");

  useEffect(() => {
    // Diferido a un tick para no llamar setState en el cuerpo del effect
    // (react-hooks/set-state-in-effect), igual que el reloj del countdown.
    const timeoutId = setTimeout(() => {
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      setMin(
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`,
      );
    }, 0);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <input
      id={id}
      type="datetime-local"
      value={value}
      min={min || undefined}
      onChange={(e) => onChange(e.target.value)}
      className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
    />
  );
}
