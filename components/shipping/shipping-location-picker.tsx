"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useLanguage } from "@/contexts/language-context"
import {
  listDepartments,
  listMunicipalitiesByDepartment,
  type Department,
  type Municipality,
} from "@/lib/shipping/locations-api"

// D28: los dos selects encadenados (departamento, luego municipio filtrado a
// ese departamento) que el checkout de invitado, el de usuario autenticado y
// la libreta de direcciones (D24) usan por igual -- tres llamadores reales,
// un solo lugar que sabe pedir departamentos y municipios. No es un
// Controller de react-hook-form porque uno de los tres (la libreta) no usa
// react-hook-form: en vez de eso es un componente controlado plano, para que
// cada formulario lo conecte a su propio estado sin acoplar este componente
// a una librería de formularios concreta.
export type ShippingLocationValue = {
  departmentCode: string
  departmentName: string
  municipalityCode: string
  municipalityId: string
  municipalityName: string
}

const EMPTY_SHIPPING_LOCATION: ShippingLocationValue = {
  departmentCode: "",
  departmentName: "",
  municipalityCode: "",
  municipalityId: "",
  municipalityName: "",
}

export function ShippingLocationPicker({
  value,
  onChange,
  departmentError,
  municipalityError,
  disabled = false,
}: {
  value: ShippingLocationValue
  onChange: (next: ShippingLocationValue) => void
  departmentError?: string
  municipalityError?: string
  disabled?: boolean
}) {
  const { t } = useLanguage()
  const [departments, setDepartments] = useState<Department[]>([])
  const [municipalities, setMunicipalities] = useState<Municipality[]>([])
  // Qué departamento describe la lista de municipios que hay en estado ahora
  // mismo -- nunca se marca "cargando" con un setState síncrono al entrar al
  // efecto; se deriva comparando este valor contra value.departmentCode, y
  // solo se actualiza dentro del callback async cuando la respuesta llega
  // (con éxito o con error: ambos casos cierran el intento).
  const [municipalitiesLoadedFor, setMunicipalitiesLoadedFor] = useState<string | null>(null)
  // listDepartments y listMunicipalitiesByDepartment (lib/shipping/locations-api.ts)
  // rechazan tanto en un error de Supabase como en el timeout de
  // lib/supabase/with-timeout.ts -- ningún rechazo puede dejar el select de
  // departamento vacío sin aviso, ni a isLoadingMunicipalities encendido para
  // siempre. Los dos efectos de abajo convierten un rechazo en un estado
  // honesto -- un mensaje y un botón para reintentar.
  const [departmentsError, setDepartmentsError] = useState(false)
  const [departmentsAttempt, setDepartmentsAttempt] = useState(0)
  const [municipalitiesError, setMunicipalitiesError] = useState(false)
  const [municipalitiesAttempt, setMunicipalitiesAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    listDepartments()
      .then((result) => {
        if (!cancelled) setDepartments(result)
      })
      .catch(() => {
        if (!cancelled) setDepartmentsError(true)
      })
    return () => {
      cancelled = true
    }
  }, [departmentsAttempt])

  // D28's segundo select encadenado: se vuelve a pedir cada vez que cambia el
  // departamento, filtrado a ese departamento -- nunca los 1.122 municipios
  // de una sola vez. Sin departamento no hay nada que pedir: el efecto no
  // corre, y el render de abajo (municipalityOptions) descarta cualquier
  // lista de un departamento anterior en vez de limpiarla con un setState.
  useEffect(() => {
    if (!value.departmentCode) {
      return
    }

    let cancelled = false
    listMunicipalitiesByDepartment(value.departmentCode)
      .then((result) => {
        if (cancelled) return
        setMunicipalities(result)
      })
      .catch(() => {
        if (!cancelled) setMunicipalitiesError(true)
      })
      .finally(() => {
        // Cierra el intento tanto en éxito como en error -- de lo contrario
        // isLoadingMunicipalities, que solo compara este valor contra
        // value.departmentCode, se queda en "cargando" para siempre.
        if (!cancelled) setMunicipalitiesLoadedFor(value.departmentCode)
      })

    return () => {
      cancelled = true
    }
  }, [value.departmentCode, municipalitiesAttempt])

  const municipalityOptions = value.departmentCode ? municipalities : []
  const isLoadingMunicipalities =
    Boolean(value.departmentCode) && municipalitiesLoadedFor !== value.departmentCode && !municipalitiesError

  const selectDepartment = (code: string) => {
    const department = departments.find((candidate) => candidate.code === code)
    // Cambiar de departamento vacía el municipio elegido: uno de otro
    // departamento ya no es una opción válida. También limpia un error de
    // municipios que quedó del departamento anterior -- este es otro.
    setMunicipalitiesError(false)
    onChange({ ...EMPTY_SHIPPING_LOCATION, departmentCode: code, departmentName: department?.name ?? "" })
  }

  const retryDepartments = () => {
    setDepartmentsError(false)
    setDepartmentsAttempt((count) => count + 1)
  }

  const retryMunicipalities = () => {
    setMunicipalitiesError(false)
    setMunicipalitiesLoadedFor(null)
    setMunicipalitiesAttempt((count) => count + 1)
  }

  const selectMunicipality = (id: string) => {
    const municipality = municipalities.find((candidate) => String(candidate.id) === id)
    if (!municipality) return

    onChange({
      departmentCode: municipality.departmentCode,
      departmentName: municipality.departmentName,
      municipalityCode: municipality.code,
      municipalityId: id,
      municipalityName: municipality.name,
    })
  }

  const municipalityPlaceholder = !value.departmentCode
    ? t.checkout.selectDepartmentFirst
    : isLoadingMunicipalities
      ? t.common.loading
      : t.checkout.selectMunicipality

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField
        id="shipping-department"
        label={t.checkout.department}
        labelAdornment={
          departmentsError ? (
            <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={retryDepartments}>
              {t.common.retry}
            </Button>
          ) : undefined
        }
        error={departmentsError ? t.checkout.departmentsLoadError : departmentError}
      >
        {(fieldProps) => (
          <Select
            value={value.departmentCode || undefined}
            onValueChange={selectDepartment}
            disabled={disabled || departmentsError}
          >
            <SelectTrigger {...fieldProps} className="w-full">
              <SelectValue placeholder={t.checkout.selectDepartment} />
            </SelectTrigger>
            <SelectContent>
              {departments.map((department) => (
                <SelectItem key={department.code} value={department.code}>
                  {department.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>

      <FormField
        id="shipping-municipality"
        label={t.checkout.municipality}
        labelAdornment={
          municipalitiesError ? (
            <Button type="button" variant="link" size="sm" className="h-auto p-0" onClick={retryMunicipalities}>
              {t.common.retry}
            </Button>
          ) : undefined
        }
        error={municipalitiesError ? t.checkout.municipalitiesLoadError : municipalityError}
      >
        {(fieldProps) => (
          <Select
            value={value.municipalityId || undefined}
            onValueChange={selectMunicipality}
            disabled={disabled || !value.departmentCode || isLoadingMunicipalities || municipalitiesError}
          >
            <SelectTrigger {...fieldProps} className="w-full">
              <SelectValue placeholder={municipalityPlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {municipalityOptions.map((municipality) => (
                <SelectItem key={municipality.id} value={String(municipality.id)}>
                  {municipality.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </FormField>
    </div>
  )
}
