<script lang="ts">
  let { label, value, onChange, placeholder } = $props<{
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  }>();
</script>

<label class="dialkit-text-control">
  <span class="dialkit-text-label">{label}</span>
  <input
    type="text"
    class="dialkit-text-input"
    value={value}
    placeholder={placeholder}
    oninput={(e) => onChange((e.currentTarget as HTMLInputElement).value)}
  />
</label>
