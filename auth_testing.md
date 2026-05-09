# Noxeal Auth Testing Playbook

## Endpoints
- POST /api/auth/register — { email, password, name } → sets httpOnly cookies, returns user
- POST /api/auth/login — { email, password } → sets httpOnly cookies, returns user
- POST /api/auth/logout — clears cookies
- GET /api/auth/me — returns current user (from cookie or Bearer token)
- POST /api/auth/refresh — issues new access cookie from refresh cookie

## Admin Credentials (seeded on startup)
- Email: admin@noxeal.com
- Password: Noxeal2026!
- Role: admin

## MongoDB Verification
mongosh
use test_database
db.users.find({role: "admin"}).pretty()
db.users.findOne({role: "admin"}, {password_hash: 1})  // should start with $2b$

## API Smoke Test
curl -c /tmp/cookies.txt -X POST http://localhost:8001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@noxeal.com","password":"Noxeal2026!"}'
curl -b /tmp/cookies.txt http://localhost:8001/api/auth/me

## Newsletter
- POST /api/newsletter/subscribe — { email } → 200 with subscription confirmation
- GET /api/newsletter/list — admin protected, returns subscribers

## Articles (sample seed)
- GET /api/articles — returns all articles (with optional ?category= ?search= ?trending=true)
- GET /api/articles/{slug} — single article
- GET /api/categories — returns category list with counts
