# MASTER BLUEPRINT: BUILD "WEALTHY" - OFFLINE-FIRST AI-NATIVE EXPENSE TRACKER

You are an expert software engineer task force. Your goal is to build **"Wealthy"**—a production-grade, offline-first, AI-native expense tracking system. The architecture is a monorepo consisting of a native mobile app (`apps/mobile`), a NestJS server backend (`apps/server`), an administrative Next.js web application (`apps/admin`), and shared schema libraries.

---

## SECTION 1: ARCHITECTURAL BLUEPRINT & TECH STACK

### 1. Client App & Local Layer (`apps/mobile`)
*   **Core Framework:** React Native with Expo (TypeScript).
*   **Routing System:** Expo Router (file-system tab & stack layouts).
*   **Styling Engine:** NativeWind (Tailwind CSS v4) matching dark/light CSS variables.
*   **Offline Relational Storage:** **WatermelonDB** or **Expo SQLite**. All transaction listings, category indexes, payment configurations, summaries, and mutation logs must be queried via local SQL queries.
*   **State & Caching Manager:** TanStack Query (React Query) configured with a custom local persistence adapter (`persistQueryClient`) to instantly read and preserve request caching locally.

### 2. Synchronization Layer (`packages/sync`)
*   **Sync Engine:** Bi-directional CRDT replication protocol using **PowerSync** or **Replicache**.
*   **Mutation Lifecycle:**
    1. A transaction write (create/update/delete) executes immediately on the local SQLite DB.
    2. An optimistic update updates the UI in under 16ms.
    3. The mutation is saved inside a local transaction queue (`SyncQueue`).
    4. An online listener detects network availability, fires background sync calls, applies server conflict merges (last-write-wins), and clears successfully processed items from the local queue.

### 3. Server API Backend (`apps/server`)
*   **Runtime Framework:** NestJS (Fastify adapter).
*   **Database ORM:** Prisma ORM connected to PostgreSQL.
*   **Validation Pipeline:** Enforced NestJS validation pipes utilizing class-validator DTO objects.

### 4. AI & Natural Language Processing Layer
*   **Core Model:** Gemini API.
*   **Structured Outputs Parser:** Strict JSON Schema validation. Instruct the model to return a structured JSON response matching the layout below, rejecting any loose conversational text:
    ```json
    {
      "amount": number,
      "type": "income" | "expense",
      "category": string,
      "subcategory": string,
      "paymentMode": string,
      "subPaymentMode": string,
      "description": string
    }
    ```

---

## SECTION 2: DATABASE SCHEMA ARCHITECTURE (POSTGRESQL & SQLITE)

Implement the database layer using the following relational structure:

### 1. `User` Schema
*   `id`: UUID (Primary Key)
*   `email`: String (Unique)
*   `passwordHash`: String
*   `twoFactorSecret`: String (Nullable)
*   `twoFactorEnabled`: Boolean (Default: false)
*   `createdAt`: Timestamp
*   `settings`: JSON object matching: `{ autoOpenKeyboard: boolean, smsParserActive: boolean }`

### 2. `Transaction` Schema
*   `id`: UUID (Primary Key)
*   `userId`: UUID (Foreign Key $\rightarrow$ User)
*   `amount`: Decimal
*   `type`: Enum (`income`, `expense`)
*   `categoryId`: UUID (Foreign Key $\rightarrow$ Category)
*   `subcategoryId`: UUID (Foreign Key $\rightarrow$ Subcategory, Nullable)
*   `paymentModeId`: UUID (Foreign Key $\rightarrow$ PaymentMode)
*   `subPaymentModeId`: UUID (Foreign Key $\rightarrow$ SubPaymentMode, Nullable)
*   `description`: String (Nullable)
*   `smsText`: String (Nullable, for duplicate verification checks)
*   `isOffline`: Boolean (Default: false)
*   `createdAt`: Timestamp

