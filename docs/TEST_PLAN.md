# ADR Platform — QA Test Plan

National Digital Aerodrome Data Repository (ADR) — NAMA.
This plan covers everything **implemented and deployed** to date. Cases are grouped
by module. Each case lists the role, steps, and expected result. Read **§9 Known
limitations** before logging bugs so you don't raise issues on features not yet built.

---

## 1. Environment

| What | URL |
|---|---|
| Frontend (web app) | http://79.143.191.22:1908 |
| Backend API | http://79.143.191.22:1906/api/v1 |
| API docs (Swagger) | http://79.143.191.22:1906/api/docs |
| Health check | http://79.143.191.22:1906/health |

Use a desktop browser (Chrome/Edge/Brave). Keep DevTools → Network open when verifying API behavior.

## 2. Test accounts

All passwords: **`testpass123`**

| Username | Role | Lands on | Scope |
|---|---|---|---|
| `admin` | System Admin | /admin | Everything |
| `operator_los` | ATC Operator | /operator | Lagos (DNMM) |
| `operator_abv` | ATC Operator | /operator | Abuja (DNAA) |
| `supervisor_los` | Supervisor | /supervisor | Lagos (DNMM) |
| `supervisor_abv` | Supervisor | /supervisor | Abuja (DNAA) |
| `nama` | NAMA Management | /nama | National |
| `ncaa` | NCAA Officer | /ncaa | National (read) |
| `faan` | FAAN Officer | /faan | Chargeable movements |
| `airline_arik` | Airline User | /airlines | Arik only |
| `airline_airpeace` | Airline User | /airlines | Air Peace only |
| `executive` | Executive | /executive | National (read) |

## 3. Pre-test setup (admin / devops)
- Backend + DB + Redis running; migrations applied; seed users + reference data loaded.
- Confirm `GET /health` → 200 and `GET /api/v1/strips/active` → 401 (route exists).

---

## 4. Authentication & access control

| # | Role | Steps | Expected |
|---|---|---|---|
| AUTH-1 | any | Go to the app, log in with valid creds | Redirected to the role's home page (table above) |
| AUTH-2 | any | Log in with wrong password | "Invalid credentials" / 401; no redirect |
| AUTH-3 | operator | While logged in, manually visit `/admin` | Blocked/redirected — operators can't see admin |
| AUTH-4 | any | Click Sign Out | Returned to login; protected pages no longer reachable |
| AUTH-5 | any | Log in, leave idle, keep using after a while | Session stays valid; expired token silently refreshes (no surprise logout) |
| AUTH-6 | airline_arik | Open Airlines portal | Only Arik's data is visible (never other airlines') |

---

## 5. Tower Operations — the live Strip-Board (flagship)

**Login:** `operator_los` / `testpass123` → `/operator`. **Precondition:** an open shift (see §6 SHIFT-1 first; the board shows "ON DUTY / Live board connected" at the bottom).

| # | Steps | Expected |
|---|---|---|
| STRIP-1 | Observe the board | Two lanes — **Departures** (left), **Arrivals** (right) — plus a search bar, DEP/ARR/OVR selector, "+ New Strip". Footer shows "Live board connected" and counters. |
| STRIP-2 | Click **+ New Strip** | A form opens with: flight type, **Callsign**, flight number, rule, Airline, Aircraft type, Registration, Origin, Destination, souls/fuel/cargo |
| STRIP-3 | Fill **Callsign `ABV123`**, type Departure, pick Airline/Aircraft/Origin/Destination → **Create strip** | The strip appears in the **Departures** lane at phase **D1 (Clearance Issued)**, showing `D1 · 1/8` |
| STRIP-4 | On the strip card, click **Advance** repeatedly | Phase advances one step per click: D1→D2→…→D8. Each click is instant; progress counter increments |
| STRIP-5 | Try to advance past the last phase (D8) | No further advance; card shows "Terminal" |
| STRIP-6 | Reach the terminal phase (D8 for dep / A7 for arr) | Strip **closes & disappears** from the board; a toast confirms a **Movement was emitted**; it now appears in **History** |
| STRIP-7 | Create an **Arrival** strip (callsign `AFR1234`) and run A1→A7 | Same behavior in the Arrivals lane; emits a movement at A7 |
| STRIP-8 | Create an **Overflight** (OVR) strip | Appears in an Overflight drawer at bottom; phases O1→O2→O3; the waypoint (map-pin) button logs extra waypoints at O2 |
| STRIP-9 | On an open strip, click **Remark** (speech icon), enter text | Remark saved (no page reload), tagged to the current phase |
| STRIP-10 | On an open strip, click **Divert** (corner-arrow), enter a reason | Strip flagged "DIVERTED — supervisor review"; stays on board |
| STRIP-11 | On an open strip, click **Cancel** (X) → confirm "Sure?" → enter reason | Strip removed (discarded); **no** movement emitted |
| STRIP-12 | Create a strip with callsign `TEST` and run it to terminal | Movement emits but lands **FLAGGED** with validation error "Callsign 'TEST' does not match ICAO format" (this is correct behavior) |
| STRIP-13 | **Live board:** open the board in two browser windows (same operator). Create/advance a strip in window A | Window B updates within ~1–2s without refresh (Server-Sent Events) |
| STRIP-14 | In the search box, type a callsign you've used before | A "scheduled/recent flights" dropdown lists matching callsigns to load with one click |
| STRIP-15 | Try to open the board with **no open shift** | Blocked — you're redirected to start a shift first |

