import { Suspense, type ReactNode } from "react"
import { HeroBanner } from "@/components/sections/hero-banner"
import { PopularItemsWrapper } from "@/components/sections/popular-items-wrapper"
import { ProductsGridWrapper } from "@/components/sections/products-grid-wrapper"
import { FeaturedProduct } from "@/components/sections/featured-product"
import { SpecialOffer } from "@/components/sections/special-offer"
import { WhyUs } from "@/components/sections/why-us"
import { NewsletterSection } from "@/components/sections/newsletter-section"
import type { ComposableSectionKey } from "@/lib/sections/home-composition"

// Renders the inner content of each composable home section — the
// `<EditableWrapper>` around it is applied uniformly by the caller, so it is
// not part of this registry.
export const homeSectionRenderers: Record<ComposableSectionKey, () => ReactNode> = {
  hero: () => <HeroBanner />,
  popular: () => (
    <Suspense
      fallback={
        <div className="py-12 text-center text-muted-foreground">
          Cargando productos populares...
        </div>
      }
    >
      <PopularItemsWrapper />
    </Suspense>
  ),
  products: () => (
    <Suspense
      fallback={
        <div className="py-12 text-center text-muted-foreground">
          Cargando productos...
        </div>
      }
    >
      <ProductsGridWrapper />
    </Suspense>
  ),
  featured: () => <FeaturedProduct />,
  specialOffer: () => <SpecialOffer />,
  whyus: () => <WhyUs />,
  newsletter: () => <NewsletterSection />,
}