### 3. `Category` Schema
*   `id`: UUID (Primary Key)
*   `name`: String
*   `icon`: String (Material Symbols identifier)
*   `color`: String (HEX color value)
*   `type`: Enum (`income`, `expense`)
*   `isGlobal`: Boolean (Default: false)
*   `userId`: UUID (Foreign Key $\rightarrow$ User, Nullable)

### 4. `Subcategory` Schema
*   `id`: UUID (Primary Key)
*   `categoryId`: UUID (Foreign Key $\rightarrow$ Category)
*   `name`: String

### 5. `PaymentMode` Schema
*   `id`: UUID (Primary Key)
*   `name`: String
*   `isGlobal`: Boolean (Default: false)
*   `userId`: UUID (Foreign Key $\rightarrow$ User, Nullable)

### 6. `SubPaymentMode` Schema
*   `id`: UUID (Primary Key)
*   `paymentModeId`: UUID (Foreign Key $\rightarrow$ PaymentMode)
*   `name`: String

### 7. `Notification` Schema
*   `id`: UUID (Primary Key)
*   `userId`: UUID (Foreign Key $\rightarrow$ User)
*   `title`: String
*   `message`: String
*   `read`: Boolean (Default: false)
*   `smsText`: String (Nullable, for deduplication checking)
*   `createdAt`: Timestamp

---

## SECTION 3: API ENDPOINT SPECIFICATIONS

### 1. Authentication Router (`/api/auth`)
*   `POST /register`: Registers user, seeds default global categories (Food, Travel, Utilities, Salary) and payment modes (Cash, UPI, Net Banking, Credit Card, Debit Card).
*   `POST /login`: Validates password. If 2FA is enabled, generates a 6-digit OTP code, emails it, and prompts for `2fa-verify`.
*   `POST /login/verify`: Verifies login OTP, returning JWT access token.
*   `PUT /settings`: Updates settings object (e.g. toggles keypad autofocus).

### 2. Transactions Router (`/api/transactions`)
*   `GET /`: Fetches transactions with query parameters for `page`, `limit`, `search`, `type`, `startDate`, `endDate`, and `sort`. Returns paginated list and balance aggregates.
*   `POST /`: Creates transaction record.
*   `PUT /:id`: Updates transaction.
*   `DELETE /:id`: Deletes transaction.
*   `POST /auto-log`: Parses SMS texts. First queries `Notification` for duplicates using `smsText` and `userId`. If unique, runs Gemini NLP parse and inserts record.

### 3. Categories Router (`/api/categories`)
*   Supports full index fetching, parent CRUD, and subcategory nested items updates.

### 4. Payment Modes Router (`/api/payment-modes`)
*   Supports custom parent and child modes CRUD operations.

---

## SECTION 4: NATIVE MOBILE USER FLOWS & SCREEN SPECIFICATIONS

Implement the following frontend screen configurations inside `apps/mobile`:

### SCREEN 1: Real-time Dashboard Overview (`app/(tabs)/index.tsx`)
*   **Header Bar:** Sticky top banner. Shows "Wealthy", an offline indicator badge when network is disconnected, and a clickable Notification Bell displaying the unread notification count.
*   **Balance Summary Cards:** Displays two dynamic cards: Total Balance and Month Summary (Income vs Expense) with interactive charts.
*   **Floating Action Button (FAB):** Emerald microphone dictation icon in the center of the bottom tab bar.
    *   *Tap Gesture:* Redirects to `/dashboard/add?voice=true`.
    *   *Swipe Up Gesture:* Animates open a circular speed dial showing quick triggers: Income, Expense, and Voice Dictation.

### SCREEN 2: Add / Edit Transaction Screen (`app/dashboard/add.tsx`)
*   **Autofocus Keypad setting:** If user's settings profile has `autoOpenKeyboard: true`, focus the numerical amount input instantly on screen load.
*   **Voice Dictation Journey (`/add?voice=true`):** Launches native microphone audio processing instantly on mount. Transcribes voice input and renders a **Voice Journey Timeline** detailing:
    1. *Microphone capturing speech patterns...*
    2. *Speech-to-text transcription complete...*
    3. *Gemini NLP structured parsing loaded...*
    4. *Form fields populated!*
