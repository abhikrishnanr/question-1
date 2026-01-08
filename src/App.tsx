import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import Spinner from "./components/Spinner";
import UserTable from "./components/UserTable";
import type { ApiResponse, User } from "./lib/types";

const API_URL = "https://python.sicsglobal.com/userdetails_api/users";

const App: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchUsers = async () => {
      setLoading(true);
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
        setLoading(false);
      }
    };

    fetchUsers();

    return () => {
      controller.abort();
    };
  }, []);

  const deferredQuery = useDeferredValue(query);

  const filteredUsers = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();
    if (!normalized) {
      return users;
    }
    return users.filter((user) =>
      user.name.toLowerCase().includes(normalized)
    );
  }, [deferredQuery, users]);

  const handleDelete = (user: User) => {
    setUsers((prev) => prev.filter((item) => item !== user));
  };

  return (
    <div className="app min-h-screen">
      <header className="hero">
        <div className="hero__content">
          <p className="eyebrow">User Management Dashboard</p>
          <h1>People, organized with color and clarity.</h1>
          <p className="subtitle">
            Search, review, and keep your directory sparkling with a delightful
            experience.
          </p>
        </div>
        <div className="hero__glow" aria-hidden="true" />
      </header>

      <main className="main">
        <section className="controls" aria-label="Search users">
          <label className="search-label" htmlFor="search">
            Search by name
          </label>
          <div className="search-input-wrapper">
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
            <span className="search-hint" aria-hidden="true">
              {deferredQuery.length > 0
                ? `Filtering ${filteredUsers.length} users`
                : "Showing all users"}
            </span>
          </div>
        </section>

        <section className="content" aria-live="polite">
          {loading && <Spinner label="Loading users" />}
          {!loading && error && (
            <div className="error" role="alert">
              <p>We hit a snag: {error}</p>
              <p>Try refreshing the page to fetch users again.</p>
            </div>
          )}
          {!loading && !error && (
            <UserTable users={filteredUsers} onDelete={handleDelete} />
          )}
        </section>
      </main>
    </div>
  );
};

export default App;
