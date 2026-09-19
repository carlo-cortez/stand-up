import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

type Variant = 'primary' | 'secondary' | 'text' | 'destructive' | 'pill';
/** Primary heights from handoff §3: 56 default, 60 on Speaking and Setup, 68 on Home. */
type Size = 'default' | 'large' | 'hero';

function classes(variant: Variant, size: Size, extra?: string) {
  return ['btn', `btn--${variant}`, size !== 'default' && `btn--${size}`, extra]
    .filter(Boolean)
    .join(' ');
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
};

export function Button({ variant = 'primary', size = 'default', className, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={classes(variant, size, className)} {...rest} />;
}

type ButtonLinkProps = LinkProps & { variant?: Variant; size?: Size };

/** A real <a href> styled as a button, for anything that navigates. */
export function ButtonLink({ variant = 'primary', size = 'default', className, ...rest }: ButtonLinkProps) {
  return <Link className={classes(variant, size, className)} {...rest} />;
}
