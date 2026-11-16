const VARIANTS = {
  primary: 'bg-brand text-brand-ink hover:brightness-110 active:brightness-95',
  secondary: 'bg-surface-2 text-ink hover:bg-surface-3',
  ghost: 'text-ink-muted hover:text-ink hover:bg-surface-2',
  danger: 'bg-surface text-danger border border-line hover:bg-danger-soft',
};

const SIZES = {
  sm: 'min-h-11 px-4 text-sm gap-1.5 rounded-full',
  md: 'min-h-11 px-6 text-base gap-2 rounded-full',
  lg: 'min-h-12 px-7 text-base gap-2 rounded-full',
  icon: 'size-11 rounded-full',
};

export function buttonClass({ variant = 'primary', size = 'md', block = false, className = '' } = {}) {
  return [
    'inline-flex items-center justify-center font-semibold select-none whitespace-nowrap',
    'transition-[background-color,border-color,color,filter,transform] duration-200 ease-apple active:scale-[0.98]',
    'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
    VARIANTS[variant], SIZES[size], block ? 'w-full' : '', className,
  ].join(' ');
}
