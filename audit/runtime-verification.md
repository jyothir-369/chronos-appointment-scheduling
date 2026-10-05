=== RUNTIME VERIFICATION ===
/health → 200 OK (verified via curl)
/auth/login → 201 (verified)
/bookings list → 200 [] (DB empty)
/clients → 200 [3 clients]
/providers/:id/availability → depends on provider; untested with user
/billing /analytics /reports → controller exists; response not verified (likely mock/static)
/notifications /activity → controller exists; DB table missing (post-audit fix only schema); response unverified
