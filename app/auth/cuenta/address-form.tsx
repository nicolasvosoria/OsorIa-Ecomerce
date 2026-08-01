"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/contexts/language-context";
import type { SavedAddress } from "@/lib/account/saved-address";
import { DEFAULT_ADDRESS_COUNTRY, type SavedAddressDraftInput } from "@/lib/account/schemas";
import { createSavedAddress, updateSavedAddress } from "./actions";
import { useAccountMutation } from "./use-account-mutation";

// `editing` en null es el alta: el mismo formulario sirve para las dos porque
// los campos que la persona escribe son exactamente los mismos.
export function AddressForm({
  editing,
  onClose,
}: {
  editing: SavedAddress | null;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const [fields, setFields] = useState<SavedAddressDraftInput>(() => toEditableFields(editing));
  const [addressLineError, setAddressLineError] = useState<string | undefined>(undefined);
  const { isPending, runMutation } = useAccountMutation();

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!fields.addressLine1.trim()) {
      setAddressLineError(t.account.addressLineRequired);
      return;
    }

    setAddressLineError(undefined);
    runMutation(
      () =>
        editing
          ? updateSavedAddress({ addressId: editing.id, draft: fields })
          : createSavedAddress(fields),
      () => {
        toast.success(t.account.addressSaved);
        onClose();
      },
    );
  };

  const editField =
    (field: keyof SavedAddressDraftInput) => (event: React.ChangeEvent<HTMLInputElement>) =>
      setFields((current) => ({ ...current, [field]: event.target.value }));

  // Sin `required` nativo a propósito, igual que el cambio de contraseña: el
  // navegador redacta ese aviso en su idioma y aquí la interfaz habla el del
  // producto.
  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="font-medium">{editing ? t.account.editAddress : t.account.newAddress}</p>
      <FormField
        id="address-nickname"
        label={t.account.addressNickname}
        hint={t.account.addressNicknameHint}
      >
        {(field) => (
          <Input {...field} value={fields.label} onChange={editField("label")} />
        )}
      </FormField>
      <FormField id="address-line" label={t.checkout.address} error={addressLineError}>
        {(field) => (
          <Input
            {...field}
            autoComplete="street-address"
            value={fields.addressLine1}
            onChange={editField("addressLine1")}
          />
        )}
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="address-city" label={t.checkout.city}>
          {(field) => (
            <Input
              {...field}
              autoComplete="address-level2"
              value={fields.city}
              onChange={editField("city")}
            />
          )}
        </FormField>
        <FormField id="address-postal-code" label={t.checkout.postalCode}>
          {(field) => (
            <Input
              {...field}
              autoComplete="postal-code"
              value={fields.postalCode}
              onChange={editField("postalCode")}
            />
          )}
        </FormField>
      </div>
      <FormField id="address-country" label={t.checkout.country}>
        {(field) => (
          <Input
            {...field}
            autoComplete="country-name"
            value={fields.country}
            onChange={editField("country")}
          />
        )}
      </FormField>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t.passwordReset.updating}
            </>
          ) : (
            t.common.save
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
          {t.common.cancel}
        </Button>
      </div>
    </form>
  );
}

function toEditableFields(editing: SavedAddress | null): SavedAddressDraftInput {
  return {
    label: editing?.label ?? "",
    addressLine1: editing?.addressLine1 ?? "",
    city: editing?.city ?? "",
    postalCode: editing?.postalCode ?? "",
    country: editing?.country ?? DEFAULT_ADDRESS_COUNTRY,
  };
}
