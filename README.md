# 🌌 Lumina Expense Tracker (Branded as Wealthy)

**Lumina Expense Tracker** is a state-of-the-art, feature-rich financial ledger ecosystem designed to simplify transaction logging through automated and intelligent tools. It is structured as a **monorepo** consisting of a Node.js API server, a mobile-first Next.js progressive web application (PWA) with native Capacitor integration, a standalone native Flutter mobile application, and a Next.js administrative control console.

---

## 📐 Monorepo Architecture & Directory Map

```text
lumina-expense-tracker/
├── server/                    # Node.js Express API Backend (TypeScript)
│   ├── src/
│   │   ├── config/            # DB configuration
│   │   ├── controllers/       # Business logic (Auth, Admin, Transactions, Categories)
│   │   ├── middleware/        # JWT Authentication & Route Guards
│   │   ├── models/            # Mongoose Schemas (User, Transaction, Category, Otp)
│   │   ├── routes/            # Express Router Endpoints
│   │   └── utils/             # Mailers (Resend API/SMTP) & Token Generators
│   └── tsconfig.json
│
├── apps/
│   ├── web/                   # Next.js Web App & Mobile PWA (TailwindCSS v4, Zustand)
│   │   ├── android/           # Capacitor Native Android wrapper
│   │   │   └── app/src/main/java/com/lumina/tracker/
│   │   │       ├── MainActivity.java  # Native SMS listener & JS event bridge
│   │   │       └── SmsReceiver.java   # Android broadcast receiver for transaction SMS
│   │   ├── src/
│   │   │   ├── app/           # Next.js App Router (Dashboard, History, Analytics)
│   │   │   ├── components/    # Reusable UI (Voice visualizer, SMS overlay, date selectors)
│   │   │   ├── lib/           # Axios API configuration & date utils
│   │   │   └── stores/        # Zustand state stores
│   │   └── package.json
│   │
│   ├── admin/                 # Next.js Administrative Control Dashboard
│   │   ├── src/
│   │   │   ├── app/           # Admin pages (User detail analytics, newsletters, categories)
│   │   │   ├── components/    # Shared admin UI components
│   │   │   └── lib/           # API helper methods
│   │   └── package.json
│   │
│   └── mobile/                # Native Flutter Mobile Client (Dart)
│       ├── lib/
│       │   ├── models/        # Local serialization models
│       │   ├── providers/     # State management (Riverpod, hooks)
│       │   ├── screens/       # Views (Dashboard, History, Analytics, Custom Categories)
│       │   ├── services/      # Networking (Dio API service)
│       │   └── theme/         # App UI theme stylesheet
│       └── pubspec.yaml
```

---

## 🛠️ Technology Stack

### 1. Backend API (`/server`)
- **Language**: TypeScript
- **Framework**: Node.js & Express
- **Database**: MongoDB & Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens) & Password encryption via `bcryptjs`
- **Mail Services**: Nodemailer for local testing & custom SMTP; **Resend API** for reliable production delivery on Render
- **AI Integrations**: Gemini 2.5 Flash API (utilizing `gemini-2.5-flash:generateContent`)

### 2. Frontend Web App & PWA (`/apps/web`)
- **Framework**: Next.js 16.2 & React 19 (App Router)
- **Styling**: TailwindCSS v4, `@base-ui/react` (un-styled UI), and CSS animations
- **State Management**: Zustand (local persistent states) & TanStack React Query v5 (server-side data fetching)
- **Native Wrapper**: Capacitor (Android/iOS integration)
- **Plugins**: `@capacitor/geolocation` (acquires location coordinates) & `@capacitor-community/speech-recognition` (native audio transcribing)
- **Visuals & Charts**: Lucide React icons, Recharts animations, and custom canvas visualizers

