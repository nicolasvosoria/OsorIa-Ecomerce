import { HeroBanner } from "@/components/sections/hero-banner"
import { PopularItems } from "@/components/sections/popular-items"
import { ProductsGrid } from "@/components/sections/products-grid"
import { FeaturedProduct } from "@/components/sections/featured-product"
import { WhyUs } from "@/components/sections/why-us"
import { FooterNew } from "@/components/sections/footer-new"

export default async function Home() {
  return (
    <main className="flex flex-col">
      <HeroBanner />
      <PopularItems />
      <ProductsGrid />
      <FeaturedProduct />
      <WhyUs />
      <FooterNew />
    </main>
  )
}
