import { EditableWrapper } from "@/components/admin/editable-wrapper";
import { HomeDiscountPopup } from "@/components/home-discount-popup";
import {
  HomeComposition,
  type HomeCompositionSection,
} from "@/components/sections/home-composition";
import {
  getStoreFromServer,
  projectHomeDiscountPopupFromStore,
} from "@/lib/supabase/store-api";
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
 * Server Component que obtiene el store desde el servidor y renderiza el
 * home data-driven según la composición configurada (orden y visibilidad).
 */
export async function ConditionalHomeContent({
  previewMode = false,
}: ConditionalHomeContentProps = {}) {
  const store = await getStoreFromServer();
  const { storeId, config: homeDiscountPopupConfig } =
    projectHomeDiscountPopupFromStore(store);

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
      </main>
      <HomeDiscountPopup config={homeDiscountPopupConfig} storeId={storeId} />
    </>
  );
}
