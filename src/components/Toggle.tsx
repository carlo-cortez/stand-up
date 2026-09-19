type Props = {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
};

/**
 * An on/off row (the recording switch on Setup). A real checkbox with
 * role="switch" inside its label, so the whole row is the target.
 */
export function Toggle({ id, label, description, checked, disabled = false, onChange }: Props) {
  return (
    <label htmlFor={id} className={`toggle${disabled ? ' is-disabled' : ''}`}>
      <span className="toggle__text">
        <span className="toggle__label">{label}</span>
        <span className="toggle__description">{description}</span>
      </span>
      <span className={`toggle__switch${checked ? ' is-on' : ''}`}>
        <input
          id={id}
          type="checkbox"
          role="switch"
          className="visually-hidden"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="toggle__knob" aria-hidden="true" />
      </span>
    </label>
  );
}
