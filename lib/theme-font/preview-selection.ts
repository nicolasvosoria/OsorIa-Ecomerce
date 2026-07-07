"use client";

import { useSyncExternalStore } from "react";
import { parseThemePreviewSelectionMessage } from "@/lib/theme-font/preview-mode";

// Single source of truth for the section currently highlighted inside the
// preview iframe. Every `EditableWrapper` instance subscribes to this store
// instead of each attaching its own `message` listener, so N sections cost
// one listener total (attached lazily, on first subscribe).
let selectedComponentName: string | null = null;
let messageListenerAttached = false;
const listeners = new Set<() => void>();

function notifyListeners() {
  for (const listener of listeners) listener();
}

function handleSelectionMessage(event: MessageEvent) {
  if (event.origin !== window.location.origin) return;

  const message = parseThemePreviewSelectionMessage(event.data);
  if (!message) return;

  selectedComponentName = message.componentName;
  notifyListeners();
}

function subscribe(listener: () => void) {
  if (!messageListenerAttached) {
    window.addEventListener("message", handleSelectionMessage);
    messageListenerAttached = true;
  }

  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return selectedComponentName;
}

function getServerSnapshot() {
  return null;
}

/**
 * The component name currently selected by the customizer parent, or `null`
 * when nothing is selected. Only meaningful inside the preview iframe.
 */
export function usePreviewSelection(): string | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
