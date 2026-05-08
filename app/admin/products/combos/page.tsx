"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, PackageCheck, Save } from "lucide-react"
import { toast } from "sonner"

import { useAdminPermissions } from "@/contexts/admin-permissions-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { createCombo, listCombos, updateCombo } from "@/lib/supabase/combos-api"
import { getCategories, getItemById, getItems } from "@/lib/supabase/products-api"
import { uploadImage, deleteImage } from "@/lib/supabase/storage-api"
import { cleanupDeferredUploadedImage, resolveDeferredImageUpload } from "@/lib/products/deferred-image-upload"
import { formatPrice } from "@/lib/shopify/utils"
import { DeferredImageUpload } from "../components/deferred-image-upload"
import type { ComboCatalogDetails, ComboDiscountType } from "@/lib/combos/types"
import type { ItemCategory, StoreItemWithDetails } from "@/lib/types/products"

type ComponentDraft = {
  product_id: string
  variant_id: string
  quantity: string
}

type ComboFormState = {
  id?: string
  name: string
  slug: string
  category_id: string
  description: string
  image_url: string
  is_active: boolean
  discount_type: ComboDiscountType
  discount_value: string
  components: ComponentDraft[]
}

const emptyForm: ComboFormState = {
  name: "",
  slug: "",
  category_id: "",
  description: "",
  image_url: "",
  is_active: true,
  discount_type: "percentage",
  discount_value: "0",
  components: [
    { product_id: "", variant_id: "", quantity: "1" },
    { product_id: "", variant_id: "", quantity: "1" },
  ],
}

function componentKey(component: ComponentDraft) {
  return `${component.product_id}:${component.variant_id || "base"}`
}