---

## 6. Shift management

**Login:** `operator_los` → **Shift Log**.

| # | Steps | Expected |
|---|---|---|
| SHIFT-1 | Start a shift (pick Morning/Afternoon/Night, optional notes) | Active shift card shows type, start time, live duration; board becomes usable |
| SHIFT-2 | End the shift (optional handover notes) | Shift moves to history with end time + duration |
| SHIFT-3 | View shift history | Past shifts listed (type, start, end, duration, aerodrome) |

---

## 7. Movements lifecycle & supervisor review

| # | Role | Steps | Expected |
|---|---|---|---|
| MOVE-1 | operator_los | After emitting movements (§5), open **History** | Emitted movements listed; filter by callsign/date/status/type; click a row → detail modal |
| MOVE-2 | operator_los | Open a movement detail | Shows route, times (AOBT/ATOT/ATD or ATA/ALDT/AIBT), souls/fuel, validation flags, attribution |
| SUP-1 | supervisor_los | Open **/supervisor** | Pending queue = Submitted + Flagged movements for DNMM; KPI counts shown |
| SUP-2 | supervisor_los | Open a pending movement → **Approve** with remarks (≥5 chars) | Status → Approved; recorded with supervisor + timestamp |
| SUP-3 | supervisor_los | Open a flagged movement → **Reject** with reason | Status → Rejected |
| SUP-4 | supervisor_los | Try to approve a movement **you entered** | Blocked (segregation of duty — can't approve own captures) |
| SUP-5 | supervisor_abv | Confirm you only see **Abuja** movements | No Lagos movements visible |

---

## 8. Portals & dashboards

| # | Role | Steps | Expected |
|---|---|---|---|
| AIS-1 | operator_los | Open **AIS Queue** | Pre-populated flights awaiting confirmation; "Confirm" removes from queue; "Review" opens detail |
| EXE-1 | executive | Open **/executive** | KPI cards (total movements, arrivals, safety score, compliance rate), trend chart, top aerodromes/airlines |
| NAMA-1 | nama | Open **/nama** | National dashboard; aerodrome filter changes KPIs/tables |
| NCAA-1 | ncaa | Open **/ncaa** → Safety Feed | Flagged movements with severity; aerodrome filter |
| NCAA-2 | ncaa | NCAA → Compliance tab | Aggregate completeness / flag-resolution stats; by-aerodrome table |
| FAAN-1 | faan | Open **/faan** → Billing | Billable/billed/unbilled counts; by-aerodrome table |
| FAAN-2 | faan | FAAN → Movements | Chargeable movements; "Is Billed" flag; row → detail |
| AIR-1 | airline_arik | Open **/airlines** | Read-only list of Arik's movements only |
| ADMIN-1 | admin | Open **/admin** → Users | List/search/filter users; create a user; edit a user |
| REP-1 | nama/faan | Open **Reports** → Generate (pick type, dates, format) | Job submitted; status polls Pending→Completed; download link appears |
| REP-2 | any | Reports → History | Past reports listed with status + download for completed |
| NOTIF-1 | any | Open **Inbox / Notifications** | Notification list; "mark read" / "mark all read"; unread badge in header updates |

---

## 9. Known limitations (DO NOT log as bugs)

These are **not yet built / partial** in this release:

- **Inline strip validation** — a bad callsign is only flagged *after* the movement is emitted (at terminal phase), not live as you type on the board.
- **Callsign dropdown** lists only flights it already knows (recent movements / posted DOP). On a fresh system it will mostly be empty until history builds — typing a new callsign is expected.
- **Daily Operations Plan (DOP)** — backend + airline posting API exist, but there is **no DOP posting screen** in the Airlines portal yet, so the board's "scheduled" suggestions will be empty.
- **Offline capture** (edge cache / queue-and-forward on WAN loss) — not implemented.
- **Airlines portal** is read-only (no dispute filing, no DOP form).
- **NCAA audit-pack export, FAAN reconciliation/revenue-assurance, standards exports (FIXM/AIXM/AIDX)** — not implemented.
- **MFA / account lockout / password policy** — not implemented.
- **Reports**: the full 12-report catalogue and scheduled-report UI are partial.
- Movement lifecycle uses DRAFT/SUBMITTED/FLAGGED/UNDER_REVIEW/APPROVED/REJECTED (the FRD's PROVISIONAL/SUPERSEDED/DISCARDED states are not yet modelled).

## 10. Bug report template
```
Title:
Environment: 79.143.191.22:1908  (commit/version: GET /openapi.json → version)
Role / account:
Steps to reproduce:
Expected:
Actual:
Network tab (status + URL of failing request):
Screenshot:
Severity: S1 blocker / S2 major / S3 minor / S4 cosmetic
```
