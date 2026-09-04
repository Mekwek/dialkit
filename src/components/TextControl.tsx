interface TextControlProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TextControl({ label, value, onChange, placeholder }: TextControlProps) {
  return (
    <label className="dialkit-text-control">
      <span className="dialkit-text-label">{label}</span>
      <input
        type="text"
        className="dialkit-text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
