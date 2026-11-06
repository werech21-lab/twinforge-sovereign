"use client";

import { useState } from "react";

type Props = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onEnter?: () => void;
  autoComplete?: string;
};

export default function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder = "••••••••",
  onEnter,
  autoComplete = "current-password",
}: Props) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-2 block text-base font-semibold text-white"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className="tf-input pe-14"
          onKeyDown={(e) => {
            if (e.key === "Enter") onEnter?.();
          }}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute end-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-lg text-slate-300 hover:bg-white/10 hover:text-white"
          aria-label={show ? "Hide password" : "Show password"}
          title={show ? "إخفاء" : "إظهار"}
        >
          {show ? "🙈" : "👁️"}
        </button>
      </div>
    </div>
  );
}
