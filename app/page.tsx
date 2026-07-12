import { ConditionalHomeContent } from "@/components/sections/conditional-home-content"
import { THEME_PREVIEW_QUERY_PARAM } from "@/lib/theme-font/preview-mode"

export default async function Home(props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const searchParams = await props.searchParams
  const previewMode = searchParams?.[THEME_PREVIEW_QUERY_PARAM] === "1"

  return <ConditionalHomeContent previewMode={previewMode} />
}
