To: Sristi Innovative Team
From: Abhi Krishnan R, Lead UI/UX Developer, CDIPD
Subject: UI/UX focus and React learning journey

Hello,

My name is Abhi Krishnan R. I am basically from the UI/UX side, and I switched to React as an interest in study. I did not know how the syntax of a function works at first, but over time I learned what React is and what its hooks and functions do. I tried to create applications with those prompts and lessons.

Here I tried to make the app a heavy data handling page that uses various React features to optimize, secure, and load gracefully. I have hosted this in Vercel, and the live URL is: _____

Points on what I did to improve performance, meet the requirements in the question, and how it was handled:
- Cached API responses in session storage with a TTL to reduce repeat fetches and improve load speed.
- Used an AbortController and clear error states to keep the UI responsive and safe during network issues.
- Added deferred search input and memoized filters to keep filtering fast as the dataset grows.
- Virtualized the user list with a fixed-size window to keep rendering smooth for large data.
- Built derived analytics (counts by city/company) with memoization to avoid unnecessary recalculations.
- Implemented export to CSV for the filtered and full roster, matching the data-handling requirements.
- Provided filter reset, filtered totals, and coverage metrics to make the data easier to explore.

Thank you,
Abhi Krishnan R
