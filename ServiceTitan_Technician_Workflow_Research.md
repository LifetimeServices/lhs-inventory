# ServiceTitan Technician Workflow — Field Service Management Research Report

**Research Date:** April 4, 2026
**Purpose:** Comprehensive documentation of the complete ServiceTitan technician workflow for reference when building a competing or complementary HR/field service platform.

---

## Table of Contents
1. [The Complete Job Status Flow](#1-the-complete-job-status-flow)
2. [Clock In / Clock Out](#2-clock-in--clock-out)
3. [Dispatch Workflow](#3-dispatch-workflow)
4. [En Route Status & GPS Tracking](#4-en-route-status--gps-tracking)
5. [Arriving / On Site](#5-arriving--on-site)
6. [Job Completion (Close Out)](#6-job-completion-close-out)
7. [Multiple Jobs in a Day](#7-multiple-jobs-in-a-day)
8. [Timesheet Correlation & Pay Calculation](#8-timesheet-correlation--pay-calculation)
9. [Dispatch Board (Dispatcher/Manager View)](#9-dispatch-board-dispatchermanager-view)
10. [Summary Comparison Table](#10-summary-comparison-table)
11. [Sources](#11-sources)

---

## 1. The Complete Job Status Flow

ServiceTitan separates two parallel status tracks: the **Job Status** (overall container) and the **Appointment Status** (each individual visit). A single job can have multiple appointments.

### Job-Level Statuses
| Status | Meaning |
|--------|---------|
| **Open** | Job has been created/booked, work has not started |
| **Scheduled** | Job has at least one appointment with a date/time assigned |
| **Dispatched** | At least one appointment has a technician actively dispatched |
| **Working** | Technician has arrived and is actively on site |
| **On Hold** | Job paused by office (cannot place Dispatched, Working, Canceled, or Done appointments on hold) |
| **Completed** | All appointments are in Done status; job is closed |
| **Canceled** | Job was canceled before or during service |

### Appointment-Level Statuses (the granular track)
| Status | Trigger |
|--------|---------|
| **Not Scheduled** | Appointment exists but no date/tech assigned yet |
| **Scheduled** | Date and technician assigned; not yet dispatched |
| **Dispatched** | Dispatcher or tech taps Dispatch in the app |
| **Working** | Tech taps Arrive at the job site |
| **Paused** | Tech pauses the appointment mid-job |
| **Done** | Tech completes the appointment (taps Close Out > Complete) |
| **Canceled** | Appointment canceled |

**Key rule:** A job's overall progress is determined by how many of its appointments are in "Done" status. Appointment statuses transition automatically when you dispatch or arrive technicians, and also when technicians leave appointments or complete the job.

---

## 2. Clock In / Clock Out

### How Technicians Clock In

There are **three ways** a technician can start their clock:

1. **Manual Clock In (Mobile):** The technician opens ServiceTitan Mobile and taps "Clock In." They can also tap into a non-job event (meeting, training, shop time) using a Timesheet Code — this counts as a paid clock-in event.

2. **Dispatch-Triggered Automatic Clock In:** When a technician is dispatched to their **first job of the day**, ServiceTitan automatically creates a Clock In entry. The tech does not need to manually clock in first if this is configured.

3. **Office Clock In:** From the Dispatch Board, office employees can clock technicians in and out and put technicians on meal breaks. This is the fallback when techs forget to self-clock.

### Clock In Configuration Details
- Companies can configure whether the **first dispatch of the day automatically triggers a clock in**.
- There is a **"First Drive Setting"** in each technician's payroll profile: if a company does not want to pay the drive to the first job, they can set it to "Pay first drive only if technician is clocked in to a paid event." This means an explicit clock-in before dispatch is required for that drive to be paid.
- Technicians **cannot use a general clock-in to start paid hours** at the start of the day unless the account is specifically configured to allow it. If they need to be paid before the first dispatch, they should use a **paid Timesheet Code** (e.g., "Shop Time," "Morning Meeting").

### Timesheet Codes (Non-Job Events)
Companies can create custom Timesheet Codes for non-job activities:
- Examples: Meal Break, Training, Shop Time, PTO, Company Meeting, Vendor Run
- Codes can be marked as **paid** or **unpaid**
- Admins control which codes technicians can see and use in the mobile app

### Clock Out
- **Manual Clock Out (Mobile):** Tech taps Clock Out at the end of day.
- **Office Clock Out:** Dispatcher clicks Clock Out on the dispatch board.
- **Automatic Clock Out Rules:**
  - If a technician is **idle** (not working a job or clocked into any event) and **not clocked out** at midnight, ServiceTitan **automatically clocks them out at 11:59 PM**. Paid hours will NOT accrue up until midnight — they stop at the last activity.
  - If a technician is still actively working a job or non-job event at midnight, they are clocked out at 11:59 PM for that day and automatically clocked back in at 12:00 AM for the next day.
  - When auto-clock-out occurs, **ServiceTitan adjusts the Clock Out time to match the end time of the tech's last activity** for that day.

### Dispatch Board Visibility of Clock Status
- When a technician is clocked in, their row on the Dispatch Board shows them as available/active.
- Technician Shifts (scheduling display feature) show color-coded rows:
  - **Green line** = Regular shift (Schedule Board)
  - **Yellow line** = On-Call shift (Schedule Board)
  - **Gray line** = Time-off (Schedule Board)
  - On the Dispatch Board: Regular shifts show in white, On-Call is highlighted orange, Time-off is grayed out, no shift = light gray row
- **Note:** Technician Shifts are a scheduling display tool only — they do not directly affect the clock-in/out system or payroll calculations.

---

## 3. Dispatch Workflow

### Office/Dispatcher Side

1. The **Dispatch Board** shows all jobs and technicians. Jobs without assigned techs appear in the Job Tray (unassigned column).
2. The dispatcher **drags and drops** a job onto a technician's row, or selects a tech from the job record.
3. The dispatcher clicks **"Dispatch"** on the job/appointment. This action:
   - Changes the appointment status from "Scheduled" → **"Dispatched"**
   - Sends a **push notification** to the technician's mobile device
   - Sends an **automated SMS/email** to the customer (if configured) with the tech's name, photo, bio, and a real-time GPS tracking link
   - Creates a **Driving timesheet entry** that begins recording drive time
   - If the tech was not already clocked in, **automatically creates a Clock In entry**
   - The job card on the dispatch board updates visually

4. **Dispatch Pro (AI Mode):** ServiceTitan's AI-powered dispatching feature recommends the best technician for each job based on: technician route, current location, drive time, skill set, and potential revenue. Dispatchers can use it in advisory or full Auto Mode.

### Technician Side (Mobile App)

1. The technician receives a **push notification** on their device that a new job has been dispatched to them.
2. In the ServiceTitan Mobile app, the job appears in their **Schedule/Job Queue** with full job details:
   - Customer name, address, contact info
   - Job type and description
   - Notes from the CSR/dispatcher
   - Customer history, previous invoices, equipment on site, membership status
   - Any forms required for the job
3. The technician reviews all information before leaving.
4. When ready to leave, the tech taps **"Dispatch"** (or "On My Way") inside the job in the app — this confirms they are en route and triggers the GPS tracking and customer notification sequence.

---

## 4. En Route Status & GPS Tracking

### What Triggers "En Route"
When the technician taps "Dispatch" (or "On My Way") in the mobile app, the system:
- Confirms the appointment as actively **Dispatched / En Route**
- Begins recording the technician's GPS location in real time
- Sends the customer an automated SMS/text (if configured) with a message along the lines of: "Your [Company Name] representative, [Tech Name], is on the way to [Service Address]. See where your technician is: [Tech Tracker URL]"

### Customer-Facing Tracking
- The SMS includes a **real-time technician tracker link** — customers open it in a browser to see the tech's live GPS location on a map, updated as they drive.
- The customer sees the technician's name and photo.
- ServiceTitan reports this reduces customer complaints and no-show incidents.

### GPS Tracking Details
- ServiceTitan uses GPS from the technician's mobile device.
- GPS logs the technician's location while driving between jobs.
- On the **Dispatch Map** (shown below the Dispatch Board), dispatchers see all tech locations as live pins/icons.
- The **grey dotted line** on the Dispatch Board represents the drive path from when the tech dispatched until they arrived on site.
- ServiceTitan integrates with third-party GPS fleet tracking providers (GPS Insight, ClearPathGPS, Azuga) for vehicle-level GPS pings that sync into the dispatch map via the ServiceTitan API. These integrations map vehicle VINs to technician names.

### ETA Calculations
- **Map 2.0** (ServiceTitan's routing feature) shows real-time traffic and calculates drive time.
- Dispatchers can use this to optimize routing — assigning the closest available tech to newly booked jobs.
- The customer tracker link also shows an estimated arrival time based on current traffic.

---

## 5. Arriving / On Site

### How Arrival is Recorded

ServiceTitan offers two mechanisms:

**1. Arrive by GPS (Default — Automatic)**
- When a dispatched technician with a GPS-enabled device comes within **125 meters (approximately 410 feet)** of the job's service address, ServiceTitan **automatically marks them as Arrived**.
- Fallback: If GPS is unavailable, cellular triangulation is used (accurate within ~500 meters / 1/3 mile).
- This feature is **enabled by default** and can be toggled per account or per the Field Mobile App settings.

**2. Manual Arrive**
- If GPS is not working properly, the technician taps "Arrive" manually in the mobile app.
- The dispatcher can also manually mark the tech as arrived from the office.

### What Arrival Captures
- **Timestamp:** Exact date and time of arrival (stored in the job's audit trail)
- **GPS Coordinates:** The location where arrival was recorded
- **Arrival Window Compliance:** The system tracks whether the tech arrived within the scheduled arrival window (used for on-time performance reporting)

### What Happens When Tech Arrives
1. Appointment status changes from "Dispatched" → **"Working"**
2. The **Driving timesheet entry ends** (drive time is finalized)
3. A new **Working timesheet entry begins** (on-site / wrench time starts)
4. The Dispatch Board updates in real time — the job card changes to reflect "Working" status
5. The Activity Feed on the Dispatch Board shows "Arrived" with a timestamp

### Arrival Window
- An Arrival Window is a configurable range (e.g., 8 AM – 12 PM) shown to the customer and tracked in the system.
- The system compares the actual arrival timestamp against the window for on-time KPI tracking.

---

## 6. Job Completion (Close Out)

### Steps the Technician Goes Through

**Step 1: Perform the Work**
While on site, the tech has access in the mobile app to:
- Customer history, previous invoices, existing equipment, photos from prior visits
- Any **required forms** (inspection checklists, service agreements, permits, etc.)
- Ability to add equipment serviced/installed to the job record
- Real-time parts inventory check and parts ordering capability

**Step 2: Build/Confirm the Invoice**
- The tech opens the **Invoice** tab in the job
- Adds services performed, parts used, and any labor charges
- Can add **Recommended Services** (upsell items the customer didn't approve this visit)
- Presents the estimate/invoice to the customer on the device screen

**Step 3: Customer Approval & Signature**
- Customer reviews the invoice on the tech's device
- Customer provides a **digital signature** to approve the work
- Signature is timestamped and stored on the job record

**Step 4: Payment Collection**
- Tech collects payment via the mobile app: credit/debit card swipe, ACH, check, or cash
- Payment is recorded in the job record and syncs to accounting

**Step 5: Complete Required Forms**
- Mandatory forms (e.g., safety inspection, warranty registration) must be completed before close-out
- Forms can include photos, videos, notes, and signatures
- Completed forms can be emailed to the customer as PDFs

**Step 6: Close Out (Tap CLOSEOUT)**
- Tech taps **CLOSEOUT** at the bottom of the left sidebar in the app
- The system checks prerequisites:
  - Are all required forms completed?
  - Are all required signatures collected?
  - Are equipment details filled in?
  - Is additional work scheduled if needed?
- If prerequisites are not met, the system **blocks completion** and shows what is missing

**Step 7: Choose Completion Action**
At close-out, the technician is given options depending on account permissions and appointment configuration:
- **Complete the Job** — marks all remaining appointments done and closes the job entirely
- **Mark Appointment Done** — marks just this appointment as done (if more appointments remain on the job)
- **Mark Myself Done** — marks just this tech done at the appointment (if multiple techs are on the job)
- **Pause Appointment** — puts the appointment into Paused status (shown as yellow on Dispatch Board)
- **Schedule Additional Appointment** — books a follow-up visit before closing

**Step 8: Confirmation**
- The system shows a review screen: are any other techs still at this appointment? Are there more appointments on the job?
- Tech taps **COMPLETE JOB** to finalize

### What Happens at Completion
1. Appointment status → **"Done"**; Job status → **"Completed"** (if all appointments done)
2. The **Working timesheet entry ends** (wrench time is finalized)
3. The **Driving timesheet** for this job is also closed
4. If the tech has no more jobs for the day and is not clocked into a non-job event, paid hours for the day stop here
5. Invoice is posted and flows to accounting / Accounts Receivable
6. The Dispatch Board updates in real time; the job card moves to completed state

---

## 7. Multiple Jobs in a Day

### How ServiceTitan Handles Job-to-Job Transitions

When a technician completes one job and is dispatched to the next, here is the exact sequence:

1. Tech completes Job 1 → Working timesheet entry for Job 1 **ends**
2. If there is a gap before the next dispatch, that gap is recorded as **Idle Time**
3. Dispatcher assigns and dispatches the tech to Job 2
4. At the moment of dispatch for Job 2:
   - A new **Driving timesheet entry begins** for Job 2
   - If the tech was clocked into any non-job event or idle timesheet code, they are **automatically clocked out of that event** and their status changes to "Dispatched"
5. Tech arrives at Job 2 → Driving timesheet ends, new **Working timesheet begins** for Job 2
6. This Dispatch → Drive → Arrive → Work → Complete cycle **repeats for every job** throughout the day

### The Clock-In Persists Across the Day
- The technician's **overall clock-in for the day stays active** — they do not clock out and back in between jobs.
- The underlying timesheet events (Driving, Working, Idle, Non-job) are sub-entries within the active workday.
- Paid hours accumulate across all job and non-job events until the final clock-out.

### Idle Time Between Jobs
- The period after a technician finishes one job and before they are dispatched to the next is recorded as **Idle Time**.
- Companies configure whether idle time is **paid, partially paid, or unpaid** in their idle time settings.
- Example: Tech finishes Job 1 at 10:15 AM, dispatched to Job 2 at 10:40 AM → 25 minutes of idle time recorded.

---

## 8. Timesheet Correlation & Pay Calculation

### The Four Timesheet Entry Types

ServiceTitan creates timesheet entries automatically as technicians progress through their day:

| Timesheet Type | Created When | Ends When | Paid? |
|---------------|-------------|-----------|-------|
| **Driving** | Tech taps Dispatch (en route to job) | Tech taps Arrive at the job | Configurable |
| **Working** | Tech taps Arrive at the job | Tech taps Close Out / completes job | Yes (wrench time) |
| **Idle** | Technician finishes job/event and is waiting | Tech is dispatched to next job or clocks into a non-job event | Configurable (paid, partial, or unpaid) |
| **Non-Job Event** | Tech (or office) clocks into a Timesheet Code (meeting, training, meal break, etc.) | Tech clocks out of the event or is dispatched to a job | Per-code configuration (paid or unpaid) |

### Complete Event → Timesheet Mapping

| Event | Timesheet Impact |
|-------|----------------|
| Clock In (manual or via Timesheet Code) | Opens day's timesheet; clock-in timestamp recorded |
| First Dispatch (if not already clocked in) | Auto clock-in created; Driving entry begins |
| Arrive at Job | Driving entry ends; Working entry begins; arrival timestamp recorded |
| Pause Appointment | Working entry ends; job enters Paused status |
| Resume Appointment | New Working entry begins |
| Complete Job / Appointment Done | Working entry ends; wrench time finalized |
| Gap before next dispatch | Idle time entry created automatically |
| Next Dispatch | Idle time ends; new Driving entry begins |
| Non-job event (e.g., lunch break) | Separate Non-job entry created |
| Clock Out (manual or auto) | Closes the day; final timesheet record complete |
| Auto Clock Out (midnight) | System closes timesheet at 11:59 PM; adjusts to last activity |

### Fields Captured on Each Timesheet Entry
- Technician ID / Name
- Date
- Start Time (timestamp)
- End Time (timestamp)
- Duration (calculated)
- Type (Driving / Working / Idle / Non-job)
- Job ID (if job-related)
- Activity Description / Timesheet Code (for non-job events)
- GPS coordinates (for arrival and departure points)
- Pay Type (Regular / Overtime)

### Payroll Calculation
- **Pay Periods** are configurable (weekly, bi-weekly, etc.) and drive overtime calculations
- Overtime is calculated per company/state settings (configurable to comply with local labor law)
- At the end of a pay period, managers run **Timesheet Reports** to get:
  - Total hours worked per technician
  - Breakdown: driving time, working time, idle time, non-job time
  - Regular vs. overtime hours
  - Gross pay calculated based on hourly rate × hours by type
- ServiceTitan claims an average of **30–60 minutes saved per employee per month** on payroll prep by automating gross pay calculations
- Technicians can view their own timesheet in real time on the mobile app and flag discrepancies
- Managers can **edit, delete, or add timesheet entries** for any job — even jobs currently in progress

---

## 9. Dispatch Board (Dispatcher/Manager View)

### Layout
The Dispatch Board is accessed via the **Dispatch tab** in the main navigation:
- **Rows:** One row per technician, showing their name and scheduled shift window
- **Columns:** Time-based grid (hourly) across the day
- **Job Cards:** Appear in the appropriate row and time slot; show job type, customer name, address, duration
- **Dispatch Map (Map 2.0):** Below the board, shows all technician locations as live GPS pins

### Job Tray
The Job Tray (on the side) shows:
- **Unassigned jobs** — not yet dispatched to a tech
- **Unconfirmed jobs** — customer has not confirmed the appointment
- **Jobs on Hold** — paused/held jobs waiting for action
- Enables drag-and-drop assignment to technicians on the board

### Real-Time Status Visibility
The Dispatch Board shows live status for every job:
- **Unassigned** — no tech assigned
- **Unconfirmed** — appointment not confirmed by customer
- **Dispatched** — tech is en route
- **Working** — tech is on site
- **Paused** — job was paused mid-service
- **Done / Completed** — appointment finished

### Color Coding
| Color / Indicator | Meaning |
|-------------------|---------|
| White (job card) | Regular/active job |
| Blue (darker shade) | Appointment confirmed by customer |
| Green "Confirmed" badge | Confirmation received |
| Yellow (job card) | Appointment is Paused |
| Red outline (job card) | Alert requiring dispatcher action |
| Grey dotted line on map | Tech's drive path from dispatch to arrival |
| Green line (shift row) | Regular shift (Schedule Board) |
| Yellow line (shift row) | On-Call shift (Schedule Board) |
| Gray row | No shift assigned / time-off |
| Orange highlight (shift row) | On-Call window is currently active |
| Job progress circle (gray → green) | Percentage complete of the job |

### Live Activity Feed
A **Live Activity Feed** panel shows real-time updates:
- Technician Arrived (with timestamp)
- Technician Paused appointment
- Appointment Completed
- New job dispatched
- Allows dispatchers to stay current without watching every individual job card

### GPS / Map Features
- **Map 2.0:** Live map shows every technician as a pin with current GPS location
- Color-coded tags on map pins show which job each tech is assigned to
- Dispatchers can see job clustering and assign nearby techs to minimize drive time
- **Route Optimization ("Optimize Technician Route"):** Suggests the most efficient order for a tech's jobs for the day
- GPS logs are stored: where each tech was when dispatched, when they arrived, when they completed

### Dispatcher Actions From the Board (without leaving)
- Drag and drop jobs between technicians
- Reassign jobs
- Put jobs on hold
- Send mass text to all technicians
- Direct-message individual technicians
- View full job details
- Confirm appointments
- Clock technicians in or out
- Monitor Dispatch Pro AI recommendations

---

## 10. Summary Comparison Table

| Action | Who Does It | System Impact |
|--------|------------|--------------|
| Book a job | CSR / Office | Job created, appointment scheduled; appears on Dispatch Board |
| Assign tech to job | Dispatcher | Tech's name attached to appointment |
| Dispatch tech | Dispatcher or Tech (mobile) | Status → Dispatched; Driving timesheet begins; customer SMS sent; GPS tracking starts; auto clock-in if needed |
| Tech taps "On My Way" / Dispatch | Technician (mobile) | Same as above if tech self-dispatches |
| Tech arrives (GPS auto or manual) | Auto GPS or Tech | Status → Working; Driving timesheet ends; Working timesheet begins; Dispatch Board updates |
| Tech performs work, builds invoice | Technician (mobile) | Invoice updated; forms filled; parts recorded |
| Customer signature | Technician (mobile) | Signature timestamped, stored on job |
| Payment collected | Technician (mobile) | Payment recorded; flows to accounting |
| Tech taps Close Out → Complete | Technician (mobile) | Status → Done; Working timesheet ends; invoice posted; job completed |
| End of day clock out | Technician (mobile) or Auto | Day's timesheet finalized; paid hours calculated |

---

## 11. Sources

- [Technician Timesheets Overview — ServiceTitan Help](https://help.servicetitan.com/how-to/timesheets-overview)
- [Overview of Technician Clock I/O — ServiceTitan Help](https://help.servicetitan.com/how-to/clockinclockout-overview)
- [Explanation of Technician Timesheets: Timesheet Summary Report — ServiceTitan Help](https://help.servicetitan.com/how-to/technician-timesheets)
- [Technician Timesheet Summary Report — ServiceTitan Help](https://help.servicetitan.com/how-to/technician-timesheet-summary-report)
- [Clock In and Out from the Office — ServiceTitan Help](https://help.servicetitan.com/how-to/office-timesheets-time-clock)
- [Track Your Time in ServiceTitan Mobile — ServiceTitan Help](https://help.servicetitan.com/how-to/track-your-time-in-the-servicetitan-mobile-app)
- [Dispatch and Arrive with the ServiceTitan Field Mobile App — ServiceTitan Help](https://help.servicetitan.com/how-to/dispatch-and-arrive-at-a-job-in-the-servicetitan-field-mobile-app)
- [Close Out Appointments in ServiceTitan Mobile — ServiceTitan Help](https://help.servicetitan.com/how-to/closeout)
- [Statuses and Actions on Jobs and Appointments — ServiceTitan Help](https://help.servicetitan.com/how-to/statuses-actions)
- [Dispatching Icon and Alert Glossary — ServiceTitan Help](https://help.servicetitan.com/how-to/dispatching-icon-and-alert-glossary)
- [Use the Daily Dispatch Board — ServiceTitan Help](https://help.servicetitan.com/how-to/using-dispatch-board)
- [Dispatch Board FAQ — ServiceTitan Help](https://help.servicetitan.com/faq/dispatch-board-faq)
- [Dispatch Technicians — ServiceTitan Help](https://help.servicetitan.com/how-to/dispatch-technicians)
- [Enable or Disable Arrive by GPS — ServiceTitan Help](https://help.servicetitan.com/how-to/arrive-by-gps)
- [Set Up Arrival Windows — ServiceTitan Help](https://help.servicetitan.com/how-to/setup-arrival-windows)
- [Manage Technician Idle Time — ServiceTitan Help](https://help.servicetitan.com/how-to/idle-time-settings)
- [Payroll and Timesheets FAQ — ServiceTitan Help](https://help.servicetitan.com/faq/payroll-and-timesheets-faq)
- [Payroll and Timekeeping Landing — ServiceTitan Help](https://help.servicetitan.com/landing-page/payroll-timesheets-home)
- [Contractor Timesheet Software — ServiceTitan](https://www.servicetitan.com/features/contractor-timesheet-software)
- [Contractor Payroll Software — ServiceTitan](https://www.servicetitan.com/features/contractor-payroll-software)
- [Field Service Mobile App — ServiceTitan](https://www.servicetitan.com/features/field-mobile-app)
- [Field Service Dispatch Software — ServiceTitan](https://www.servicetitan.com/features/dispatch-software)
- [HVAC Timesheets Blog — ServiceTitan](https://www.servicetitan.com/blog/hvac-timesheets)
- [Dispatch Notifications — ServiceTitan](https://www.servicetitan.com/field-service-management/dispatch-notifications)
- [GPS Tracking + Field Service Blog — ServiceTitan](https://www.servicetitan.com/blog/clearpath-gps)
- [Technician Shifts — Powerhouse Consulting Group](https://mypowerhouse.group/technician-shifts-in-servicetitan-what-are-they-and-why-use-them/)
- [GPS Insight + ServiceTitan Integration — GPS Insight Help](https://help.gpsinsight.com/docs/servicetitan-integration-update/)
- [How to Optimize Dispatching with ServiceTitan — Home Service Engine](https://homeserviceengine.co/blog/servicetitan-dispatch/)
- [Complete and Send Forms — ServiceTitan Help](https://help.servicetitan.com/how-to/complete-and-send-forms-in-the-servicetitan-field-mobile-app)
- [Does ServiceTitan Have a Time Clock? — Workyard](https://www.workyard.com/answers/does-servicetitan-have-a-time-clock)
- [Dispatch Management 2026 Blog — ServiceTitan](https://www.servicetitan.com/blog/dispatch-management)
- [ServiceTitan API — Dispatch Docs](https://developer.servicetitan.io/docs/api-resources-dispatch/)
- [ServiceTitan API — Job Planning Docs](https://developer.servicetitan.io/docs/api-resources-job-planning/)
- [ServiceTitan API — Payroll Docs](https://developer.servicetitan.io/docs/api-resources-payroll/)
- [HVAC & Plumbing ServiceTitan Process Template — Trainual](https://trainual.com/template/hvac-plumbing-servicetitan-for-hvac-technicians-plumbers-process)
