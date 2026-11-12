# Sona Public School website (v5)

Node + Express + MongoDB. Frontend is static (`public/`), served by Express. Everything below is free-tier friendly.

## Run locally
```
cp .env.example .env     # fill values
npm install
npm start                # http://localhost:3000
```
Admin (Principal) account is auto-created from ADMIN_EMAIL / ADMIN_PASSWORD on first start. Its display name comes from ADMIN_NAME (default: Niranjan Singh Tomar). The old default name "Principal" is renamed automatically on the next start.

## 1. Put real details (public/app.js, top of file)
Edit the `SCHOOL` object: principal name, phone, WhatsApp number (country code, no +), email, address. Currently set to the school's real details.
Also edit the Principal's message text in `public/index.html` (section `#about`) and replace `YOUR-DOMAIN` in `public/sitemap.xml`.

## 2. Deploy free (Render + MongoDB Atlas)
1. MongoDB Atlas free cluster -> connection string (Network Access: allow 0.0.0.0/0).
2. Push to GitHub. Render -> New Web Service. Build `npm install`, Start `npm start`, health check `/healthz`.
3. Env vars: MONGODB_URI, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD (+ email vars below).

## 3. Free email alerts + forgot-password (optional)
Render free blocks SMTP, so email goes through Brevo's HTTPS API (free plan).
1. Create a Brevo account, verify a sender email, create an API key.
2. Set env vars: `BREVO_API_KEY`, `MAIL_FROM` (the verified sender), `NOTIFY_EMAIL` (where enquiry alerts go), `BASE_URL` (your site URL).
Without these the site still works: the Principal resets teacher passwords from the dashboard ("Reset password"), and enquiries show in the dashboard.

## 4. Keep it awake (free)
Render free sleeps after 15 min idle. Create a free UptimeRobot (or cron-job.org) HTTP monitor on `https://YOUR-SITE.onrender.com/healthz` every 5 minutes.
Note: 750 free instance-hours/month covers one always-on service.

## 5. Custom domain
Domains are paid (~Rs 700-1000/year for .in). The free `onrender.com` address works fine until then. Render adds HTTPS free when you attach a domain.

## Notes
- Gallery photos: Principal only. Teachers upload homework PDFs only. Files (max 5 MB) are stored in MongoDB.
- Homework auto-hides 7 days after due date (30 days after posting if no due date). Today's posts show "New".
- Staff pages: login is at `#staff`, teacher registration is its own page at `#register`.
- Home photos: tap/click any photo to open it full size (arrows, swipe, Esc to close).
- Dashboard: teachers list export (CSV, opens in Excel) and enquiry export to CSV (opens in Excel), text-data backup download, visitor count.
- Free Atlas has 512 MB: remove old photos/PDFs occasionally.
