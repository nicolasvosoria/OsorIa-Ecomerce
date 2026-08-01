"use client";

import { useState } from "react";
import { MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { useLanguage } from "@/contexts/language-context";
import { formatSavedAddressLine, type SavedAddress } from "@/lib/account/saved-address";
import { deleteSavedAddress, setDefaultSavedAddress } from "./actions";
import { AddressForm } from "./address-form";
import { useAccountMutation } from "./use-account-mutation";

type AddressBookMode =
  | { kind: "list" }
  | { kind: "creating" }
  | { kind: "editing"; addressId: string };

export function AddressBook({ addresses }: { addresses: SavedAddress[] }) {
  const [mode, setMode] = useState<AddressBookMode>({ kind: "list" });
  const closeForm = () => setMode({ kind: "list" });
  const startCreating = () => setMode({ kind: "creating" });

  if (mode.kind === "creating") {
    return <AddressForm editing={null} onClose={closeForm} />;
  }

  const editing =
    mode.kind === "editing" ? addresses.find((address) => address.id === mode.addressId) : undefined;
  if (editing) {
    return <AddressForm editing={editing} onClose={closeForm} />;
  }

  if (addresses.length === 0) {
    return <AddressBookEmptyState onAdd={startCreating} />;
  }

  return (
    <AddressList
      addresses={addresses}
      onAdd={startCreating}
      onEdit={(addressId) => setMode({ kind: "editing", addressId })}
    />
  );
}

// Nadie llega aquí por un fallo: quien entra por primera vez todavía no tiene
// ninguna dirección, así que el estado vacío explica qué gana al guardarla.
function AddressBookEmptyState({ onAdd }: { onAdd: () => void }) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <MapPin className="h-10 w-10 text-muted-foreground" />
      <p className="font-medium">{t.account.addressesEmptyTitle}</p>
      <p className="max-w-sm text-sm text-muted-foreground">
        {t.account.addressesEmptyDescription}
      </p>
      <Button onClick={onAdd}>
        <Plus className="h-4 w-4" />
        {t.account.addAddress}
      </Button>
    </div>
  );
}

function AddressList({
  addresses,
  onAdd,
  onEdit,
}: {
  addresses: SavedAddress[];
  onAdd: () => void;
  onEdit: (addressId: string) => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="space-y-4">
      <ul className="space-y-3">
        {addresses.map((address) => (
          <AddressRow
            key={address.id}
            address={address}
            defaultSuccessor={findDefaultSuccessor(addresses, address)}
            onEdit={() => onEdit(address.id)}
          />
        ))}
      </ul>
      <Button variant="outline" onClick={onAdd} className="w-full sm:w-auto">
        <Plus className="h-4 w-4" />
        {t.account.addAddress}
      </Button>
    </div>
  );
}

// Borrar la predeterminada no deja a la persona sin ninguna: el backend asciende
// a la más reciente de las que quedan, y la lista llega ordenada por
// predeterminada y luego por fecha, así que esa es la primera que sobrevive.
// Quien borra tiene que saberlo antes, no descubrirlo en su siguiente checkout.
function findDefaultSuccessor(
  addresses: SavedAddress[],
  deleted: SavedAddress,
): SavedAddress | null {
  if (!deleted.isDefault) {
    return null;
  }

  return addresses.find((address) => address.id !== deleted.id) ?? null;
}

function AddressRow({
  address,
  defaultSuccessor,
  onEdit,
}: {
  address: SavedAddress;
  defaultSuccessor: SavedAddress | null;
  onEdit: () => void;
}) {
  const { t } = useLanguage();
  const { isPending, runMutation } = useAccountMutation();
  const addressName = address.label ?? t.account.unlabeledAddress;

  const makeDefault = () =>
    runMutation(
      () => setDefaultSavedAddress({ addressId: address.id }),
      () => toast.success(t.account.defaultAddressChanged),
    );

  return (
    <li className="flex flex-col gap-3 rounded-md border p-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium">{addressName}</p>
          {address.isDefault ? (
            <Badge variant="secondary">{t.account.defaultAddress}</Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">{formatSavedAddressLine(address)}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {address.isDefault ? null : (
          <Button variant="outline" onClick={makeDefault} disabled={isPending}>
            {t.account.makeDefault}
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          aria-label={t.account.editAddressNamed.replace("{name}", addressName)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <DeleteAddressButton
          address={address}
          addressName={addressName}
          defaultSuccessor={defaultSuccessor}
        />
      </div>
    </li>
  );
}

function DeleteAddressButton({
  address,
  addressName,
  defaultSuccessor,
}: {
  address: SavedAddress;
  addressName: string;
  defaultSuccessor: SavedAddress | null;
}) {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const { isPending, runMutation } = useAccountMutation();

  // La sucesora no tiene título donde identificarse y dos direcciones sin apodo
  // se llaman igual, así que se nombra con su línea completa al lado.
  const namedSuccessor = defaultSuccessor
    ? `${defaultSuccessor.label ?? t.account.unlabeledAddress} (${formatSavedAddressLine(defaultSuccessor)})`
    : null;
  const addressLine = formatSavedAddressLine(address);
  const description = namedSuccessor
    ? t.account.deleteDefaultAddressDescription
        .replace("{address}", addressLine)
        .replace("{successor}", namedSuccessor)
    : t.account.deleteAddressDescription.replace("{address}", addressLine);

  const confirmDelete = () =>
    runMutation(
      () => deleteSavedAddress({ addressId: address.id }),
      () => {
        toast.success(
          namedSuccessor
            ? t.account.defaultAddressDeleted.replace("{successor}", namedSuccessor)
            : t.account.addressDeleted,
        );
        setIsOpen(false);
      },
    );

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-destructive hover:text-destructive"
          aria-label={t.account.deleteAddressNamed.replace("{name}", addressName)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t.account.deleteAddressTitleNamed.replace("{name}", addressName)}
          </AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{t.common.cancel}</AlertDialogCancel>
          {/* Borrar es irreversible: el botón que lo confirma no puede pintarse
              del color de marca de la tienda, que en muchas es verde. */}
          <AlertDialogAction
            className={buttonVariants({ variant: "destructive" })}
            onClick={(event) => {
              event.preventDefault();
              confirmDelete();
            }}
            disabled={isPending}
          >
            {t.common.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
