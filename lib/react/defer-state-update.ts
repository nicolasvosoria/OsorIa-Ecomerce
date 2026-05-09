export function deferStateUpdate(update: () => void): void {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(update);
    return;
  }

  void Promise.resolve().then(update);
}
