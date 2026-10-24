import { useLayoutEffect, useRef } from 'react';
import { observeTextSize } from '../text-autosize';

interface TextControlProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: string;
}

export function TextControl({ label, value, onChange, placeholder, hint }: TextControlProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sizeRef = useRef<ReturnType<typeof observeTextSize>>();
  useLayoutEffect(() => {
    sizeRef.current = observeTextSize(inputRef.current!);
    return () => sizeRef.current?.destroy();
  }, []);
  useLayoutEffect(() => sizeRef.current?.update(), [value, placeholder]);

  return (
    <label className="dialkit-text-control" data-hint={hint}>
      <span className="dialkit-text-label">{label}</span>
      <textarea
        ref={inputRef}
        rows={1}
        className="dialkit-text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
