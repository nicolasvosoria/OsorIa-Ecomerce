// Re-exports the already-decoupled Hero sub-editor so it is reachable from
// the shared section-editor module too. `HeroEditorPanel` and the
// hero-editor-state helpers take all their data/handlers as props/args, so
// no admin-context dependency leaks in through this re-export.

export { HeroEditorPanel } from "@/components/admin/hero-editor/hero-editor-panel";
export {
  addHeroSlide,
  createHeroHotspotDraft,
  deleteHeroHotspot,
  deleteHeroSlide,
  getActiveHeroSlideIndex,
  updateHeroHotspot,
  updateHeroSlide,
} from "@/components/admin/hero-editor/hero-editor-state";
