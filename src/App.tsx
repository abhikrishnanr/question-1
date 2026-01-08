import React, { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Spinner from "./components/Spinner";
import UserTable from "./components/UserTable";
import type { ApiResponse, User } from "./lib/types";

const API_URL = "https://python.sicsglobal.com/userdetails_api/users";
const CACHE_KEY = "users-cache";
const CACHE_TTL_MS = 5 * 60 * 1000;

type CachedUsers = {
  timestamp: number;
  data: User[];
};

const readCachedUsers = () => {
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (!cached) {
    return null;
  }
  try {
    const parsed = JSON.parse(cached) as CachedUsers;
    if (!parsed || !Array.isArray(parsed.data) || typeof parsed.timestamp !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
};

const writeCachedUsers = (data: User[]) => {
  const payload: CachedUsers = { data, timestamp: Date.now() };
  sessionStorage.setItem(CACHE_KEY, JSON.stringify(payload));
};

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<string | null>(null);
  const [isUsingCachedData, setIsUsingCachedData] = useState(false);
  const filtersRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const buildErrorMessage = (fetchError: unknown) => {
      if (!navigator.onLine) {
        return "You're offline. Reconnect to load the staff roster.";
      }
      if (fetchError instanceof Error) {
        if (fetchError.message.startsWith("Request failed")) {
          return "The staff service isn't responding right now. Please try again in a moment.";
        }
        if (fetchError.message === "Invalid API response") {
          return "The roster data looks incomplete. Please refresh or try again shortly.";
        }
      }
      return "We couldn't load the staff roster. Please refresh and try again.";
    };

    const fetchUsers = async (showLoading: boolean, hasCachedData: boolean) => {
      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      try {
        const response = await fetch(API_URL, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload: ApiResponse = await response.json();
        if (!payload || !Array.isArray(payload.data)) {
          throw new Error("Invalid API response");
        }

        setUsers(payload.data);
        writeCachedUsers(payload.data);
        setIsUsingCachedData(false);
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") {
          return;
        }
        setError(buildErrorMessage(fetchError));
        if (!hasCachedData) {
          setUsers([]);
          setQuery("");
          setSelectedCity("");
          setSelectedCompany("");
        }
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    };

    const cached = readCachedUsers();
    const isStale = !cached || Date.now() - cached.timestamp > CACHE_TTL_MS;

    const hasCachedData = Boolean(cached?.data?.length);

    if (cached) {
      setUsers(cached.data);
      setIsUsingCachedData(true);
      setLoading(false);
    }

    if (!cached || isStale) {
      fetchUsers(!cached, hasCachedData);
    }

    return () => {
      controller.abort();
    };
  }, []);

  const deferredQuery = useDeferredValue(query);

  const searchIndex = useMemo(
    () =>
      users.map((user) => ({
        user,
        searchName: user.name.toLowerCase(),
      })),
    [users]
  );

  const filteredUsers = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    const normalizedCity = selectedCity.trim().toLowerCase();
    const normalizedCompany = selectedCompany.trim().toLowerCase();
    const filteredByQuery = normalized
      ? searchIndex
          .filter((entry) => entry.searchName.includes(normalized))
          .map((entry) => entry.user)
      : users;

    return filteredByQuery.filter((user) => {
      if (normalizedCity && user.address?.city?.toLowerCase() !== normalizedCity) {
        return false;
      }
      if (normalizedCompany && user.company?.name?.toLowerCase() !== normalizedCompany) {
        return false;
      }
      return true;
    });
  }, [deferredQuery, searchIndex, users, selectedCity, selectedCompany]);

  const handleDelete = useCallback((user: User) => {
    setUsers((prev) => prev.filter((item) => item !== user));
  }, []);

  const totalUsers = users.length;
  const filteredTotal = filteredUsers.length;

  const buildCounts = useCallback((entries: User[], getKey: (user: User) => string | undefined) => {
    const counts = new Map<string, number>();
    entries.forEach((user) => {
      const key = getKey(user);
      if (!key) {
        return;
      }
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, []);

  const cityCounts = useMemo(
    () => buildCounts(users, (user) => user.address?.city),
    [buildCounts, users]
  );
  const companyCounts = useMemo(
    () => buildCounts(users, (user) => user.company?.name),
    [buildCounts, users]
  );
  const filteredCityCounts = useMemo(
    () => buildCounts(filteredUsers, (user) => user.address?.city),
    [buildCounts, filteredUsers]
  );
  const filteredCompanyCounts = useMemo(
    () => buildCounts(filteredUsers, (user) => user.company?.name),
    [buildCounts, filteredUsers]
  );

  const uniqueCities = cityCounts.length;
  const uniqueCompanies = companyCounts.length;
  const topCities = filteredCityCounts.slice(0, 5);
  const topCompanies = filteredCompanyCounts.slice(0, 5);
  const maxCityCount = topCities[0]?.[1] ?? 0;
  const maxCompanyCount = topCompanies[0]?.[1] ?? 0;
  const filtersDisabled = loading || (!users.length && Boolean(error));
  const hasActiveFilters =
    deferredQuery.trim().length > 0 || selectedCity.trim() || selectedCompany.trim();

  const scrollToSection = useCallback((section: React.RefObject<HTMLElement | null>) => {
    section.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleExport = useCallback((entries: User[], label: string) => {
    if (entries.length === 0) {
      setExportStatus("No staff profiles are available to export.");
      return;
    }

    const header = ["Name", "Email", "City", "Company"];
    const csvRows = [
      header,
      ...entries.map((user) => [
        user.name ?? "",
        user.email ?? "",
        user.address?.city ?? "",
        user.company?.name ?? "",
      ]),
    ]
      .map((row) =>
        row
          .map((value) => `"${value.replace(/"/g, "\"\"")}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvRows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const dateStamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `cdipd-roster-${dateStamp}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    setExportStatus(`Exported ${entries.length} profiles from the ${label}.`);
  }, []);

  return (
    <div className="app min-h-screen">
      <header className="topbar">
        <div className="brand">
          <div className="brand__icon" aria-hidden="true">
            CD
          </div>
          <div className="brand__text">
            <p className="brand__name">CDIPD International</p>
            <p className="brand__tagline">Connecting all staff across the globe</p>
          </div>
        </div>
      </header>

      <section className="hero-card">
        <div className="hero-card__content">
          <p className="eyebrow">Global workforce dashboard</p>
          <h1>One workspace for every office, timezone, and team.</h1>
          <p className="subtitle">
            Monitor collaboration health, discover regional trends, and keep every
            team member aligned with real-time people data.
          </p>
          <div className="hero-card__actions">
            <button
              type="button"
              className="button button--primary"
              onClick={() => scrollToSection(filtersRef)}
            >
              Launch workforce pulse
            </button>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => handleExport(users, "full roster")}
            >
              Download report
            </button>
          </div>
        </div>
        <div className="hero-card__stats">
          <div className="stat-card">
            <p className="stat-card__label">Total employees</p>
            <p className="stat-card__value">{totalUsers}</p>
            <p className="stat-card__meta">Filtered view: {filteredTotal}</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__label">Cities connected</p>
            <p className="stat-card__value">{uniqueCities}</p>
            <p className="stat-card__meta">Regional hubs synced</p>
          </div>
          <div className="stat-card">
            <p className="stat-card__label">Partner companies</p>
            <p className="stat-card__value">{uniqueCompanies}</p>
            <p className="stat-card__meta">Shared workspaces</p>
          </div>
        </div>
        <div className="hero-card__glow" aria-hidden="true" />
      </section>

      <main className="main-grid">
        <section className="insights-grid" aria-label="Infographics">
          <div className="info-card">
            <div className="info-card__header">
              <div className="info-card__icon">🌍</div>
              <div>
                <p className="info-card__title">Employees by city</p>
                <p className="info-card__subtitle">
                  Top locations based on the current filter.
                </p>
              </div>
            </div>
            <div className="chart-list" role="list">
              {topCities.length === 0 ? (
                <p className="microcopy">No city data available yet.</p>
              ) : (
                topCities.map(([city, count]) => (
                  <div className="chart-list__row" role="listitem" key={city}>
                    <div className="chart-list__label">{city}</div>
                    <div className="chart-list__bar">
                      <span
                        style={{
                          width: maxCityCount ? `${(count / maxCityCount) * 100}%` : "0%",
                        }}
                      />
                    </div>
                    <div className="chart-list__value">{count}</div>
                  </div>
                ))
              )}
            </div>
            <p className="microcopy">
              Use this to prioritize staffing updates for the busiest regions.
            </p>
          </div>
          <div className="info-card">
            <div className="info-card__header">
              <div className="info-card__icon">📈</div>
              <div>
                <p className="info-card__title">Employees by company</p>
                <p className="info-card__subtitle">
                  Distribution across partner organizations.
                </p>
              </div>
            </div>
            <div className="chart-list chart-list--alt" role="list">
              {topCompanies.length === 0 ? (
                <p className="microcopy">No company data available yet.</p>
              ) : (
                topCompanies.map(([company, count]) => (
                  <div className="chart-list__row" role="listitem" key={company}>
                    <div className="chart-list__label">{company}</div>
                    <div className="chart-list__bar">
                      <span
                        style={{
                          width: maxCompanyCount
                            ? `${(count / maxCompanyCount) * 100}%`
                            : "0%",
                        }}
                      />
                    </div>
                    <div className="chart-list__value">{count}</div>
                  </div>
                ))
              )}
            </div>
            <p className="microcopy">
              Balance teams by reviewing which partners are growing fastest.
            </p>
          </div>
          <div className="info-card">
            <div className="info-card__header">
              <div className="info-card__icon">⚡</div>
              <div>
                <p className="info-card__title">Filter coverage</p>
                <p className="info-card__subtitle">How much of the roster you see.</p>
              </div>
            </div>
            <div className="stat-grid">
              <div>
                <p className="stat-grid__label">Showing</p>
                <p className="stat-grid__value">{filteredTotal}</p>
              </div>
              <div>
                <p className="stat-grid__label">Total roster</p>
                <p className="stat-grid__value">{totalUsers}</p>
              </div>
              <div>
                <p className="stat-grid__label">Coverage</p>
                <p className="stat-grid__value">
                  {totalUsers > 0 ? Math.round((filteredTotal / totalUsers) * 100) : 0}%
                </p>
              </div>
            </div>
            <p className="microcopy">
              Adjust filters to refine the view and keep your focus tight.
            </p>
          </div>
        </section>

        <section className="filters-card" aria-label="Filters" ref={filtersRef}>
          <div className="filters-card__header">
            <div>
              <p className="filters-card__title">Filter the people graph</p>
              <p className="filters-card__subtitle">
                Filter by city, company, or name in seconds.
              </p>
            </div>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => {
                setQuery("");
                setSelectedCity("");
                setSelectedCompany("");
              }}
              disabled={filtersDisabled}
            >
              Reset filters
            </button>
          </div>
          <div className="filters-grid">
            <label className="field">
              <span>Search by name</span>
              <input
                id="search"
                name="search"
                type="search"
                placeholder="Type a name..."
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="search-input"
                autoComplete="off"
                disabled={filtersDisabled}
              />
            </label>
            <label className="field">
              <span>City</span>
              <input
                className="select-input"
                type="search"
                list="city-options"
                placeholder={`All cities (${uniqueCities})`}
                value={selectedCity}
                onChange={(event) => setSelectedCity(event.target.value)}
                autoComplete="off"
                disabled={filtersDisabled}
              />
              <datalist id="city-options">
                {cityCounts.map(([city]) => (
                  <option key={city} value={city} />
                ))}
              </datalist>
              <p className="microcopy">Searchable list with {uniqueCities} cities.</p>
            </label>
            <label className="field">
              <span>Company</span>
              <input
                className="select-input"
                type="search"
                list="company-options"
                placeholder={`All companies (${uniqueCompanies})`}
                value={selectedCompany}
                onChange={(event) => setSelectedCompany(event.target.value)}
                autoComplete="off"
                disabled={filtersDisabled}
              />
              <datalist id="company-options">
                {companyCounts.map(([company]) => (
                  <option key={company} value={company} />
                ))}
              </datalist>
              <p className="microcopy">Searchable list with {uniqueCompanies} partners.</p>
            </label>
          </div>
          <div className="search-hint" aria-live="polite">
            {hasActiveFilters
              ? `Showing ${filteredUsers.length} of ${totalUsers} staff profiles`
              : "Showing all staff profiles"}
          </div>
        </section>

        <section className="content" aria-live="polite">
          <div className="section-header">
            <div>
              <h2>People directory</h2>
              <p>Reach anyone in the CDIPD International network instantly.</p>
            </div>
            <button
              type="button"
              className="button button--ghost"
              onClick={() => handleExport(filteredUsers, "filtered roster")}
              disabled={loading}
            >
              Export roster
            </button>
          </div>
          {exportStatus && (
            <p className="export-hint" role="status">
              {exportStatus}
            </p>
          )}
          {loading && <Spinner label="Loading users" />}
          {!loading && error && (
            <div className="error" role="alert">
              <p>{error}</p>
              <p>
                {isUsingCachedData
                  ? "You're viewing the last saved roster while we reconnect."
                  : "Try refreshing the page to fetch users again."}
              </p>
            </div>
          )}
          {!loading && (!error || isUsingCachedData) && (
            <UserTable rowData={{ users: filteredUsers, onDelete: handleDelete }} />
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
