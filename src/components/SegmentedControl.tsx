type Option<T extends string | number> = { value: T; label: string };

type Props<T extends string | number> = {
  legend: string;
  name: string;
  options: Option<T>[];
  /** Undefined when nothing is chosen yet, e.g. a rating not given. */
  value: T | undefined;
  onChange: (value: T) => void;
  /** "segments" share the row equally; "pills" wrap, for the category list;
   *  "ratings" are the tighter 1–5 rows on Review, under a field-style legend. */
  layout?: 'segments' | 'pills' | 'ratings';
};

/**
 * A fieldset of real radios (handoff §3). Arrow keys move between options
 * for free, because these are native inputs rather than styled divs.
 */
export function SegmentedControl<T extends string | number>({
  legend,
  name,
  options,
  value,
  onChange,
  layout = 'segments',
}: Props<T>) {
  return (
    <fieldset className="segmented">
      <legend className={layout === 'ratings' ? 'segmented__legend' : 'section-label'}>{legend}</legend>
      <div className={`segmented__options segmented__options--${layout}`}>
        {options.map((option) => (
          <label key={String(option.value)} className="segmented__option">
            <input
              type="radio"
              name={name}
              value={String(option.value)}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="visually-hidden"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
