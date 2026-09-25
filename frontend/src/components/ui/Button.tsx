import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "ghost";
type Size = "md" | "sm";

interface StyleProps {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  /** Trailing arrow that nudges right on hover. */
  arrow?: boolean;
  className?: string;
  children: ReactNode;
}

const BASE =
  "group inline-flex items-center justify-center gap-2.5 font-semibold no-underline cursor-pointer " +
  "transition-[transform,box-shadow] duration-200 ease-out-expo " +
  "disabled:pointer-events-none disabled:opacity-50";

const VARIANTS: Record<Variant, string> = {
  // Chunky edge that sinks when pressed, like a physical button.
  primary:
    "bg-primary text-on-primary shadow-[0_3px_0_var(--btn-edge)] " +
    "hover:-translate-y-0.5 hover:shadow-[0_5px_0_var(--btn-edge)] " +
    "active:translate-y-[3px] active:scale-[.985] active:shadow-none active:duration-75",
  ghost:
    "bg-transparent text-ink shadow-[inset_0_0_0_1.5px_var(--line)] " +
    "hover:shadow-[inset_0_0_0_1.5px_var(--ink)]",
};

const SIZES: Record<Size, string> = {
  md: "rounded-[14px] px-5.5 py-3 text-[.98rem]",
  sm: "rounded-[11px] px-3.5 py-2 text-[.88rem]",
};

function buttonClass({
  variant = "primary",
  size = "md",
  block = false,
  className = "",
}: Pick<StyleProps, "variant" | "size" | "block" | "className">) {
  return [BASE, VARIANTS[variant], SIZES[size], block && "w-full", className]
    .filter(Boolean)
    .join(" ");
}

function Arrow() {
  return (
    <span
      aria-hidden="true"
      className="transition-transform duration-200 ease-out-expo group-hover:translate-x-1"
    >
      →
    </span>
  );
}

type ButtonProps = StyleProps &
  Omit<ComponentPropsWithoutRef<"button">, keyof StyleProps>;

export function Button({
  variant,
  size,
  block,
  arrow,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, block, className })}
      {...rest}
    >
      {children}
      {arrow && <Arrow />}
    </button>
  );
}

type ButtonLinkProps = StyleProps &
  ({ to: string; href?: never } | { href: string; to?: never });

/** Router link (`to`) or plain anchor (`href`, e.g. the OAuth redirect) styled as a button. */
export function ButtonLink({
  variant,
  size,
  block,
  arrow,
  className,
  children,
  to,
  href,
}: ButtonLinkProps) {
  const classes = buttonClass({ variant, size, block, className });
  const content = (
    <>
      {children}
      {arrow && <Arrow />}
    </>
  );

  return to !== undefined ? (
    <Link to={to} className={classes}>
      {content}
    </Link>
  ) : (
    <a href={href} className={classes}>
      {content}
    </a>
  );
}
