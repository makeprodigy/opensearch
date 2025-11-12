import { useEffect, useState } from "react";

const LANGUAGE_OPTIONS = [
  "JavaScript",
  "TypeScript",
  "Python",
  "Java",
  "Go",
  "Rust",
  "C++",
  "C#",
  "Ruby",
  "PHP",
  "Swift",
  "Kotlin",
  "Scala",
  "C",
  "Shell",
];

const LICENSE_OPTIONS = [
  { value: "", label: "Any license" },
  { value: "mit", label: "MIT" },
  { value: "apache-2.0", label: "Apache 2.0" },
  { value: "gpl-3.0", label: "GPLv3" },
  { value: "gpl-2.0", label: "GPLv2" },
  { value: "agpl-3.0", label: "AGPL" },
  { value: "mpl-2.0", label: "Mozilla Public License 2.0" },
  { value: "bsd-2-clause", label: "BSD 2-Clause" },
  { value: "bsd-3-clause", label: "BSD 3-Clause" },
  { value: "unlicense", label: "Unlicense" },
];

const UPDATED_PRESET_OPTIONS = [
  { value: "", label: "Any time" },
  { value: "30", label: "Past 30 days" },
  { value: "90", label: "Past 90 days" },
  { value: "365", label: "Past year" },
  { value: "custom", label: "Custom date…" },
];

const SORT_OPTIONS = [
  { value: "updated", label: "Recently updated" },
  { value: "stars", label: "Stars" },
  { value: "forks", label: "Forks" },
  { value: "help-wanted-issues", label: "Help wanted issues" },
  { value: "best-match", label: "Best match (GitHub default)" },
];

const ORDER_OPTIONS = [
  { value: "desc", label: "Descending" },
  { value: "asc", label: "Ascending" },
];

export default function FilterSidebar({ filters, onApply, onReset, disabled = false }) {
  const [draft, setDraft] = useState(filters);

  useEffect(() => {
    setDraft(filters);
  }, [filters]);

  function handleNumericChange(field, rawValue) {
    const nextValue = rawValue === "" ? "" : Number.parseInt(rawValue, 10);
    setDraft((prev) => ({
      ...prev,
      [field]: Number.isNaN(nextValue) ? "" : nextValue,
    }));
  }

  function handleInputChange(field, value) {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function handleSortChange(value) {
    setDraft((prev) => ({
      ...prev,
      sort: value,
      order: value === "best-match" ? "desc" : prev.order,
    }));
  }

  function handleUpdatedPresetChange(value) {
    setDraft((prev) => ({
      ...prev,
      updatedPreset: value,
      updatedSince: value === "custom" ? prev.updatedSince : "",
    }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    onApply?.(draft);
  }

  function handleReset(event) {
    event.preventDefault();
    onReset?.();
  }

  return (
    <aside className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-slate-950/20 lg:h-fit">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="keywords" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Keywords
          </label>
          <input
            id="keywords"
            type="text"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="e.g. automation tooling"
            value={draft.keywords}
            onChange={(event) => handleInputChange("keywords", event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="language" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Language
          </label>
          <select
            id="language"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            value={draft.language}
            onChange={(event) => handleInputChange("language", event.target.value)}
          >
            <option value="">Any language</option>
            {LANGUAGE_OPTIONS.map((language) => (
              <option key={language} value={language}>
                {language}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="stars" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Min stars
            </label>
            <input
              id="stars"
              type="number"
              min="0"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              value={draft.minStars === "" ? "" : draft.minStars}
              onChange={(event) => handleNumericChange("minStars", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="forks" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Min forks
            </label>
            <input
              id="forks"
              type="number"
              min="0"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              value={draft.minForks === "" ? "" : draft.minForks}
              onChange={(event) => handleNumericChange("minForks", event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="good-first-issues" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Min good first issues
          </label>
          <input
            id="good-first-issues"
            type="number"
            min="0"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            value={draft.minGoodFirstIssues === "" ? "" : draft.minGoodFirstIssues}
            onChange={(event) => handleNumericChange("minGoodFirstIssues", event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="topics" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Topics
          </label>
          <input
            id="topics"
            type="text"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            placeholder="e.g. cli, developer-tools"
            value={draft.topics}
            onChange={(event) => handleInputChange("topics", event.target.value)}
          />
          <p className="text-xs text-slate-500">Comma-separated topics. We’ll add each as a GitHub topic filter.</p>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">Archived repositories</span>
          <div className="grid gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="radio"
                name="archived"
                value="exclude"
                checked={draft.archived === "exclude"}
                onChange={(event) => handleInputChange("archived", event.target.value)}
                className="h-4 w-4 border-slate-700 bg-slate-950 text-brand focus:ring-brand"
              />
              Exclude archived
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="radio"
                name="archived"
                value="include"
                checked={draft.archived === "include"}
                onChange={(event) => handleInputChange("archived", event.target.value)}
                className="h-4 w-4 border-slate-700 bg-slate-950 text-brand focus:ring-brand"
              />
              Include archived
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-slate-300">
              <input
                type="radio"
                name="archived"
                value="only"
                checked={draft.archived === "only"}
                onChange={(event) => handleInputChange("archived", event.target.value)}
                className="h-4 w-4 border-slate-700 bg-slate-950 text-brand focus:ring-brand"
              />
              Only archived
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="license" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            License
          </label>
          <select
            id="license"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            value={draft.license}
            onChange={(event) => handleInputChange("license", event.target.value)}
          >
            {LICENSE_OPTIONS.map((option) => (
              <option key={option.value || "any"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="updated" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Last updated
          </label>
          <select
            id="updated"
            className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
            value={draft.updatedPreset}
            onChange={(event) => handleUpdatedPresetChange(event.target.value)}
          >
            {UPDATED_PRESET_OPTIONS.map((option) => (
              <option key={option.value || "any"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {draft.updatedPreset === "custom" ? (
            <input
              type="date"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              value={draft.updatedSince}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(event) => handleInputChange("updatedSince", event.target.value)}
            />
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="sort" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Sort by
            </label>
            <select
              id="sort"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              value={draft.sort}
              onChange={(event) => handleSortChange(event.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="order" className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Order
            </label>
            <select
              id="order"
              className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand disabled:opacity-50"
              value={draft.order}
              disabled={draft.sort === "best-match"}
              onChange={(event) => handleInputChange("order", event.target.value)}
            >
              {ORDER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            className="text-xs font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-200"
            onClick={handleReset}
            disabled={disabled}
          >
            Reset filters
          </button>
          <button
            type="submit"
            className="rounded-lg bg-brand px-4 py-2 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-60"
            disabled={disabled}
          >
            Apply filters
          </button>
        </div>
      </form>
    </aside>
  );
}


