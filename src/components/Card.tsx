import type { HTMLAttributes } from 'react';

type Props = HTMLAttributes<HTMLDivElement> & { muted?: boolean };

export function Card({ muted = false, className, ...rest }: Props) {
  return <div className={['card', muted && 'card--muted', className].filter(Boolean).join(' ')} {...rest} />;
}
