import { useEffect, useRef, type ReactNode } from 'react';

type Props = {
  open: boolean;
  title: string;
  children: ReactNode;
  onCancel: () => void;
};

/**
 * Bottom sheet for destructive confirmations (handoff §3), built on a modal
 * <dialog>: the page behind goes inert so focus is trapped, Escape fires
 * `cancel`, and the browser returns focus to the triggering control on close.
 */
export function Sheet({ open, title, children, onCancel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="sheet-title"
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      onClick={(event) => {
        // A click on the scrim lands on the dialog element itself.
        if (event.target === ref.current) onCancel();
      }}
    >
      <div className="sheet__body">
        <span className="sheet__handle" aria-hidden="true" />
        <h2 id="sheet-title" className="sheet__title">
          {title}
        </h2>
        {children}
      </div>
    </dialog>
  );
}
