export function preloadIntroFrames(urls: string[], timeoutMs: number): Promise<unknown> {
  if (!urls.length) return Promise.resolve();

  const loaders = urls.map(
    (url) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => {
          if (typeof img.decode === "function") {
            img.decode().then(() => resolve()).catch(() => resolve());
          } else {
            resolve();
          }
        };
        img.onerror = () => resolve();
        img.src = url;
      })
  );

  const timer = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  return Promise.race([Promise.allSettled(loaders), timer]);
}

export function waitForFonts(timeoutMs: number): Promise<unknown> {
  if (typeof document !== "undefined" && document.fonts && document.fonts.ready) {
    return Promise.race([
      document.fonts.ready,
      new Promise<void>((resolve) => setTimeout(resolve, timeoutMs))
    ]);
  }
  return Promise.resolve();
}
