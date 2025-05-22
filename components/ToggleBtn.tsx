// 🚨 This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.
export function ToggleSwitch({
  checked,
  onChange,
  label
}: {
  checked: boolean;
  onChange: () => void;
  label?: string;
}) {
  return <div className="flex items-center gap-2">
        <span className="text-sm font-medium">{label}</span>
        <button type="button" role="switch" aria-checked={checked} onClick={onChange} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${checked ? 'bg-green-500' : 'bg-gray-300'}`}>
          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      </div>;
}