*   **SMS Paste Timeline Journey:** A text box allowing users to paste transaction SMS alerts. Renders a **Message Journey Timeline** showing:
    1. *SMS payload captured...*
    2. *Duplicate check completed...*
    3. *Gemini parsing successful...*
    4. *Values resolved!*
*   **Row-Chunked Category Grid:** Slices filtered categories into rows of 4 columns.
*   **Dynamic Pointer Subcategory Box:** Clicking a parent category opens the subcategory drawer directly under its grid row. Renders a small upward border triangle pointer at the top of the box. Computes the column index of the clicked category to shift the pointer triangle class horizontally (`left-[12.5%]` for col 1, `left-[37.5%]` for col 2, `left-[62.5%]` for col 3, `left-[87.5%]` for col 4).
*   **Chips Style:** Unselected chips must show a solid white background in light mode (`bg-background`) and dark gray in dark mode (`dark:bg-zinc-800/60`), outlined with a subtle border (`border border-border/40`).

### SCREEN 3: Debounced Transactions Ledger (`app/(tabs)/history.tsx`)
*   **Debounced Search Bar:** Search input debounced by 400ms to throttle server requests.
*   **Filters Panel:** From/To date picker inputs and type selectors (All, Income, Expense).
*   **Interactive Exports Dropdown:** Touch-friendly dropdown list containing PDF, CSV, and Excel spreadsheets downloads. Left-align lists to prevent layout clipping on mobile screens.

### SCREEN 4: Swipeable Notifications Drawer (`app/dashboard/notifications.tsx`)
*   **Separated Alert Boards:** Renders unread alerts at the top under "New Alerts" and read alerts below under "Read Alerts".
*   **Swipe-to-Action Gestures:** Swipeable cards utilizing pan gesture responders. Swiping right-to-left reveals dual buttons:
    *   *Read Button (Blue):* Marks alert as read on the database.
    *   *Delete Button (Red):* Deletes alert.
*   **Expandable SMS Log Viewer:** Expanding a native SMS notifications card displays an inline logs timeline detailing the background SMS capture tracking metrics.

### SCREEN 5: Settings Console (`app/(tabs)/settings.tsx`)
*   **Aesthetics:** iOS/Samsung One UI layout grouping preferences inside rounded card containers (`bg-card rounded-2xl border border-border`).
*   **Switches:** Pure CSS sliding switches for:
    *   *Autofocus Keypad:* Toggles `autoOpenKeyboard`.
    *   *Active SMS Logging:* Toggles `smsParserActive` database value.
*   **Ledgers Configuration Managers:** Clickable items to access categories and payment mode lists.

---

## SECTION 5: DEEP-DIVE PIPELINE DESIGNS

### 1. Offline Caching & Reconnection Engine
The synchronization engine uses a local SQLite staging buffer.

#### Sequence Mapping
```
[User Interaction] 
       │
       ▼
1. SQLite Local Write ──> UI updates instantly (under 16ms)
       │
       ▼
2. Write added to Local Sync Queue (localStorage/SQLite table)
       │
       ▼
3. Connection Check (via NetInfo listener)
       ├─────── [Offline] ──────> Queue paused. Data sits securely in SQLite.
       │
       └─────── [Online] ───────> Flush Queue:
                                      │
                                      ▼
                                  POST /api/sync/flush
                                  Server applies edits to Postgres
                                  Clears resolved local queue rows
```

#### Sync Queue Storage Schema (SQLite Table: `sync_queue`)
```sql
CREATE TABLE sync_queue (
  id TEXT PRIMARY KEY,
  action TEXT, -- 'CREATE' | 'UPDATE' | 'DELETE'
  endpoint TEXT, -- '/api/transactions' | '/api/categories'
  payload TEXT, -- JSON string containing modifications
  createdAt INTEGER
);
```

