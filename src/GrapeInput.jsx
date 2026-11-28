import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { suggestGrapes } from './grapeVarieties.js';

// Text input for a grape name with a suggestion list (ARIA combobox). Free text is always kept.
export function GrapeInput({ value, onChange, knownGrapes, placeholder, listLabel }) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const suggestions = useMemo(() => suggestGrapes(value, knownGrapes), [value, knownGrapes]);
  const expanded = open && suggestions.length > 0;
  const listRef = useRef(null);

  // The grape rows sit at the bottom of the scrollable form: bring the opened list into view.
  useEffect(() => {
    if (expanded) listRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [expanded]);

  const close = () => {
    setOpen(false);
    setActive(-1);
  };

  const choose = (name) => {
    onChange(name);
    close();
  };

  const handleKeyDown = (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!suggestions.length) return;
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      const count = suggestions.length;
      setOpen(true);
      setActive((current) => (
        !expanded || current < 0 ? (step > 0 ? 0 : count - 1) : (current + step + count) % count
      ));
    } else if (event.key === 'Enter' && expanded && active >= 0) {
      event.preventDefault();
      choose(suggestions[active]);
    } else if (event.key === 'Escape' && expanded) {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
  };

  return (
    <div className="grape-input">
      <input
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onKeyDown={handleKeyDown}
        onBlur={close}
      />
      {expanded && (
        <ul ref={listRef} className="grape-suggestions" id={listId} role="listbox" aria-label={listLabel}>
          {suggestions.map((name, index) => (
            <li
              key={name}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              className={index === active ? 'active' : undefined}
              // Keep focus in the input so the list isn't closed by blur before the click lands (mouse and touch).
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(name)}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
