import { useEffect, useRef, useState } from 'react';

/**
 * Lectura de un QR con la cámara (requiere HTTPS o localhost). Es el único lector del código:
 * lo usan "Recepción y retiros" y los paneles de custodia del detalle (T-12).
 *
 * Mientras `active` sea true hay que montar `<video ref={videoRef} />`. Al leer un QR se apaga
 * la cámara y se llama a `onResult`; si no se puede abrir, se apaga y se llama a `onError`.
 */
export function useQrScanner(onResult: (text: string) => void, onError: () => void) {
  const [active, setActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  // Los callbacks cambian en cada render; el lector solo se crea al encender la cámara.
  const handlers = useRef({ onResult, onError });
  handlers.current = { onResult, onError };

  useEffect(() => {
    if (!active || !videoRef.current) return;
    let cancelled = false;
    let controls: { stop(): void } | undefined;
    import('@zxing/browser')
      .then(async ({ BrowserQRCodeReader }) => {
        controls = await new BrowserQRCodeReader().decodeFromVideoDevice(
          undefined,
          videoRef.current!,
          (result) => {
            if (!result || cancelled) return;
            setActive(false);
            handlers.current.onResult(result.getText());
          },
        );
        if (cancelled) controls.stop();
      })
      .catch(() => {
        if (cancelled) return;
        setActive(false);
        handlers.current.onError();
      });
    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [active]);

  return { active, toggle: () => setActive((v) => !v), videoRef };
}