#### Reconnection Sync Handler (React Native Client)
```typescript
import NetInfo from "@react-native-community/netinfo";

export function configureReconnectionSync(queryClient: any) {
  NetInfo.addEventListener(state => {
    if (state.isConnected) {
      console.log("Internet re-established! Flushing mutation queue...");
      triggerQueueFlush(queryClient);
    }
  });
}

async function triggerQueueFlush(queryClient: any) {
  const localQueue = await sqliteDb.getAll("SELECT * FROM sync_queue ORDER BY createdAt ASC");
  if (localQueue.length === 0) return;

  for (const item of localQueue) {
    try {
      await axios.post("/api/sync/flush-item", {
        action: item.action,
        endpoint: item.endpoint,
        payload: JSON.parse(item.payload)
      });
      // Delete item from queue on success
      await sqliteDb.run("DELETE FROM sync_queue WHERE id = ?", [item.id]);
    } catch (err) {
      console.error("Flush item failed, pausing queue processing", err);
      break; // Pause queue execution to preserve strict sequence ordering
    }
  }
  // Refresh query cache keys System-Wide
  queryClient.invalidateQueries();
}
```

---

### 2. Native Background SMS Interceptor & Deduplication Parser
The background logging process executes via native Android modules.

#### Workflow Diagram
```
[Income SMS Message]
         │
         ▼
1. Android Background SmsReceiver Intercepts
         │
         ▼
2. Check exclusion keywords (failed, declined, insufficient...)
         ├────── [Exclusion Matched] ─────> Process terminates (Do not log)
         │
         └────── [No Exclusion] ──────────> Check SharedPreferences
                                                │
                                                ▼
                                            Write message to SharedPreferences
                                            Raise user push notification
                                                │
                                                ▼
                                            [Warm Start / App Resume]
                                            Capacitor plugin reads SharedPreferences
                                                │
                                                ▼
                                            POST /api/transactions/auto-log
                                                │
                                                ▼
                                            [NestJS Server check]
                                            Does Notification collection contain smsText hash?
                                                ├────── [Yes - Duplicate] ───> Stop (Send 200 OK)
                                                │
                                                └────── [No - Unique] ──────> Send to Gemini
                                                                                  │
                                                                                  ▼
                                                                              Create Postgres Row
                                                                              Save text hash to Notification
```

#### Native Android SMS Receiver (`SmsReceiver.java`)
```java
package com.wealthy.tracker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import android.telephony.SmsMessage;
import java.util.Arrays;
import java.util.List;

public class SmsReceiver extends BroadcastReceiver {
    private static final List<String> EXCLUSIONS = Arrays.asList(
        "failed", "declined", "reverted", "returned", "cancelled", "unsuccessful", "insufficient"
    );

    @Override
    public void onReceive(Context context, Intent intent) {
        Bundle bundle = intent.getExtras();
        if (bundle == null) return;

        Object[] pdus = (Object[]) bundle.get("pdus");
        if (pdus == null) return;

        for (Object pdu : pdus) {
            SmsMessage message = SmsMessage.createFromPdu((byte[]) pdu);
            String body = message.getMessageBody().toLowerCase();

            // 1. Check exclusion keywords
            boolean isExcluded = false;
            for (String term : EXCLUSIONS) {
                if (body.contains(term)) {
                    isExcluded = true;
                    break;
                }
            }
            if (isExcluded) continue;

            // 2. Extract transaction indicator (e.g. debited, credited, spent, received)
            if (body.contains("debited") || body.contains("credited") || body.contains("spent") || body.contains("received")) {
                saveSmsToStorage(context, message.getMessageBody());
            }
        }
    }

    private void saveSmsToStorage(Context context, String smsText) {
        SharedPreferences prefs = context.getSharedPreferences("WealthySmsQueue", Context.MODE_PRIVATE);
        String currentQueue = prefs.getString("pending_sms", "[]");
        // Append message string securely inside JSON Array array format
        String updatedQueue = appendToJsonStringArray(currentQueue, smsText);
        prefs.edit().putString("pending_sms", updatedQueue).commit(); // Force synchronous write
    }
}
```

