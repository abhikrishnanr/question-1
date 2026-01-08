import React, { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
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
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedCompany, setSelectedCompany] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchUsers = async (showLoading: boolean) => {
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
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") {
          return;
        }
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Something went wrong while fetching users."
        );
      } finally {
        if (showLoading) {
          setLoading(false);
        }
      }
    };

    const cached = readCachedUsers();
    const isStale = !cached || Date.now() - cached.timestamp > CACHE_TTL_MS;

    if (cached) {
      setUsers(cached.data);
      setLoading(false);
    }

    if (!cached || isStale) {
      fetchUsers(!cached);
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
    const filteredByQuery = normalized
      ? searchIndex
          .filter((entry) => entry.searchName.includes(normalized))
          .map((entry) => entry.user)
      : users;

    return filteredByQuery.filter((user) => {
      if (selectedCity !== "all" && user.address?.city !== selectedCity) {
        return false;
      }
      if (selectedCompany !== "all" && user.company?.name !== selectedCompany) {
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
        <div className="topbar__actions">
          <button type="button" className="button button--ghost">
            View insights
          </button>
          <button type="button" className="button button--primary">
            Invite staff
          </button>
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
            <button type="button" className="button button--primary">
              Launch workforce pulse
            </button>
            <button type="button" className="button button--ghost">
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

        <section className="filters-card" aria-label="Filters">
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
                setSelectedCity("all");
                setSelectedCompany("all");
              }}
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
              />
            </label>
            <label className="field">
              <span>City</span>
              <select
                className="select-input"
                value={selectedCity}
                onChange={(event) => setSelectedCity(event.target.value)}
              >
                <option value="all">All cities ({uniqueCities})</option>
                {cityCounts.map(([city, count]) => (
                  <option key={city} value={city}>
                    {city} ({count})
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Company</span>
              <select
                className="select-input"
                value={selectedCompany}
                onChange={(event) => setSelectedCompany(event.target.value)}
              >
                <option value="all">All companies ({uniqueCompanies})</option>
                {companyCounts.map(([company, count]) => (
                  <option key={company} value={company}>
                    {company} ({count})
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="search-hint" aria-live="polite">
            {deferredQuery.length > 0
              ? `Filtering ${filteredUsers.length} staff profiles`
              : "Showing all staff profiles"}
          </div>
        </section>

        <section className="content" aria-live="polite">
          <div className="section-header">
            <div>
              <h2>People directory</h2>
              <p>Reach anyone in the CDIPD International network instantly.</p>
            </div>
            <button type="button" className="button button--ghost">
              Export roster
            </button>
          </div>
          {loading && <Spinner label="Loading users" />}
          {!loading && error && (
            <div className="error" role="alert">
              <p>We hit a snag: {error}</p>
              <p>Try refreshing the page to fetch users again.</p>
            </div>
          )}
          {!loading && !error && (
            <UserTable rowData={{ users: filteredUsers, onDelete: handleDelete }} />
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