### 3. Administrative Portal (`/apps/admin`)
- **Framework**: Next.js 16.2 & React 19
- **Styling**: TailwindCSS v4 & `@base-ui/react`
- **Charts**: Recharts animations
- **Data Flow**: Direct API communication with the backend administration controller

### 4. Native Mobile App (`/apps/mobile`)
- **Framework**: Dart & Flutter
- **State Management**: hooks_riverpod & flutter_hooks
- **Networking**: Dio (advanced HTTP client)
- **Storage**: Shared Preferences (secure session/token store)
- **Charts**: fl_chart

---

## 💎 Core & Innovative Features

### 🎙️ 1. AI Natural Language & Speech Processing
*   **Voice Logging**: Users can record voice commands detailing their spend (e.g., *"spent three hundred rupees on coffee at Starbucks"*).
*   **Dual Engine Parsing**: The API uses the Google Gemini 2.5 Flash API to parse spoken text into structured transaction fields. If offline or if the API key is missing, it dynamically falls back to a **Local Rule-Based Parser**.
*   **Indian Currency & Arithmetic Evaluation**: The local parser contains custom regex handlers for Indian currency syntax (`₹`, `Rs.`, `INR`, `rupees`) and includes a **mathematical addition evaluator** (e.g., if a user states *"1200 + 120"* or *"1200 rupees plus 120 rupees"*, it calculates the sum `1320` and fills the amount).

### 💬 2. Native Android SMS Interception & Webview Bridge
*   **Broadcast Interceptor**: The Capacitor native Android bundle includes a custom `SmsReceiver.java` broadcast receiver that intercepts incoming SMS alerts.
*   **Smart Filtering**: It filters for messages containing debit/credit triggers (`debited`, `spent`, `charged`, `paid`, `received`, `credited`, etc.) and banking currency markers (`rs`, `inr`, `₹`).
*   **Javascript Bridge**: When a transactional SMS arrives, the background thread parses the text and evaluates JavaScript in the Capacitor webview, dispatching a custom `bankSmsReceived` browser event.
*   **Instant Logging Notification**: Next.js listens to this event and displays an elegant overlay alert (`SmsPromptOverlay.tsx`). Clicking the alert instantly takes the user to the log screen, auto-parsing and auto-filling the transaction details.

### 🌊 3. Siri-Style Waveform Canvas Visualizer
*   To prevent locking microphone resources when Capacitor's native Speech Recognition runs, the app checks if it is running on a native device and runs a custom physics-simulated waveform loop on an HTML5 canvas.
*   When running in standard desktop web browsers, it connects directly to the `MediaStream` microphone source via the browser's `AudioContext` and dynamically visualizes the amplitude of the voice stream in real-time.

### 📍 4. Automatic Geolocation Capture
*   During transaction creation, the system triggers `@capacitor/geolocation` to capture the exact GPS coordinates.
*   It performs a reverse-geocoding lookup via the OpenStreetMap Nominatim API to label the coordinate coordinates with a human-readable city or town name.

### 🖥️ 5. Control Center Admin Panel
*   **Platform Dashboard**: Real-time counts of active/suspended users, total platform transactions, volume breakdown (total income vs total expenses), and user signup timelines.
*   **User Manager**: Full user inspection list containing user names, registration dates, role mapping (user vs admin), and tier types (free vs premium). Supports account suspension toggles, manual password resets, and account deletion with cascade database cleanups.
*   **User Detail Analytics**: View specific user profiles showcasing expense distributions (pie chart) and month-over-month expense vs income trends (bar charts) generated via MongoDB aggregations.
*   **System Broadcasts**: Allows administrators to draft formatted HTML updates or security alerts and send them to all users or target premium users specifically.

---

## 🗄️ Database Schemas

### `User`
Tracks individual accounts, platform roles, subscription levels, and access suspension status.
```typescript
{
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  plan: { type: String, enum: ["free", "premium"], default: "free" },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  isSuspended: { type: Boolean, default: false }
}
```

