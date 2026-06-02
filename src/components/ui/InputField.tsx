import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

interface BaseFieldProps {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  rightSlot?: ReactNode;
}

type InputFieldProps = BaseFieldProps & InputHTMLAttributes<HTMLInputElement>;
type SelectFieldProps = BaseFieldProps &
  SelectHTMLAttributes<HTMLSelectElement> & {
    options: Array<{ label: string; value: string }>;
  };

function FieldFrame({
  children,
  error,
  hint,
  id,
  label,
  rightSlot,
}: BaseFieldProps & { children: ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600 dark:text-zinc-300" htmlFor={id}>
          {label}
        </label>
        {rightSlot}
      </div>
      {children}
      {error ? (
        <p className="text-sm text-rose-300" id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-500" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function InputField({ className = '', error, hint, id, label, rightSlot, ...props }: InputFieldProps) {
  return (
    <FieldFrame error={error} hint={hint} id={id} label={label} rightSlot={rightSlot}>
      <input
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        aria-invalid={Boolean(error)}
        className={[
          'h-12 w-full rounded-2xl border border-[#E0E0E0] bg-white px-4 text-sm text-[#0A0A0A] placeholder:text-zinc-500 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-500',
          'backdrop-blur-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
          error ? 'border-rose-400/60 focus-visible:ring-rose-400/60' : 'focus-visible:border-primary/70',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        id={id}
        {...props}
      />
    </FieldFrame>
  );
}

export function SelectField({
  className = '',
  error,
  hint,
  id,
  label,
  options,
  rightSlot,
  ...props
}: SelectFieldProps) {
  return (
    <FieldFrame error={error} hint={hint} id={id} label={label} rightSlot={rightSlot}>
      <select
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        aria-invalid={Boolean(error)}
        className={[
          'h-12 w-full rounded-2xl border border-[#E0E0E0] bg-white px-4 text-sm text-[#0A0A0A] dark:border-white/10 dark:bg-white/5 dark:text-white',
          'backdrop-blur-md transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70',
          error ? 'border-rose-400/60 focus-visible:ring-rose-400/60' : 'focus-visible:border-primary/70',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        id={id}
        {...props}
      >
        {options.map((option) => (
          <option className="bg-white text-[#0A0A0A] dark:bg-surface dark:text-white" key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldFrame>
  );
}