---

### 3. Voice Journey Timeline & Audio Parsing Flow

The speech engine uses dynamic UI timeline journals to track recording progress.

#### Speech Logging Sequence Diagram
```
[Voice Microphone Action]
          │
          ▼
1. User activates FAB Dictation (`/add?voice=true`)
          │
          ▼
2. Record Audio (Expo AV library captures user speech inputs)
          │
          ▼
3. Transcribe Audio (POST audio payload to OpenAI Whisper)
          │
          ▼
4. Structured Analysis (Send transcript to NestJS + Gemini)
          │
          ▼
5. Hydrate Fields (Populate categories, amounts, payment modes)
```

#### UI Timeline Render Component (`add.tsx`)
```tsx
type TimelineStep = {
  id: number;
  label: string;
  status: 'pending' | 'active' | 'complete';
};

export function VoiceJourneyTimeline({ steps }: { steps: TimelineStep[] }) {
  return (
    <div className="bg-muted p-5 rounded-3xl border border-border space-y-4">
      <div className="flex items-center gap-2 border-b border-border/60 pb-2">
        <span className="material-symbols-outlined text-primary text-lg animate-pulse">settings_voice</span>
        <h4 className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Voice Processing Logs</h4>
      </div>
      <div className="space-y-3">
        {steps.map((step) => (
          <div key={step.id} className="flex items-center gap-3">
            <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center border ${
              step.status === 'complete' ? 'bg-primary border-primary' :
              step.status === 'active' ? 'bg-secondary border-primary/50 animate-pulse' :
              'bg-background border-border'
            }`}>
              {step.status === 'complete' && <span className="material-symbols-outlined text-[8px] text-black">check</span>}
            </div>
            <span className={`text-xs font-semibold ${
              step.status === 'active' ? 'text-primary' :
              step.status === 'complete' ? 'text-foreground' :
              'text-muted-foreground'
            }`}>{step.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## SECTION 6: PLATFORM ADMINISTRATIVE PANEL (`apps/admin`)

*   **Platform overview dashboard:** Visualizes platform statistics, active members count, database storage, and system activity charts.
*   **Transactions Table:** Sortable tables for global transaction audits.
*   **Combobox Autocompletion:** Autocomplete components for selecting targeted users.
*   **Multi-User Broadcast Dispatcher:** Form to send platform-wide notifications with selection filters (`In-App`, `Email`, `Both`). Target users are displayed as removable blue chips.

---

## SECTION 7: STEP-BY-STEP IMPLEMENTATION PLAN

Follow this roadmap to build the application:
1.  **Phase 1: DB & Server Core:** Configure PostgreSQL database tables using Prisma. Build NestJS endpoints with Fastify, validating DTO inputs.
2.  **Phase 2: Structured NLP:** Integrate Gemini API using structured JSON Schema outputs to process transaction messages.
3.  **Phase 3: Client App & SQLite:** Initialize the Expo React Native app. Set up SQLite schemas using WatermelonDB.
4.  **Phase 4: Sync & Caching Gateway:** Integrate PowerSync/Replicache to sync the client SQLite database with PostgreSQL.
5.  **Phase 5: Mobile UI & Selection:** Build mobile screens. Implement row-chunked category selectors and the dynamic pointer triangle.
6.  **Phase 6: Native Android Backgrounds:** Write Android background SMS services and bridge connectors.
7.  **Phase 7: Admin Panel console:** Build the Next.js admin dashboard and multi-user broadcast tool.
8.  **Phase 8: Audit & Compilation check:** Run TypeScript audits (`npx tsc --noEmit`) to verify clean builds.