### `Transaction`
Stores all financial inputs, payment types, custom locations, and ties them to categories.
```typescript
{
  user: { type: ObjectId, ref: "User", required: true },
  type: { type: String, enum: ["income", "expense"], required: true },
  amount: { type: Number, required: true },
  description: { type: String },
  date: { type: Date, default: Date.now, required: true },
  category: { type: ObjectId, ref: "Category", required: true },
  subcategory: { type: ObjectId },
  location: {
    lat: { type: Number },
    lng: { type: Number },
    address: { type: String }
  },
  paymentMode: { type: String, enum: ['Cash', 'UPI', 'Net Banking', 'Credit Card', 'Debit Card'], default: 'UPI' }
}
```

### `Category` & `Subcategory`
Provides flexibility for users to create customized structures, while defaulting to global templates.
```typescript
{
  name: { type: String, required: true },
  icon: { type: String, default: "Wallet" },
  color: { type: String, default: "#6bfe9c" },
  user: { type: ObjectId, ref: "User", required: false }, // Null for system defaults
  isGlobal: { type: Boolean, default: false },
  type: { type: String, enum: ["income", "expense"], required: true },
  subcategories: [{
    name: { type: String, required: true },
    user: { type: ObjectId, ref: "User", required: true }
  }]
}
```

### `Otp`
Secures authentication. Automatically deletes itself exactly 2 minutes after creation using a MongoDB TTL index.
```typescript
{
  email: { type: String, required: true },
  otp: { type: String, required: true },
  type: { type: String, enum: ["register", "reset"], required: true },
  createdAt: { type: Date, default: Date.now, expires: 120 }
}
```

---

## 🔒 Security Practices

1.  **Strict Middleware Authorization**: JWT-based Bearer authentication guards private endpoints, decoding user IDs from tokens, checking active status, and matching roles.
2.  **Cascade Cleaning**: Deleting a user account automatically wipes all related database documents (`transactions` and custom `categories`) to eliminate orphan items.
3.  **Password Safety**: Automated encryption prior to database insert via Mongoose `pre('save')` hooks and verification methods using `bcryptjs`.
4.  **Suspension Block**: Suspended users are immediately denied access on credentials check, preventing api request execution even with correct credentials.

---

## 🛠️ Utility & Maintenance Scripts

### Admin Promotion (`/server/makeAdmin.ts`)
To manually grant a registered user administrative access directly from the command line:
1. Navigate to the server folder: `cd server`
2. Run the promotion script via `ts-node`:
   ```bash
   npx ts-node makeAdmin.ts user@example.com
   ```
This updates the user's role property to `"admin"` directly within MongoDB.

---

## ⚙️ Environment Configurations

### Server (`/server/.env`)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/lumina
JWT_SECRET=supersecret_jwt_key
RESEND_API_KEY=re_123456789             # Required for email broadcasts/OTP in prod
GEMINI_API_KEY=AIzaSy...                 # Optional: enables advanced AI parsing
SMTP_HOST=smtp.mailtrap.io               # Fallback mailer configuration
SMTP_PORT=2525
SMTP_USER=user_id
SMTP_PASS=password
```

### Web App (`/apps/web/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

### Admin Portal (`/apps/admin/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

---

## 🚀 Build and Run Guidelines

- **Workspace Setup**: For local installation, package setups, and render/vercel deployment procedures, see [SETUP.md](file:///Users/shubhamshinde/Projects/lumina-expense-tracker/SETUP.md).
- **Capacitor Mobile Sync**: To compile web assets, sync Capacitor configurations, and build/export the native Android app bundle, see [MOBILE_SYNC.md](file:///Users/shubhamshinde/Projects/lumina-expense-tracker/MOBILE_SYNC.md) and [MOBILE_GUIDE.md](file:///Users/shubhamshinde/Projects/lumina-expense-tracker/apps/web/MOBILE_GUIDE.md).
