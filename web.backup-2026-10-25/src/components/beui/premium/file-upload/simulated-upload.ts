import type { UploadFn } from "./file-upload-data";

const TICK_MS = 120;

function abortError() {
  return new DOMException("Upload aborted", "AbortError");
}

/**
 * A deterministic stand-in uploader for demos. Speed and duration derive
 * from the file size, and the `failAt`-th new file fails once midway so the
 * retry path is visible. Swap in a real `upload` prop for production.
 */
export function createSimulatedUpload({
  failAt = 2,
  failMessage = "Connection dropped",
}: {
  failAt?: number;
  failMessage?: string;
} = {}): UploadFn {
  const seen = new Map<string, number>();
  let started = 0;
  const failed = new Set<string>();

  return (file, { onProgress, signal, resumeFrom }) => {
    const key = `${file.name}:${file.size}`;
    if (!seen.has(key)) {
      started += 1;
      seen.set(key, started);
    }
    const shouldFail = seen.get(key) === failAt && !failed.has(key);

    // 0.9–2.4 MB/s depending on size, clamped to a 1.6–8s total.
    const rate = 900_000 + (file.size % 7) * 250_000;
    const duration = Math.min(8000, Math.max(1600, (file.size / rate) * 1000));
    const ticks = Math.ceil(duration / TICK_MS);

    return new Promise<void>((resolve, reject) => {
      if (signal.aborted) return reject(abortError());
      let tick = Math.round(resumeFrom * ticks);
      const timer = window.setInterval(() => {
        tick += 1;
        // A gentle deterministic wobble keeps the speed readout alive.
        const wobble = Math.sin(tick * 1.7 + file.size) * 0.18;
        const fraction = Math.min(1, (tick + wobble) / ticks);
        if (shouldFail && fraction >= 0.58) {
          window.clearInterval(timer);
          failed.add(key);
          reject(new Error(failMessage));
          return;
        }
        onProgress(Math.max(0, fraction));
        if (tick >= ticks) {
          window.clearInterval(timer);
          onProgress(1);
          resolve();
        }
      }, TICK_MS);
      signal.addEventListener(
        "abort",
        () => {
          window.clearInterval(timer);
          reject(abortError());
        },
        { once: true },
      );
    });
  };
}
