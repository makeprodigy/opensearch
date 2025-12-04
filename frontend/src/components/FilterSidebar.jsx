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
    <aside className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm lg:h-fit">
      <form className="space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-2">
          <label htmlFor="keywords" className="text-xs font-bold uppercase tracking-wide text-gray-700">
            Keywords
          </label>
          <input
            id="keywords"
            type="text"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2"
            style={{
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#2F7A4F';
              e.target.style.boxShadow = '0 0 0 3px rgba(47, 122, 79, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#D1D5DB';
              e.target.style.boxShadow = 'none';
            }}
            placeholder="e.g. automation tooling"
            value={draft.keywords}
            onChange={(event) => handleInputChange("keywords", event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="language" className="text-xs font-bold uppercase tracking-wide text-gray-700">
            Language
          </label>
          <select
            id="language"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2"
            style={{
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#2F7A4F';
              e.target.style.boxShadow = '0 0 0 3px rgba(47, 122, 79, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#D1D5DB';
              e.target.style.boxShadow = 'none';
            }}
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
            <label htmlFor="stars" className="text-xs font-bold uppercase tracking-wide text-gray-700">
              Min stars
            </label>
            <input
              id="stars"
              type="number"
              min="0"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2"
              style={{
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2F7A4F';
                e.target.style.boxShadow = '0 0 0 3px rgba(47, 122, 79, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#D1D5DB';
                e.target.style.boxShadow = 'none';
              }}
              value={draft.minStars === "" ? "" : draft.minStars}
              onChange={(event) => handleNumericChange("minStars", event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="forks" className="text-xs font-bold uppercase tracking-wide text-gray-700">
              Min forks
            </label>
            <input
              id="forks"
              type="number"
              min="0"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2"
              style={{
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2F7A4F';
                e.target.style.boxShadow = '0 0 0 3px rgba(47, 122, 79, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#D1D5DB';
                e.target.style.boxShadow = 'none';
              }}
              value={draft.minForks === "" ? "" : draft.minForks}
              onChange={(event) => handleNumericChange("minForks", event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="good-first-issues" className="text-xs font-bold uppercase tracking-wide text-gray-700">
            Min good first issues
          </label>
          <input
            id="good-first-issues"
            type="number"
            min="0"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2"
            style={{
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#2F7A4F';
              e.target.style.boxShadow = '0 0 0 3px rgba(47, 122, 79, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#D1D5DB';
              e.target.style.boxShadow = 'none';
            }}
            value={draft.minGoodFirstIssues === "" ? "" : draft.minGoodFirstIssues}
            onChange={(event) => handleNumericChange("minGoodFirstIssues", event.target.value)}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="topics" className="text-xs font-bold uppercase tracking-wide text-gray-700">
            Topics
          </label>
          <input
            id="topics"
            type="text"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2"
            style={{
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#2F7A4F';
              e.target.style.boxShadow = '0 0 0 3px rgba(47, 122, 79, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#D1D5DB';
              e.target.style.boxShadow = 'none';
            }}
            placeholder="e.g. cli, developer-tools"
            value={draft.topics}
            onChange={(event) => handleInputChange("topics", event.target.value)}
          />
          <p className="text-xs text-gray-600">Comma-separated topics. We'll add each as a GitHub topic filter.</p>
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-700">Archived repositories</span>
          <div className="grid gap-2">
            <label className="inline-flex items-center gap-2 text-sm text-gray-900 font-medium">
              <input
                type="radio"
                name="archived"
                value="exclude"
                checked={draft.archived === "exclude"}
                onChange={(event) => handleInputChange("archived", event.target.value)}
                className="h-4 w-4 border-gray-300"
                style={{
                  accentColor: '#2F7A4F'
                }}
              />
              Exclude archived
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-900 font-medium">
              <input
                type="radio"
                name="archived"
                value="include"
                checked={draft.archived === "include"}
                onChange={(event) => handleInputChange("archived", event.target.value)}
                className="h-4 w-4 border-gray-300"
                style={{
                  accentColor: '#2F7A4F'
                }}
              />
              Include archived
            </label>
            <label className="inline-flex items-center gap-2 text-sm text-gray-900 font-medium">
              <input
                type="radio"
                name="archived"
                value="only"
                checked={draft.archived === "only"}
                onChange={(event) => handleInputChange("archived", event.target.value)}
                className="h-4 w-4 border-gray-300"
                style={{
                  accentColor: '#2F7A4F'
                }}
              />
              Only archived
            </label>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="license" className="text-xs font-bold uppercase tracking-wide text-gray-700">
            License
          </label>
          <select
            id="license"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2"
            style={{
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#2F7A4F';
              e.target.style.boxShadow = '0 0 0 3px rgba(47, 122, 79, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#D1D5DB';
              e.target.style.boxShadow = 'none';
            }}
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
          <label htmlFor="updated" className="text-xs font-bold uppercase tracking-wide text-gray-700">
            Last updated
          </label>
          <select
            id="updated"
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2"
            style={{
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#2F7A4F';
              e.target.style.boxShadow = '0 0 0 3px rgba(47, 122, 79, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#D1D5DB';
              e.target.style.boxShadow = 'none';
            }}
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
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2"
              style={{
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2F7A4F';
                e.target.style.boxShadow = '0 0 0 3px rgba(47, 122, 79, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#D1D5DB';
                e.target.style.boxShadow = 'none';
              }}
              value={draft.updatedSince}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(event) => handleInputChange("updatedSince", event.target.value)}
            />
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="sort" className="text-xs font-bold uppercase tracking-wide text-gray-700">
              Sort by
            </label>
            <select
              id="sort"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2"
              style={{
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2F7A4F';
                e.target.style.boxShadow = '0 0 0 3px rgba(47, 122, 79, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#D1D5DB';
                e.target.style.boxShadow = 'none';
              }}
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
            <label htmlFor="order" className="text-xs font-bold uppercase tracking-wide text-gray-700">
              Order
            </label>
            <select
              id="order"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 disabled:opacity-50"
              style={{
                transition: 'all 0.2s ease'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#2F7A4F';
                e.target.style.boxShadow = '0 0 0 3px rgba(47, 122, 79, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#D1D5DB';
                e.target.style.boxShadow = 'none';
              }}
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

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            className="text-xs font-bold uppercase tracking-wide text-gray-600 transition"
            style={{
              transition: 'color 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.color = '#2F7A4F'}
            onMouseLeave={(e) => e.target.style.color = '#4B5563'}
            onClick={handleReset}
            disabled={disabled}
          >
            Reset filters
          </button>
          <button
            type="submit"
            className="rounded-lg px-4 py-2 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              backgroundColor: '#2F7A4F',
              transition: 'background-color 0.2s ease'
            }}
            onMouseEnter={(e) => !disabled && (e.target.style.backgroundColor = '#1F5A3A')}
            onMouseLeave={(e) => !disabled && (e.target.style.backgroundColor = '#2F7A4F')}
            disabled={disabled}
          >
            Apply filters
          </button>
        </div>
      </form>
    </aside>
  );
}
