"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useRef } from "react";

// Textfeld, das mit dem Inhalt mitwächst (kein manuelles Vergrössern nötig).
// `rows` ist die Mindesthöhe. Bei sehr langen Texten wird bei ca. 70 % der Bildschirmhöhe gescrollt.
type Props = Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "rows"> & { rows?: number };

const AutoTextarea = forwardRef<HTMLTextAreaElement, Props>(function AutoTextarea({ rows = 3, className = "", style, onInput, ...rest }, ref) {
  const inner = useRef<HTMLTextAreaElement | null>(null);
  useImperativeHandle(ref, () => inner.current as HTMLTextAreaElement);

  const fit = useCallback(() => {
    const el = inner.current;
    if (!el) return;
    el.style.height = "auto";
    const max = Math.round(window.innerHeight * 0.7);
    el.style.height = `${Math.min(el.scrollHeight, max)}px`;
    el.style.overflowY = el.scrollHeight > max ? "auto" : "hidden";
  }, []);

  // Bei jeder Änderung des Inhalts (auch von aussen, z. B. durch die Knöpfe Fett/Link/Liste) neu berechnen
  useLayoutEffect(fit, [fit, rest.value]);
  useEffect(() => {
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [fit]);

  return (
    <textarea
      {...rest}
      ref={inner}
      rows={rows}
      className={`${className} resize-none`}
      style={{ overflowY: "hidden", ...style }}
      onInput={(e) => {
        fit();
        onInput?.(e);
      }}
    />
  );
});

export default AutoTextarea;
