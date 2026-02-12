# MovePost - Postcard Marketing Platform

Automated postcard marketing platform for targeting new movers. The system discovers new movers via Melissa API, generates AI-powered postcard designs, sends physical postcards through PostGrid, and processes payments via Stripe.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Tech Stack](#tech-stack)
3. [Getting Started](#getting-started)
4. [Environment Variables](#environment-variables)
5. [Project Structure](#project-structure)
6. [User Journey (End to End)](#user-journey-end-to-end)
7. [Route Map](#route-map)
8. [Contexts (Global State)](#contexts-global-state)
9. [Frontend API Services](#frontend-api-services)
10. [Supabase Edge Functions](#supabase-edge-functions)
11. [Database Schema](#database-schema)
12. [External Services](#external-services)
13. [Admin Dashboard](#admin-dashboard)
14. [Postcard Editor (TODO)](#postcard-editor-todo)
15. [Known Issues](#known-issues)
16. [localStorage Keys](#localstorage-keys)

---

## Architecture

```
                          +------------------+
                          |   React Frontend |
                          |   (Vite + React) |
                          +--------+---------+
                                   |
                          Supabase JS Client
                                   |
                  +----------------+----------------+
                  |                                 |
         +--------v--------+             +----------v----------+
         | Supabase Auth   |             | Supabase Edge Fns   |
         | (email, Google) |             | (Deno runtime)      |
         +-----------------+             +----------+----------+
                                                    |
                           +-------------+----------+----------+-------------+
                           |             |          |          |             |
                    +------v--+   +------v--+  +---v----+  +--v------+  +---v----+
                    | Brand   |   | OpenAI  |  | Stripe |  | PostGrid|  | Melissa|
                    | .dev    |   | GPT-4o  |  |  API   |  |   API   |  |  API   |
                    +---------+   +---------+  +--------+  +---------+  +--------+
                    Brand data    AI postcard   Payments    Print &      New mover
                    enrichment    generation    processing  mail cards   discovery
                                                    |
                                          +---------v---------+
                                          |    PostgreSQL      |
                                          |  (Supabase hosted) |
                                          +-------------------+
```

---

## Tech Stack

**Frontend:**
- React 19 + Vite 5
- React Router v7 (routing)
- Tailwind CSS v4 (styling)
- Framer Motion (animations)
- React Hot Toast (notifications)
- React Hook Form + Zod (form validation)
- Recharts (analytics charts)
- Fabric.js (canvas-based postcard editor)
- Lucide React (icons)
- Radix UI (avatar, dialog, dropdown, tooltip)
- Stripe React (payment forms)

**Backend:**
- Supabase (PostgreSQL + Auth + Edge Functions)
- Edge Functions run on Deno runtime
- Row Level Security (RLS) on all tables

**External Services:**
- Brand.dev API - company brand data (logo, colors, description)
- OpenAI GPT-4o - AI postcard generation, industry mapping, template suggestions
- Stripe - payment processing (PaymentIntents, SetupIntents, webhooks)
- PostGrid - physical postcard printing and mailing
- Melissa Data - new mover discovery and ZIP code validation
- Cloudinary - image hosting for postcard designs
- Resend - transactional emails
- Google OAuth - social login

---

## Getting Started

### Prerequisites

- Node.js v20+
- npm
- Supabase account with Edge Functions enabled
- Stripe account (test keys for development)
- PostGrid account
- Melissa API credentials

### Install and Run

```bash
git clone https://github.com/Mukela12/Marty-hold.git
cd Marty-hold
npm install
cp .env.example .env    # Fill in your credentials
npm run dev             # Starts at http://localhost:5174
```

### Available Scripts

```bash
npm run dev       # Start development server
npm run build     # Build for production
npm run preview   # Preview production build
npm run lint      # Run ESLint
```

### Deploy Edge Functions

```bash
supabase link --project-ref <your-project-ref>
supabase functions deploy brand-dev
supabase functions deploy ai-generate-metadata
supabase functions deploy postcard-html-generator
supabase functions deploy open-ai-industry-mapping
supabase functions deploy create-payment-intent
supabase functions deploy stripe-webhook
supabase functions deploy postgrid-webhook
supabase functions deploy poll-melissa-new-movers
supabase functions deploy send-email
# ... deploy all functions in supabase/functions/
```

---

## Environment Variables

Copy `.env.example` to `.env`. Variables prefixed with `VITE_` are exposed to the frontend. All others are backend-only (Edge Functions).

| Variable | Scope | Service | Purpose |
|----------|-------|---------|---------|
| `VITE_SUPABASE_URL` | Frontend | Supabase | Project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Supabase | Anon key (respects RLS) |
| `VITE_STRIPE_PUBLISHABLE_KEY` | Frontend | Stripe | Client-side payment forms |
| `VITE_STRIPE_SECRET_KEY` | Frontend | Stripe | (should be backend-only) |
| `VITE_POSTGRID_API_KEY` | Frontend | PostGrid | Client-side postcard API |
| `POSTGRID_API_KEY` | Backend | PostGrid | Edge function postcard API |
| `VITE_POSTGRID_API_URL` | Frontend | PostGrid | API base URL |
| `VITE_CLOUDINARY_CLOUD_NAME` | Frontend | Cloudinary | Image upload cloud name |
| `VITE_CLOUDINARY_API_KEY` | Frontend | Cloudinary | Image upload API key |
| `VITE_CLOUDINARY_API_SECRET` | Frontend | Cloudinary | Image upload secret |
| `VITE_IMGLY_LICENSE` | Frontend | IMG.LY | Creative engine license |
| `VITE_GOOGLE_CLIENT_ID` | Frontend | Google | OAuth client ID |
| `VITE_BRANDFETCH_API_KEY` | Frontend | Brandfetch | Brand data (legacy) |
| `VITE_MELISSA_API_URL` | Frontend | Melissa | New mover API URL |
| `VITE_MELISSA_CUSTOMER_ID` | Frontend | Melissa | Customer ID |
| `VITE_FRONTEND_URL` | Frontend | App | URL for email links |
| `VITE_API_URL` | Frontend | App | Backend API URL |
| `BRANDDEV_URL` | Backend | Brand.dev | Brand API endpoint |
| `BRANDDEV_KEY` | Backend | Brand.dev | Brand API key |
| `RESEND_API_KEY` | Backend | Resend | Email sending |
| `EMAIL_FROM` | Backend | Resend | Sender address |
| `FROM_NAME` | Backend | Resend | Sender display name |

---

## Project Structure

```
MovePost-Marty/
├── public/                          # Static assets
│   ├── PSD-files/                   # 6 Photoshop postcard templates
│   ├── template-previews/           # Preview images for templates
│   ├── templates.json               # Template metadata
│   └── movepost-logo.png
│
├── src/
│   ├── main.jsx                     # Entry point (wraps with providers)
│   ├── App.jsx                      # Root component with all routes
│   ├── App.css / index.css          # Root styles
│   │
│   ├── contexts/                    # React Context providers
│   │   ├── AuthContext.jsx          # Supabase auth state + session management
│   │   ├── BrandDevContext.jsx      # Brand.dev API data (cached in localStorage)
│   │   └── PostCardContext.jsx      # Generated postcards (cached in localStorage)
│   │
│   ├── components/
│   │   ├── ProtectedRoute.jsx       # Auth guard (email verify + onboarding checks)
│   │   ├── ErrorBoundary.jsx        # React error boundary
│   │   ├── admin/                   # Admin layout, route guard, metric cards
│   │   ├── auth/                    # Auth layout wrapper
│   │   ├── campaign/                # CampaignSteps, PreviewCards
│   │   ├── common/                  # Reusable UI: Button, Card, Table, Form*, etc.
│   │   ├── dashboard/               # AnalyticsChart, CampaignCard, EmptyState
│   │   ├── layout/                  # DashboardLayout, Sidebar, PageContainer
│   │   ├── onboarding/              # Onboarding layout, sidebar, template cards
│   │   ├── postcardTemplates/       # 4 JSX template components + renderer
│   │   ├── PostcardEditor/          # FabricEditor (canvas), CampaignPostGridEdit
│   │   ├── process/                 # ProcessLayout, footer, step indicator
│   │   ├── settings/                # BillingTab, BusinessTab, ProfileTab
│   │   └── ui/                      # Base UI components (legacy, some still used)
│   │
│   ├── pages/
│   │   ├── auth/                    # Login, SignUp, ResetPassword, EmailVerification
│   │   ├── onboarding/              # 6-step onboarding flow
│   │   ├── campaign/
│   │   │   ├── v1/                  # CampaignStep4.jsx, CampaignStep5.jsx (active)
│   │   │   └── v2/                  # CompanyDetails, SelectTemplates, EditTemplate
│   │   ├── blast/                   # BlastStep1-5 (blast campaign flow)
│   │   ├── admin/                   # 9 admin pages (dashboard, campaigns, users, etc.)
│   │   ├── Dashboard.jsx            # Main user dashboard
│   │   ├── CampaignDetails.jsx      # View single campaign
│   │   ├── CampaignEdit.jsx         # Edit campaign (PostGrid editor)
│   │   ├── History.jsx              # Campaign history
│   │   ├── Settings.jsx             # User settings
│   │   ├── Profile.jsx              # User profile
│   │   └── Notifications.jsx        # User notifications
│   │
│   ├── supabase/
│   │   ├── integration/client.js    # Supabase client initialization
│   │   └── api/                     # 16 service modules (see API Services section)
│   │
│   ├── services/
│   │   ├── cloudinaryService.js     # Cloudinary image upload
│   │   └── fabricCloudinaryService.js # Fabric canvas → Cloudinary upload
│   │
│   ├── hooks/
│   │   ├── useFabricPages.js        # Multi-page canvas management
│   │   ├── useGoogleSignIn.js       # Google OAuth hook
│   │   └── useResizableSidebar.js   # Sidebar resize behavior
│   │
│   ├── utils/
│   │   ├── addressFormatter.js      # Format mailing addresses
│   │   ├── agPsdLoader.js           # PSD file parser (using ag-psd)
│   │   ├── cn.js                    # Tailwind class merge utility
│   │   ├── pricing.js               # Postcard cost calculations
│   │   ├── validation.js            # Form validation helpers
│   │   └── zipCode.js               # ZIP code parsing/validation
│   │
│   └── styles/                      # Global CSS (design system, typography, spacing)
│
├── supabase/
│   ├── config.toml                  # Supabase local config
│   └── functions/                   # 20 Edge Functions (see Edge Functions section)
│
├── .env.example                     # Environment variable template
├── package.json
├── vite.config.js
└── eslint.config.js
```

---

## User Journey (End to End)

### 1. Sign Up

**Route:** `/signup`

User enters name, email, password. Calls `supabase.auth.signUp()`. Profile record created in `profile` table. Verification email sent. Redirects to `/verify-email`.

Google sign-up also available via OAuth.

### 2. Email Verification

**Route:** `/verify-email`

Polls every 5 seconds checking `email_confirmed_at`. User can resend (60s cooldown). On verification, redirects to `/login?verified=true`.

### 3. Login

**Route:** `/login`

Calls `supabase.auth.signInWithPassword()`. Smart redirect:
- Email not verified → `/verify-email`
- Onboarding incomplete → `/onboarding/step{N}`
- Complete → `/dashboard`

### 4. Onboarding (6 steps)

**Route:** `/onboarding/step1` through `/onboarding/step6`

| Step | Route | Component | Purpose |
|------|-------|-----------|---------|
| 1 | `/onboarding/step1` | TargetAudience | Business type, targeting preferences |
| 2 | `/onboarding/step2` | OnboardingStep2Enhanced | Business info, logo, brand colors |
| 3 | `/onboarding/step3` | OnboardingStep3Enhanced | Payment setup intro |
| 4 | `/onboarding/step4` | OnboardingStep4 | ZIP code targeting, budget |
| 5 | `/onboarding/step5` | OnboardingStep5 | Campaign review |
| 6 | `/onboarding/step6` | OnboardingStep6 | Completion, redirect to dashboard |

On completion: `onboarding_progress.onboarding_completed = true`.

### 5. Dashboard

**Route:** `/dashboard`

Shows all user campaigns with status, recipient count, postcards sent, cost. Actions: create new, edit, duplicate, delete, view details.

### 6. Campaign Creation (5 steps)

#### Step 1 — Company Details

**Route:** `/campaign/step1` or `/create-campaign` → `CompanyDetails.jsx`

1. User enters website URL + business category
2. System checks `companies` table by domain
3. If not found, calls `brand-dev` edge function (Brand.dev API)
4. Returns: logo, colors, description, address, social links, industries
5. Calls `open-ai-industry-mapping` edge function to match to a `master_categories` entry
6. Saves company to `companies` table
7. Creates draft campaign in `campaigns` table
8. Brand data cached in `BrandDevContext` → localStorage

**API calls:** `brand-dev`, `open-ai-industry-mapping`
**DB writes:** `companies`, `campaigns`

#### Step 2 — Select Template

**Route:** `/campaign/step2` → `SelectTemplates.jsx`

1. Loads brand data from `BrandDevContext` (redirects to step 1 if missing)
2. Gets category `image_urls` from `master_categories` table
3. Calls `postcard-html-generator` edge function → AI generates postcard HTML designs
4. Postcards cached in `PostcardContext` → localStorage
5. Optionally calls `open-ai-templates-suggestion` for AI ranking
6. User selects a template

**API calls:** `postcard-html-generator`, `open-ai-templates-suggestion` (optional)
**DB reads:** `master_categories`

#### Step 3 — Edit Template

**Route:** `/campaign/step3` → `EditTemplate.jsx`

**STATUS: Placeholder.** The postcard editor integration is pending (see [Postcard Editor TODO](#postcard-editor-todo)). Currently shows a placeholder. The `FabricEditor` component exists for canvas-based editing and is used in `CampaignEdit.jsx` and `BlastStep2.jsx`.

On save: design URL stored in Cloudinary, URLs saved to localStorage.

#### Step 4 — Targeting & Budget

**Route:** `/campaign/step4` → `CampaignStep4.jsx` (in `pages/campaign/v1/`)

1. User enters target ZIP codes (single, range, or comma-separated)
2. ZIP codes validated against Melissa Data API
3. Cost calculated: `$3.00 × recipients`
4. Data stored in `sessionStorage` as `campaignTargetingData`

#### Step 5 — Review & Launch

**Route:** `/campaign/step5` → `CampaignStep5.jsx` (in `pages/campaign/v1/`)

1. Shows full campaign summary: template, targeting, cost
2. Two options:
   - **Activate Campaign** → `status='active'`, `polling_enabled=true`, payment initiated
   - **Save as Draft** → `status='draft'`, return later

**DB writes:** `campaigns` (update status, targeting, polling config)

### 7. Post-Launch (Background)

Once active and approved by admin:
- `poll-melissa-new-movers` runs every 30 minutes via pg_cron
- Discovers new movers in target ZIP codes
- Sends postcards via PostGrid
- Charges $3.00/postcard via Stripe immediately
- `postgrid-webhook` receives delivery status updates

### 8. Blast Campaigns

**Routes:** `/blast/step1` through `/blast/step5`, `/create-blast`

Alternative campaign flow for one-time blast sends (not polling-based). Uses the same components (`CampaignSteps`, `FabricEditor`) but with different targeting logic.

---

## Route Map

### Public (no auth)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/signup` | SignUp | Create account |
| `/login` | Login | Sign in |
| `/reset-password` | ResetPassword | Password reset |
| `/auth/callback` | OAuthCallback | Google OAuth callback |
| `/` | → `/login` | Redirect |

### Protected (auth required)

| Route | Component | Auth Level |
|-------|-----------|------------|
| `/verify-email` | EmailVerification | Auth only |
| `/onboarding/*` | Onboarding (6 steps) | Auth + Email verified |
| `/dashboard` | Dashboard | Auth + Email + Onboarding |
| `/create-campaign` | CompanyDetails | Auth + Email + Onboarding |
| `/campaign/step1` | CompanyDetails | Auth + Email + Onboarding |
| `/campaign/step2` | SelectTemplates | Auth + Email + Onboarding |
| `/campaign/step3` | EditTemplate | Auth + Email + Onboarding |
| `/campaign/step4` | CampaignStep4 | Auth + Email + Onboarding |
| `/campaign/step5` | CampaignStep5 | Auth + Email + Onboarding |
| `/campaign/:id/edit` | CampaignEdit | Auth + Email + Onboarding |
| `/campaign/:id/details` | CampaignDetails | Auth + Email + Onboarding |
| `/blast/step1-5` | BlastStep1-5 | Auth + Email + Onboarding |
| `/create-blast` | CreateBlast | Auth + Email + Onboarding |
| `/history` | History | Auth + Email + Onboarding |
| `/settings` | Settings | Auth + Email + Onboarding |
| `/profile` | Profile | Auth + Email + Onboarding |
| `/notifications` | Notifications | Auth + Email + Onboarding |

### Admin (admin role required)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/admin/login` | AdminLogin | Admin sign-in |
| `/admin/dashboard` | AdminDashboard | Overview stats |
| `/admin/campaigns` | AdminCampaigns | All campaigns |
| `/admin/campaigns/:id` | AdminCampaignDetails | Approve/reject campaigns |
| `/admin/users` | AdminUsers | All users |
| `/admin/users/:id` | AdminUserDetails | User details |
| `/admin/transactions` | AdminTransactions | Payment history |
| `/admin/activity` | AdminActivity | Audit logs |
| `/admin/postcards` | AdminPostcards | PostGrid postcard tracking |

---

## Contexts (Global State)

### AuthContext (`contexts/AuthContext.jsx`)

Wraps entire app. Manages Supabase auth state.

**State:** `user`, `session`, `isAuthenticated`, `onboardingCompleted`, `currentOnboardingStep`, `loading`

**Methods:**
- `register(userData)` — sign up
- `login(email, password)` — sign in
- `googleLogin()` — OAuth
- `logout()` — sign out → `/login`
- `updateProfile(data)` — update user metadata
- `resetPassword(email)` — send reset email
- `updatePassword(newPassword)` — change password
- `checkOnboardingStatus()` — check progress

### BrandDevContext (`contexts/BrandDevContext.jsx`)

Stores brand data fetched from Brand.dev API. Persisted to localStorage (key: `cached_brand_data`).

**State:** `apiResponse`, `mappedData`, `loading`, `fetchSuccess`, `companyDomain`, `aiCategorySuggestion`

**Methods:**
- `fetchBrandData(website)` — fetch from Brand.dev via edge function
- `saveBrandData(brandData, formValues)` — update mapped data
- `clearBrandData()` — reset all + clear localStorage

### PostcardContext (`contexts/PostCardContext.jsx`)

Stores AI-generated postcards. Persisted to localStorage (key: `cached_postcards`).

**State:** `postcards`, `isContextLoading`

**Methods:**
- `getOrFetchPostcards(images, brandData)` — get cached or generate via edge function
- `clearCache()` — reset postcards

---

## Frontend API Services

All in `src/supabase/api/`. Each module wraps Supabase client calls.

| Service | File | Key Methods |
|---------|------|-------------|
| Auth | `authService.js` | `register()`, `login()`, `getCurrentUser()`, `resendVerificationEmail()` |
| Campaign | `campaignService.js` | `createCampaign()`, `getCampaigns()`, `getCampaignById()`, `updateCampaign()`, `deleteCampaign()`, `getCampaignStats()` |
| Company | `companyService.js` | `getCompanyByDomain()`, `createCompany()`, `updateCompany()` |
| Brand Fetch | `brandFetchService.js` | `fetchBrandData()` — calls `brand-dev` edge function |
| Payment | `paymentService.js` | `createCustomerRecord()`, `createSetupIntent()`, `createPaymentIntent()`, `confirmPayment()`, `chargeCampaign()` |
| PostGrid | `postgridService.js` | `getTemplates()`, `getEditorSession()`, `createPostcard()` |
| New Mover | `newMoverService.js` | `validateZipCodes()`, `getNewMovers()` |
| Profile | `profileService.js` | `getProfile()`, `updateProfile()` |
| Onboarding | `onboardingService.js` | `getProgress()`, `updateProgress()`, `completeOnboarding()` |
| Notification | `notificationService.js` | `getNotifications()`, `markAsRead()`, `getUnreadCount()` |
| Email | `emailService.js` | `sendEmail()` — calls `send-email` edge function |
| Admin | `adminService.js` | `getAllCampaigns()`, `getTransactions()`, `getRevenueStats()`, `getAllUsers()` |
| Admin Actions | `adminActions.js` | `approveCampaign()`, `rejectCampaign()`, `pauseCampaign()`, `resumeCampaign()` |
| Admin Users | `adminUserActions.js` | `blockUser()`, `unblockUser()` |
| Admin Postcards | `adminPostcardService.js` | `getPostcards()`, `getPostcardStats()`, `getPostcardsByStatus()` |
| PSD Storage | `psdStorageService.js` | `uploadPSD()`, `getPSDUrl()` |

---

## Supabase Edge Functions

All in `supabase/functions/`. Each is a Deno TypeScript function.

### AI & Brand Functions

| Function | Called From | Purpose |
|----------|-----------|---------|
| `brand-dev` | CompanyDetails (step 1) | Fetch company data from Brand.dev API |
| `open-ai-industry-mapping` | CompanyDetails (step 1) | Map brand industries to master categories using GPT-4o |
| `postcard-html-generator` | SelectTemplates (step 2) via PostcardContext | Generate AI postcard HTML designs |
| `ai-generate-metadata` | Admin/internal | Generate PostGrid editorData JSON from HTML using GPT-4o |
| `open-ai-templates-suggestion` | SelectTemplates (step 2) | AI-rank templates for a brand |
| `open-ai-post-editor-area` | Editor | Generate text content for postcard editor |

### PostGrid Functions

| Function | Called From | Purpose |
|----------|-----------|---------|
| `postgrid-editor-session` | CampaignPostGridEdit, CampaignEdit | Create PostGrid editor session URL |
| `get-postgrid-editor` | Admin | Get PostGrid editor details |
| `get-postgrid-templates` | CampaignStep5, admin | Fetch PostGrid template metadata |
| `postgrid-webhook` | PostGrid (webhook) | Handle postcard status updates (ready, printing, delivered, returned) |

### Payment Functions

| Function | Called From | Purpose |
|----------|-----------|---------|
| `create-customer-record` | paymentService | Create Stripe customer |
| `create-setup-intent` | paymentService | Collect payment method |
| `confirm-setup-intent` | paymentService | Confirm payment method setup |
| `create-payment-intent` | paymentService, poll-melissa | Charge for postcards |
| `confirm-payment` | paymentService | Confirm a payment |
| `create-customer-portal-session` | BillingTab | Stripe customer portal |
| `stripe-webhook` | Stripe (webhook) | Handle payment events |

### Data & Utility Functions

| Function | Called From | Purpose |
|----------|-----------|---------|
| `poll-melissa-new-movers` | pg_cron (every 30 min) | Discover new movers, send postcards, charge |
| `user-campaign` | campaignService | Campaign CRUD operations |
| `send-email` | Various | Send transactional emails via Resend |

---

## Database Schema

20 tables, 3 views, 8 RPC functions. All in the `public` schema.

### Tables

#### `profile`
User profiles linked to Supabase auth.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Profile ID |
| `user_id` | uuid | Links to auth.users |
| `full_name` | text | User's name |
| `email` | text | User's email |
| `role` | text | `user`, `admin`, or `super_admin` |
| `is_blocked` | boolean | Whether account is blocked |
| `blocked_at` | timestamptz | When blocked |
| `blocked_by` | uuid | Admin who blocked |
| `block_reason` | text | Reason for blocking |
| `created_at` | timestamptz | Account creation |

#### `companies`
Brand/company data fetched from Brand.dev.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Company ID |
| `user_id` | uuid | Owner |
| `name` | text | Company name |
| `website` | text | Company URL |
| `domain` | text | Domain (for dedup) |
| `business_category` | text | Matched category |
| `description` | text | Company description |
| `industry` | text | Industry |
| `logo_url` | text | Logo image URL |
| `logo_icon_url` | text | Icon variant |
| `primary_color` | text | Brand primary color |
| `secondary_color` | text | Brand secondary color |
| `color_palette` | text | Full color palette |
| `fonts` | text | Brand fonts |
| `social_links` | text | Social media links |
| `founded` | text | Year founded |
| `employees` | text | Employee count |
| `location` | text | HQ location |
| `brandfetch_data` | json | Raw Brand.dev API response |
| `created_at` | timestamptz | Record creation |

#### `campaigns`
Core campaign records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Campaign ID |
| `user_id` | uuid | Campaign owner |
| `company_id` | uuid FK→companies | Linked company |
| `campaign_name` | varchar | Display name |
| `status` | varchar | `draft`, `active`, `completed`, `paused` |
| `approval_status` | text | `pending`, `approved`, `rejected` |
| `approved_by` | uuid | Admin who approved |
| `approved_at` | timestamptz | Approval timestamp |
| `rejected_by` | uuid | Admin who rejected |
| `rejected_at` | timestamptz | Rejection timestamp |
| `rejection_reason` | text | Why rejected |
| `paused_by` | uuid | Admin who paused |
| `paused_at` | timestamptz | Pause timestamp |
| `pause_reason` | text | Why paused |
| `template_id` | varchar | Selected template ID |
| `template_name` | varchar | Template display name |
| `postcard_design_url` | text | Cloudinary design URL |
| `postcard_preview_url` | text | Cloudinary preview URL |
| `postgrid_template_id` | text | PostGrid front template ID |
| `postgrid_back_template_id` | text | PostGrid back template ID |
| `postcard_front_html` | text | Front HTML content |
| `postcard_back_html` | text | Back HTML content |
| `targeting_type` | varchar | `zip_codes` |
| `target_zip_codes` | text[] | Array of target ZIPs |
| `target_location` | text | Location description |
| `target_radius` | integer | Radius in miles |
| `total_recipients` | integer | Total mover count |
| `postcards_sent` | integer | Sent count |
| `postcards_delivered` | integer | Delivered count |
| `postcards_in_transit` | integer | In-transit count |
| `postcards_returned` | integer | Returned count |
| `postcards_cancelled` | integer | Cancelled count |
| `new_mover_ids` | uuid[] | Array of newmover IDs |
| `price_per_postcard` | numeric | Cost per card ($3.00) |
| `total_cost` | numeric | Running total cost |
| `payment_status` | varchar | `pending`, `paid`, `failed` |
| `payment_intent_id` | varchar | Stripe PaymentIntent ID |
| `payment_requires_action` | boolean | Needs 3D Secure |
| `payment_action_url` | text | Stripe auth URL |
| `paid_at` | timestamptz | Payment timestamp |
| `responses` | integer | Response count |
| `response_rate` | numeric | Response percentage |
| `polling_enabled` | boolean | Auto-poll for movers |
| `polling_frequency_hours` | numeric | Poll interval (0.5 = 30 min) |
| `last_polled_at` | timestamptz | Last poll timestamp |
| `provider` | text | `postgrid`, `lob`, `clicksend` |
| `provider_campaign_id` | text | External provider ID |
| `provider_connected_at` | timestamptz | Provider connection time |
| `created_at` | timestamptz | Created |
| `updated_at` | timestamptz | Last update |
| `launched_at` | timestamptz | Launch time |
| `completed_at` | timestamptz | Completion time |
| `deleted_at` | timestamptz | Soft delete timestamp |

#### `newmover`
Individual new mover records from Melissa API.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Mover ID |
| `melissa_address_key` | text | Unique Melissa identifier |
| `full_name` | text | Person's name |
| `address_line` | text | New address |
| `city` | text | City |
| `state` | text | State |
| `zip_code` | text | ZIP code |
| `previous_address_line` | text | Old address |
| `previous_zip_code` | text | Old ZIP |
| `phone_number` | text | Phone |
| `move_effective_date` | text | When they moved |
| `campaign_id` | uuid FK→campaigns | Which campaign |
| `discovered_at` | timestamptz | When discovered |
| `postcard_sent` | boolean | Postcard sent? |
| `postcard_sent_at` | timestamptz | When sent |
| `postgrid_postcard_id` | text | PostGrid tracking ID |
| `postgrid_status` | text | `ready`, `in_transit`, `delivered`, `returned` |
| `postgrid_status_history` | jsonb | Status change history |
| `postgrid_tracking_number` | text | USPS tracking |
| `delivery_date` | timestamptz | When delivered |
| `return_reason` | text | Why returned |
| `charge_id` | uuid FK→pending_charges | Linked charge (deprecated) |
| `transaction_id` | uuid FK→transactions | Linked transaction |
| `created_at` | timestamptz | Record creation |

#### `customers`
Stripe customer mappings.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Customer ID |
| `user_id` | uuid | App user |
| `stripe_customer_id` | text | Stripe customer ID |
| `email` | text | Customer email |
| `created_at` | timestamptz | Created |
| `updated_at` | timestamptz | Updated |

#### `payment_methods`
Saved payment cards.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Method ID |
| `customer_id` | uuid FK→customers | Owning customer |
| `stripe_payment_method_id` | text | Stripe PM ID |
| `type` | text | `card` |
| `card_brand` | text | visa, mastercard, etc. |
| `card_last4` | text | Last 4 digits |
| `card_exp_month` | integer | Expiry month |
| `card_exp_year` | integer | Expiry year |
| `is_default` | boolean | Default method |
| `billing_details` | jsonb | Billing address |
| `created_at` | timestamptz | Created |
| `updated_at` | timestamptz | Updated |

#### `transactions`
All Stripe payment records.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Transaction ID |
| `user_id` | uuid | Who was charged |
| `campaign_id` | uuid FK→campaigns | Related campaign |
| `stripe_payment_intent_id` | text | Stripe PI ID |
| `stripe_charge_id` | text | Stripe charge ID |
| `stripe_customer_id` | text | Stripe customer |
| `amount_cents` | integer | Amount in cents (300 = $3.00) |
| `amount_dollars` | numeric | Amount in dollars |
| `currency` | text | `usd` |
| `status` | text | `succeeded`, `processing`, `failed` |
| `billing_reason` | text | `new_mover_addition`, `campaign_approval`, etc. |
| `new_mover_count` | integer | Movers in this charge |
| `payment_method_last4` | text | Card last 4 |
| `payment_method_brand` | text | Card brand |
| `failure_code` | text | Stripe failure code |
| `failure_message` | text | Failure description |
| `receipt_url` | text | Stripe receipt URL |
| `refunded_at` | timestamptz | Refund timestamp |
| `refund_reason` | text | Why refunded |
| `refund_amount_cents` | integer | Refund amount |
| `is_test_mode` | boolean | Test vs live |
| `metadata` | jsonb | Extra data |
| `created_at` | timestamptz | Created |
| `updated_at` | timestamptz | Updated |

#### `pending_charges`
Audit trail for charges (processed immediately in current flow).

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Charge ID |
| `campaign_id` | uuid FK→campaigns | Campaign |
| `user_id` | uuid | User |
| `new_mover_count` | integer | Mover count |
| `amount_cents` | integer | Amount in cents |
| `amount_dollars` | numeric | Amount in dollars |
| `billing_reason` | text | Why charged |
| `scheduled_for` | date | Scheduled date |
| `processed` | boolean | Already processed (always true) |
| `processed_at` | timestamptz | When processed |
| `transaction_id` | uuid FK→transactions | Linked transaction |
| `is_test_mode` | boolean | Test mode |
| `metadata` | jsonb | Extra data |
| `created_at` | timestamptz | Created |
| `updated_at` | timestamptz | Updated |

#### `notifications`
In-app user notifications.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Notification ID |
| `user_id` | uuid | Recipient |
| `type` | text | `campaign_approved`, `campaign_rejected`, `payment_failed`, etc. |
| `title` | text | Notification title |
| `message` | text | Notification body |
| `action_url` | text | Click destination |
| `is_read` | boolean | Read status |
| `created_at` | timestamptz | Created |
| `read_at` | timestamptz | When read (auto-set by trigger) |

#### `postcard_events`
PostGrid webhook event log.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Event ID |
| `postgrid_postcard_id` | text | PostGrid postcard ID |
| `event_type` | text | `created`, `ready`, `printing`, `in_transit`, `delivered`, `returned`, `cancelled` |
| `event_data` | jsonb | Raw webhook payload |
| `campaign_id` | uuid FK→campaigns | Related campaign |
| `new_mover_id` | uuid FK→newmover | Related mover |
| `created_at` | timestamptz | Event time |

#### `onboarding_progress`
Tracks user onboarding state.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Progress ID |
| `user_id` | uuid | User |
| `current_step` | integer | Current step (1-6) |
| `completed_steps` | integer[] | Array of completed step numbers |
| `business_data` | jsonb | Step 2 data |
| `template_data` | jsonb | Template selection data |
| `targeting_data` | jsonb | Targeting preferences |
| `payment_completed` | boolean | Payment method added |
| `onboarding_completed` | boolean | All steps done |
| `created_at` | timestamptz | Started |
| `updated_at` | timestamptz | Last update |

#### `master_categories`
Template categories with reference images for AI generation.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint PK | Category ID |
| `category` | text | Category name |
| `description` | text | Category description |
| `status` | boolean | Active/inactive |
| `image_urls` | text[] | Reference image URLs for AI |
| `created_at` | timestamptz | Created |
| `updated_at` | timestamptz | Updated |

#### `master_campaign`
Master campaign templates.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint PK | Template ID |
| `template_id` | varchar | External template ref |
| `html` | text | Template HTML |
| `meta_data` | text | Template metadata |
| `description` | varchar | Template description |
| `category` | integer[] | Linked category IDs |
| `created_at` | timestamptz | Created |
| `updated_at` | timestamptz | Updated |

#### `user_campaign`
User-specific campaign template links.

| Column | Type | Description |
|--------|------|-------------|
| `id` | bigint PK | Record ID |
| `user_id` | varchar | User |
| `company_id` | varchar | Company |
| `master_template_id` | varchar | Master template ref |
| `template_id` | varchar | Template variant |
| `status` | smallint | Status code |
| `created_at` | timestamptz | Created |
| `updated_at` | timestamptz | Updated |

#### `admin_activity_logs`
Audit trail for admin and system actions.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Log ID |
| `admin_id` | uuid | Admin who acted (null for system) |
| `user_id` | uuid | User who acted (for self-service) |
| `action_type` | text | Action type |
| `target_type` | text | Entity type |
| `target_id` | uuid | Entity ID |
| `metadata` | jsonb | Extra data |
| `ip_address` | inet | Admin IP |
| `user_agent` | text | Browser UA |
| `created_at` | timestamptz | When |

#### `user_blocks`
Block/unblock history.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Block ID |
| `user_id` | uuid | Blocked user |
| `blocked_by` | uuid | Admin who blocked |
| `reason` | text | Block reason |
| `is_active` | boolean | Currently active |
| `created_at` | timestamptz | Blocked at |
| `unblocked_at` | timestamptz | Unblocked at |
| `unblocked_by` | uuid | Admin who unblocked |
| `unblock_reason` | text | Unblock reason |

#### `validated_zipcodes`
Cached ZIP code validation results from Melissa.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Record ID |
| `zip_code` | varchar | ZIP code |
| `is_valid` | boolean | Valid per Melissa |
| `validated_at` | timestamptz | Last validated |
| `melissa_data` | jsonb | Raw Melissa response |
| `created_at` | timestamptz | Created |
| `updated_at` | timestamptz | Updated |

#### `setup_intents`
Stripe SetupIntent records for payment method collection.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Record ID |
| `customer_id` | uuid FK→customers | Customer |
| `stripe_setup_intent_id` | text | Stripe SI ID |
| `client_secret` | text | Frontend secret |
| `status` | text | `requires_payment_method`, `succeeded`, etc. |
| `payment_method_id` | uuid FK→payment_methods | Linked method |
| `metadata` | jsonb | Extra data |
| `created_at` | timestamptz | Created |
| `updated_at` | timestamptz | Updated |

#### `campaign_analytics`
Daily campaign performance metrics.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | Record ID |
| `campaign_id` | uuid FK→campaigns | Campaign |
| `date` | date | Metric date |
| `postcards_sent_today` | integer | Sent that day |
| `postcards_delivered_today` | integer | Delivered that day |
| `responses_today` | integer | Responses that day |
| `unique_visits` | integer | Unique visits |
| `conversions` | integer | Conversions |
| `conversion_rate` | numeric | Rate |
| `created_at` | timestamptz | Created |

### Views

| View | Purpose |
|------|---------|
| `campaign_summary_stats` | Aggregated campaign stats per user (total campaigns, recipients, spent, response rate) |
| `active_campaigns_view` | Active campaigns joined with company data and delivery rate |

### RPC Functions

| Function | Purpose |
|----------|---------|
| `is_admin()` | Check if current user is admin |
| `is_super_admin()` | Check if current user is super admin |
| `get_user_role(uuid)` | Get a user's role |
| `log_admin_activity(...)` | Insert admin activity log |
| `get_active_block(uuid)` | Get user's active block record |
| `update_campaign_postcard_stats(uuid)` | Recalculate campaign delivery stats from postcard_events |
| `cleanup_old_sent_postcards()` | Maintenance: clean old records |
| `cleanup_old_zip_validations()` | Maintenance: clean old ZIP cache |
| `get_cron_jobs()` | List pg_cron jobs |
| `get_cron_job_runs()` | List pg_cron job runs |

### Key Relationships

```
profile (user_id)
  ├── campaigns (user_id)
  │     ├── newmover (campaign_id)
  │     │     ├── transactions (via transaction_id)
  │     │     └── postcard_events (new_mover_id)
  │     ├── transactions (campaign_id)
  │     ├── pending_charges (campaign_id)
  │     ├── postcard_events (campaign_id)
  │     └── campaign_analytics (campaign_id)
  │
  ├── companies (user_id)
  │     └── campaigns (company_id)
  │
  ├── customers (user_id)
  │     ├── payment_methods (customer_id)
  │     └── setup_intents (customer_id)
  │
  ├── onboarding_progress (user_id)
  ├── notifications (user_id)
  └── admin_activity_logs (admin_id / user_id)
```

---

## External Services

| Service | What it does | When it's called |
|---------|-------------|-----------------|
| **Brand.dev** | Returns company logo, colors, description, social links, industries from a domain | Campaign step 1 (company details) |
| **OpenAI GPT-4o** | Industry mapping, postcard HTML generation, template ranking, editor text | Campaign steps 1-2, metadata generation |
| **Stripe** | Payment processing — SetupIntents (save cards), PaymentIntents (charge), webhooks | Onboarding (save card), campaign activation, per-postcard charging |
| **PostGrid** | Print and mail physical postcards, editor sessions, delivery tracking via webhooks | Campaign step 3 (editor), step 5 (send), ongoing delivery |
| **Melissa Data** | New mover discovery by ZIP code, address validation | Campaign step 4 (ZIP validation), background polling |
| **Cloudinary** | Host postcard design images | Campaign step 3 (save design) |
| **Resend** | Send transactional emails | Email verification, campaign notifications |
| **Google OAuth** | Social login | Sign up / sign in |

---

## Admin Dashboard

### Access

1. Sign in at `/admin/login` with an account that has `role = 'admin'` or `'super_admin'` in the `profile` table
2. To promote a user: `UPDATE profile SET role = 'admin' WHERE email = 'user@example.com';`

### Features

- **Dashboard** — Campaign counts, revenue stats, recent activity
- **Campaigns** — View all, filter by status/approval, approve/reject/pause
- **Users** — View all, block/unblock, view details
- **Transactions** — All Stripe charges, filter by mode/status/date
- **Activity** — Full audit trail of admin + system actions
- **Postcards** — PostGrid postcard tracking and delivery status

### Admin RLS

Admins bypass user ownership checks via RLS policies that check `profile.role IN ('admin', 'super_admin')`.

---

## Postcard Editor (TODO)

The postcard editor at campaign step 3 (`/campaign/step3`) is currently a **placeholder**. The other team is building the PostGrid editor integration.

**What exists:**
- `FabricEditor.jsx` — Canvas-based editor using Fabric.js (used in `CampaignEdit.jsx` and blast flow)
- `CampaignPostGridEdit.jsx` — PostGrid iframe editor wrapper (used in `CampaignEdit.jsx`)
- `ai-generate-metadata` edge function — Converts postcard HTML to PostGrid editorData JSON
- `postgrid-editor-session` edge function — Creates PostGrid editor session URLs

**Integration point:** `src/pages/campaign/v2/EditTemplate/EditTemplate.jsx` has a TODO comment marking where the editor component should be rendered.

---

## Known Issues

| Issue | Location | Impact |
|-------|----------|--------|
| Edge functions have no auth checks | All edge functions | Anyone can call them without a valid session |
| PostGrid webhook signatures not verified | `postgrid-webhook/index.ts` | Fake webhook events could be accepted |
| `postcard-html-generator` may use invalid model names | Edge function | Could fail with model-not-found errors |
| Inconsistent PostGrid env vars | Various | `POSTGRID_API_KEY` vs `VITE_POSTGRID_API_KEY` used interchangeably |
| `VITE_STRIPE_SECRET_KEY` exposed to frontend | `.env` | Stripe secret key has VITE_ prefix (should be backend-only) |
| No test suite | Entire project | No unit or integration tests exist |

---

## localStorage Keys

Campaign state is persisted across page reloads via localStorage.

| Key | Set By | Purpose |
|-----|--------|---------|
| `cached_brand_data` | BrandDevContext | Brand.dev API response + mapped data |
| `cached_postcards` | PostcardContext | AI-generated postcard HTML |
| `newCampaignData` | CompanyDetails | Company details for current campaign |
| `currentCampaignStep` | Campaign steps | Current step number (1-5) |
| `currentCampaignId` | CompanyDetails | Active campaign UUID |
| `campaignDesignUrl` | EditTemplate | Cloudinary design URL |
| `campaignPreviewUrl` | EditTemplate | Cloudinary preview URL |
| `postgrid-template-id` | Editor | PostGrid template UUID |
| `pendingVerificationEmail` | SignUp | Email awaiting verification |
| `emailResendLastSent` | EmailVerification | Cooldown timestamp |
| `adminSession` | AdminLogin | Admin user info |

**sessionStorage:**

| Key | Set By | Purpose |
|-----|--------|---------|
| `campaignTargetingData` | CampaignStep4 | ZIP codes + targeting config |

---

Last Updated: February 2026
