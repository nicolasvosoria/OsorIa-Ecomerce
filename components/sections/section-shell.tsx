"use client"

import type { ReactNode } from "react"
import type { EmptySectionState } from "@/lib/sections/section-empty-state"

interface SectionShellProps {
  componentName: string
  sectionBgColor: string
  title: string
  titleColor: string
  description: string
  subtitleColor: string
  /**
   * Rendered next to the title (e.g. `instagram`'s handle link) instead of
   * below it. `hasTitleAdornment` switches the header layout on its own —
   * independent of whether `titleAdornment` currently has content — so the
   * header markup doesn't shift depending on that content (mirrors
   * `instagram.tsx`, whose title row always wraps the handle slot, filled or not).
   */
  titleAdornment?: ReactNode
  hasTitleAdornment?: boolean
  emptyState: EmptySectionState
  placeholder: string
  children: ReactNode
}

// Shared shell for the sections whose layout is title + optional description
// + either an editable-empty placeholder or their own content
// (testimonials/logos/faq/video/instagram). `story`/`whyus`/`featured` have
// their own layout and don't use this.
export function SectionShell({
  componentName,
  sectionBgColor,
  title,
  titleColor,
  description,
  subtitleColor,
  titleAdornment,
  hasTitleAdornment,
  emptyState,
  placeholder,
  children,
}: SectionShellProps) {
  return (
    <section
      data-component={componentName}
      className="py-8 md:py-16 px-4"
      style={{ backgroundColor: sectionBgColor }}
    >
      <div className="container mx-auto">
        {hasTitleAdornment ? (
          <div className="mb-2 flex flex-wrap items-center gap-3 md:mb-4">
            <h2
              className="text-2xl md:text-4xl lg:text-[47px] font-heading font-normal text-left"
              style={{ color: titleColor }}
            >
              {title}
            </h2>
            {titleAdornment}
          </div>
        ) : (
          <h2
            className="text-2xl md:text-4xl lg:text-[47px] font-heading font-normal text-left mb-2 md:mb-4"
            style={{ color: titleColor }}
          >
            {title}
          </h2>
        )}
        {description ? (
          <p
            className="mb-6 max-w-2xl text-sm md:mb-12 md:text-base"
            style={{ color: subtitleColor }}
          >
            {description}
          </p>
        ) : null}

        {emptyState === "placeholder" ? (
          <p className="py-12 text-center text-sm text-muted-foreground">{placeholder}</p>
        ) : (
          children
        )}
      </div>
    </section>
  )
}
