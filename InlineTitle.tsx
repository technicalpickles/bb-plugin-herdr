// Inline thread-title editor. The SDK's rename() is silent, so we own the input.
import { useEffect, useRef, type CSSProperties } from "react";

export function InlineTitle({
  initial,
  onDone,
  style,
}: {
  initial: string;
  /** Called once: the trimmed new title, or null when cancelled or unchanged. */
  onDone: (title: string | null) => void;
  style?: CSSProperties;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const finished = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const finish = (save: boolean) => {
    if (finished.current) return;
    finished.current = true;
    const next = inputRef.current?.value.trim();
    onDone(save && next && next !== initial ? next : null);
  };

  return (
    <input
      ref={inputRef}
      defaultValue={initial}
      aria-label="Thread title"
      spellCheck={false}
      onBlur={() => finish(true)}
      // Keep keys and clicks away from bb's global shortcuts and the row's navigation.
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter") finish(true);
        else if (event.key === "Escape") finish(false);
      }}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onMouseDown={(event) => event.stopPropagation()}
      style={{
        minWidth: 0,
        flex: 1,
        font: "inherit",
        color: "inherit",
        padding: "0 4px",
        borderRadius: 4,
        border: "1px solid var(--ring, #89b4fa)",
        background: "var(--background, #1e1e2e)",
        outline: "none",
        ...style,
      }}
    />
  );
}
