# Sona Public School website

Node + Express + MongoDB. Frontend is static (public/), served by Express.

## Run locally
```
cp .env.example .env   # fill values
npm install
npm start              # http://localhost:3000
```
Admin account is auto-created from ADMIN_EMAIL / ADMIN_PASSWORD on first start.

## Deploy (Render, free)
1. Create free MongoDB Atlas cluster -> copy connection string (allow 0.0.0.0/0 in Network Access).
2. Push this folder to GitHub.
3. Render -> New Web Service -> pick repo. Build: `npm install`, Start: `npm start`.
4. Add env vars: MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD.
5. Health check path: /healthz

## Before handing over
- Edit SCHOOL object at top of public/app.js (real phone, email, address).
- Login at #staff with admin credentials -> add gallery photos (image URLs), announcements.
- Teachers register at #staff; admin approves them in the dashboard.