export default function AdminCombosPage() {
  const { isAdmin, loading } = useAdminPermissions()
  const router = useRouter()
  const [combos, setCombos] = useState<ComboCatalogDetails[]>([])
  const [products, setProducts] = useState<StoreItemWithDetails[]>([])
  const [categories, setCategories] = useState<ItemCategory[]>([])
  const [form, setForm] = useState<ComboFormState>(emptyForm)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    if (!loading && !isAdmin) router.push("/")
  }, [isAdmin, loading, router])

  const loadData = useCallback(async () => {
    if (!isAdmin) return
    setIsLoadingData(true)
    try {
      const [comboRows, productRows, categoryRows] = await Promise.all([
        listCombos({ includeInactive: true }),
        getItems({ limit: 100, item_kind: "products", is_active: true, is_available_for_sale: true }),
        getCategories(false),
      ])

      const productsWithVariants = await Promise.all(
        productRows.items.map(async (product) => (await getItemById(product.id)) || product),
      )

      setCombos(comboRows)
      setProducts(productsWithVariants)
      setCategories(categoryRows)
    } catch (error) {
      console.error("[Admin Combos] Error cargando combos:", error)
      toast.error("Error al cargar combos")
    } finally {
      setIsLoadingData(false)
    }
  }, [isAdmin])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData()
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [loadData])

  const selectedProductById = useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products],
  )

  const updateComponent = (index: number, next: Partial<ComponentDraft>) => {
    setForm((current) => ({
      ...current,
      components: current.components.map((component, componentIndex) =>
        componentIndex === index ? { ...component, ...next } : component,
      ),
    }))
  }

  const startEdit = (combo: ComboCatalogDetails) => {
    setSelectedImageFile(null)
    setForm({
      id: combo.id,
      name: combo.name,
      slug: combo.slug || "",
      category_id: combo.categoryId || "",
      description: combo.description || "",
      image_url: combo.imageUrl || "",
      is_active: combo.isActive,
      discount_type: combo.pricing.discountType,
      discount_value: combo.pricing.discountValue.toString(),
      components: combo.components.map((component) => ({
        product_id: component.productId,
        variant_id: component.variantId || "",
        quantity: component.quantity.toString(),
      })),
    })
  }

  const resetForm = () => {
    setSelectedImageFile(null)
    setForm(emptyForm)
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!form.name.trim()) {
      toast.error("El nombre del combo es requerido")
      return
    }

    const components = form.components
      .filter((component) => component.product_id)
      .map((component, index) => ({
        product_id: component.product_id,
        variant_id: component.variant_id || null,
        quantity: Math.max(1, Number.parseInt(component.quantity, 10) || 1),
        display_order: index,
      }))

    if (components.length < 2 || new Set(components.map((component) => `${component.product_id}:${component.variant_id || "base"}`)).size < 2) {
      toast.error("Selecciona al menos dos productos o variantes diferentes")
      return
    }

    setIsSubmitting(true)
    let uploadedImageUrl: string | undefined
    try {
      const imageResult = await resolveDeferredImageUpload({
        file: selectedImageFile,
        imageUrl: form.image_url,
        context: "product-images",
        uploadImage,
      })
      uploadedImageUrl = imageResult.uploadedUrl

      const payload = {
        name: form.name,
        slug: form.slug || undefined,
        category_id: form.category_id || null,
        description: form.description || undefined,
        image_url: imageResult.imageUrl,
        is_active: form.is_active,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value || 0),
        components,
      }
      const result = form.id ? await updateCombo(form.id, payload) : await createCombo(payload)

      if (!result.success) {
        await cleanupDeferredUploadedImage(uploadedImageUrl, deleteImage)
        toast.error(result.error || "No se pudo guardar el combo")
        return
      }

      toast.success(form.id ? "Combo actualizado" : "Combo creado")
      resetForm()
      await loadData()
    } catch (error: any) {
      await cleanupDeferredUploadedImage(uploadedImageUrl, deleteImage)
      console.error("[Admin Combos] Error guardando combo:", error)
      toast.error(error.message || "Error al guardar el combo")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading || isLoadingData) {
    return <div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto flex items-center justify-between gap-3 px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/admin/products"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Combos de productos</h1>
              <p className="text-sm text-muted-foreground">Crea combos vendibles con descuento y stock derivado.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto grid gap-6 px-4 py-8 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Listado de combos</CardTitle>
            <CardDescription>{combos.length} combos configurados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {combos.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">No hay combos aún.</div>
            ) : combos.map((combo) => (
              <div key={combo.id} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <PackageCheck className="h-4 w-4 text-primary" />
                      <h2 className="font-semibold">{combo.name}</h2>
                      <Badge variant={combo.isActive ? "default" : "secondary"}>{combo.isActive ? "Activo" : "Inactivo"}</Badge>
                      {!combo.availability.isAvailable && <Badge variant="destructive">Sin stock</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatPrice(combo.pricing.componentSubtotal.toString(), combo.pricing.currencyCode)} - descuento {formatPrice(combo.pricing.discountAmount.toString(), combo.pricing.currencyCode)} = <strong>{formatPrice(combo.pricing.finalUnitPrice.toString(), combo.pricing.currencyCode)}</strong>
                    </p>
                    <ul className="mt-2 text-sm text-muted-foreground">
                      {combo.components.map((component) => (
                        <li key={`${combo.id}-${component.productId}-${component.variantId || "base"}`}>
                          {component.quantity}× {component.productName}{component.variantTitle ? ` · ${component.variantTitle}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => startEdit(combo)}>Editar</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{form.id ? "Editar combo" : "Nuevo combo"}</CardTitle>
            <CardDescription>El precio se calcula desde los componentes actuales.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input id="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug</Label>
                <Input id="slug" value={form.slug} onChange={(event) => setForm({ ...form, slug: event.target.value })} placeholder="combo-cafe-premium" />
                <p className="text-xs text-muted-foreground">Se normaliza al guardar; por ejemplo, “combo test” queda como “combo-test”.</p>
              </div>
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select value={form.category_id || "__none"} onValueChange={(value) => setForm({ ...form, category_id: value === "__none" ? "" : value })}>
                  <SelectTrigger><SelectValue placeholder="Selecciona una categoría" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Sin categoría</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>{category.category_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} rows={3} />
              </div>
              <DeferredImageUpload
                imageUrl={form.image_url}
                selectedFile={selectedImageFile}
                onImageUrlChange={(imageUrl) => setForm({ ...form, image_url: imageUrl })}
                onFileChange={setSelectedImageFile}
                onValidationError={(message) => toast.error(message)}
                label="Imagen del combo"
                maxSizeMB={1}
              />
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Tipo descuento</Label>
                  <Select value={form.discount_type} onValueChange={(value) => setForm({ ...form, discount_type: value as ComboDiscountType })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentaje</SelectItem>
                      <SelectItem value="fixed_cop">Valor fijo COP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="discount_value">Valor</Label>
                  <Input id="discount_value" type="number" min="0" value={form.discount_value} onChange={(event) => setForm({ ...form, discount_value: event.target.value })} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked === true })} />
                Activo para venta
              </label>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Componentes</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => setForm({ ...form, components: [...form.components, { product_id: "", variant_id: "", quantity: "1" }] })}>Agregar</Button>
                </div>
                {form.components.map((component, index) => {
                  const selectedProduct = selectedProductById.get(component.product_id)
                  return (
                    <div key={`${index}-${componentKey(component)}`} className="space-y-2 rounded-md border p-3">
                      <Select value={component.product_id} onValueChange={(value) => updateComponent(index, { product_id: value, variant_id: "" })}>
                        <SelectTrigger><SelectValue placeholder="Producto" /></SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>{product.item_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={component.variant_id || "base"} onValueChange={(value) => updateComponent(index, { variant_id: value === "base" ? "" : value })}>
                        <SelectTrigger><SelectValue placeholder="Producto base o variante" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="base">Producto base</SelectItem>
                          {(selectedProduct?.variants || []).map((variant) => (
                            <SelectItem key={variant.id} value={variant.id}>{variant.variant_code || "Variante"}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input type="number" min="1" value={component.quantity} onChange={(event) => updateComponent(index, { quantity: event.target.value })} placeholder="Cantidad requerida" />
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  Guardar
                </Button>
                {form.id && <Button type="button" variant="outline" onClick={resetForm}>Cancelar</Button>}
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
