import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppIcon } from "./AppIcon";

const commands = [
  { label: "Overview", description: "Return to your workspace", to: "/dashboard", icon: "dashboard" },
  { label: "Create a resume", description: "Start with a guided draft", to: "/resumes/new", icon: "plus" },
  { label: "My resumes", description: "Open saved documents", to: "/resumes", icon: "document" },
  { label: "Browse templates", description: "Choose a new visual direction", to: "/templates", icon: "templates" },
  { label: "Check ATS fit", description: "Score a resume against a role", to: "/ats", icon: "ats" },
  { label: "AI Center", description: "Improve your writing", to: "/ai-assistant", icon: "ai" },
  { label: "Settings", description: "Manage account preferences", to: "/settings", icon: "settings" },
];

export const CommandPalette = ({ open, onClose }) => {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const matches = commands.filter((item) =>
    `${item.label} ${item.description}`.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    if (!open) return undefined;
    setQuery("");
    window.requestAnimationFrame(() => inputRef.current?.focus());
    const onKeyDown = (event) => event.key === "Escape" && onClose();
    document.body.classList.add("dialog-open");
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("dialog-open");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const select = (to) => {
    navigate(to);
    onClose();
  };

  return (
    <div className="command-overlay" role="presentation" onMouseDown={onClose}>
      <section
        className="command-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Quick navigation"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="command-search">
          <AppIcon name="search" size={18} />
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && matches[0]) select(matches[0].to);
            }}
            placeholder="Search pages and actions…"
            aria-label="Search pages and actions"
          />
          <kbd>Esc</kbd>
        </div>
        <div className="command-results">
          <p className="command-label">Quick actions</p>
          {matches.length ? matches.map((item) => (
            <button key={item.to} type="button" onClick={() => select(item.to)}>
              <span className="command-icon"><AppIcon name={item.icon} size={18} /></span>
              <span><strong>{item.label}</strong><small>{item.description}</small></span>
              <span className="command-enter">↵</span>
            </button>
          )) : <div className="command-empty"><AppIcon name="search" /><p>No results for “{query}”</p></div>}
        </div>
      </section>
    </div>
  );
};
