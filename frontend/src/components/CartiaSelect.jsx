import { useEffect, useId, useRef, useState } from "react";
import { Check, CaretDown } from "@phosphor-icons/react";

function normalizeOption(option) {
  return typeof option === "string" ? { value: option, label: option } : option;
}

export function CartiaSelect({ value, options = [], onChange, ariaLabel, placeholder = "Seleccionar", className = "", disabled = false }) {
  const rootRef = useRef(null);
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const normalized = options.map(normalizeOption);
  const selectedIndex = Math.max(0, normalized.findIndex((option) => option.value === value));
  const selected = normalized[selectedIndex];

  useEffect(() => {
    setHighlighted(selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event) => {
      if (event.key === "Escape") { setOpen(false); rootRef.current?.querySelector("button")?.focus(); }
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, [open]);

  const choose = (index) => {
    const option = normalized[index];
    if (!option || option.disabled) return;
    onChange?.(option.value);
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (disabled) return;
    if (!normalized.length && ["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setHighlighted((index) => (index + direction + normalized.length) % normalized.length);
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (!open) setOpen(true); else choose(highlighted);
    }
  };

  return <div ref={rootRef} className={`cartia-select ${open ? "is-open" : ""} ${className}`.trim()}>
    <button type="button" className="cartia-select-trigger" onClick={() => setOpen((current) => !current)} onKeyDown={handleKeyDown} disabled={disabled} aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId}>
      <span className={!selected ? "is-placeholder" : ""}>{selected?.label || placeholder}</span><CaretDown size={15} weight="bold" aria-hidden="true" />
    </button>
    {open && <div id={listId} className="cartia-select-menu" role="listbox" aria-label={ariaLabel}>
      {normalized.length ? normalized.map((option, index) => <button type="button" role="option" aria-selected={option.value === value} disabled={option.disabled} className={`cartia-select-option ${option.value === value ? "is-selected" : ""} ${index === highlighted ? "is-highlighted" : ""}`.trim()} key={option.value} onMouseEnter={() => setHighlighted(index)} onClick={() => choose(index)}><span>{option.label}</span>{option.value === value && <Check size={15} weight="bold" aria-hidden="true" />}</button>) : <span className="cartia-select-empty">Sin opciones disponibles</span>}
    </div>}
  </div>;
}
