export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

export type GetAudioContextOptions = AudioContextOptions & {
  id?: string;
};

const audioContextMap: Map<string, AudioContext> = new Map();

export const getAudioContext = (() => {
  const didInteract = new Promise<void>((resolve) => {
    window.addEventListener("pointerdown", () => resolve(), { once: true });
    window.addEventListener("keydown", () => resolve(), { once: true });
  });

  return async (options?: GetAudioContextOptions): Promise<AudioContext> => {
    try {
      // Try to create a minimal audio to ensure user interaction
      const audio = new Audio();
      audio.src =
        "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
      await audio.play();

      if (options?.id && audioContextMap.has(options.id)) {
        const ctx = audioContextMap.get(options.id);
        if (ctx) return ctx;
      }

      const ctx = new AudioContext(options);
      if (options?.id) {
        audioContextMap.set(options.id, ctx);
      }
      return ctx;
    } catch (e) {
      await didInteract;

      if (options?.id && audioContextMap.has(options.id)) {
        const ctx = audioContextMap.get(options.id);
        if (ctx) return ctx;
      }

      const ctx = new AudioContext(options);
      if (options?.id) {
        audioContextMap.set(options.id, ctx);
      }
      return ctx;
    }
  };
})();
