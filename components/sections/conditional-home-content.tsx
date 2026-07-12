import { Suspense } from "react";
import { ReposteriaHero } from "@/components/sections/reposteria-hero";
import { ReposteriaGallery } from "@/components/sections/reposteria-gallery";
import { ReposteriaAbout } from "@/components/sections/reposteria-about";
import { ProductsGridWrapper } from "@/components/sections/products-grid-wrapper";
import { FooterNew } from "@/components/sections/footer-new";
import { EditableWrapper } from "@/components/admin/editable-wrapper";
import { HomeDiscountPopup } from "@/components/home-discount-popup";
import {
  HomeComposition,
  type HomeCompositionSection,
} from "@/components/sections/home-composition";
import { getStoreFromServer } from "@/lib/supabase/store-api";
import { getHomeComposition } from "@/lib/supabase/home-composition-api";
import { sectionLabel } from "@/lib/section-editor/sections-registry";
import { homeSectionRenderers } from "@/lib/sections/home-section-renderers";
import {
  COMPOSABLE_SECTION_KEYS,
  type ComposableSectionKey,
} from "@/lib/sections/home-composition";

interface ConditionalHomeContentProps {
  // True inside the `/admin/theme` preview iframe (`?themePreview=1`, read by
  // `app/page.tsx`). Renders every composable section — not just the enabled
  // ones — so the client-side `HomeComposition` has every node on hand to
  // reorder/hide/add/remove live, without a reload.
  previewMode?: boolean;
}

/**
 * Componente que muestra contenido diferente según la tienda
 * Para repostería muestra diseño inspirado en nicolukas.com
 * Server Component que obtiene el store desde el servidor
 */
export async function ConditionalHomeContent({
  previewMode = false,
}: ConditionalHomeContentProps = {}) {
  const store = await getStoreFromServer();

  // Si es la tienda de repostería, mostrar diseño personalizado
  if (store?.subdomain === "reposteria") {
    return (
      <>
        <main className="flex flex-col reposteria-main">
          <EditableWrapper componentName="hero" label={sectionLabel("hero")}>
            <ReposteriaHero />
          </EditableWrapper>

          <EditableWrapper
            componentName="products"
            label={sectionLabel("products")}
          >
            <section className="py-20 px-4 bg-muted/30">
              <div className="container mx-auto">
                <h2 className="section-title text-4xl md:text-5xl font-serif mb-12 text-center">
                  Explora Nuestro Catálogo
                </h2>
                <Suspense
                  fallback={
                    <div className="py-12 text-center text-muted-foreground">
                      Cargando productos...
                    </div>
                  }
                >
                  <ProductsGridWrapper />
                </Suspense>
              </div>
            </section>
          </EditableWrapper>

          <EditableWrapper
            componentName="gallery"
            label={sectionLabel("gallery")}
          >
            <ReposteriaGallery />
          </EditableWrapper>

          <EditableWrapper componentName="about" label={sectionLabel("about")}>
            <ReposteriaAbout />
          </EditableWrapper>

          <EditableWrapper componentName="footer" label={sectionLabel("footer")}>
            <FooterNew />
          </EditableWrapper>
        </main>
        <HomeDiscountPopup />
      </>
    );
  }

  // Página normal para otras tiendas: orden y visibilidad data-driven
  const composition = await getHomeComposition();

  const keys = previewMode
    ? COMPOSABLE_SECTION_KEYS
    : composition.filter((entry) => entry.enabled).map((entry) => entry.key);

  const sections = keys
    .map((key): HomeCompositionSection | null => {
      const render = homeSectionRenderers[key as ComposableSectionKey];
      if (!render) return null;
      return {
        key,
        node: (
          <EditableWrapper componentName={key} label={sectionLabel(key)}>
            {render()}
          </EditableWrapper>
        ),
      };
    })
    .filter((s): s is HomeCompositionSection => s !== null);

  return (
    <>
      <main className="flex flex-col">
        <HomeComposition sections={sections} composition={composition} previewMode={previewMode} />
        <EditableWrapper componentName="footer" label={sectionLabel("footer")}>
          <FooterNew />
        </EditableWrapper>
      </main>
      <HomeDiscountPopup />
    </>
  );
}
