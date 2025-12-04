import { useState } from "react";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";

export default function SearchBar({ initialQuery = "", onSearch }) {
  const [query, setQuery] = useState(initialQuery);

  function handleSubmit(event) {
    event.preventDefault();
    onSearch?.(query.trim());
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 rounded-xl border border-brand-light bg-white px-4 py-3 shadow-card focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/40"
    >
      <MagnifyingGlassIcon className="h-5 w-5 text-text-muted" />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="h-full w-full bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
        placeholder="Search GitHub for repositories with good first issues…"
      />
      <button
        type="submit"
        className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-brand-dark"
      >
        Search
      </button>
    </form>
  );
}
