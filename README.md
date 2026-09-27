# Farmer Ledger (Kisan ERP System)

Farmer Ledger is a premium, mobile-first Web Application designed for farmers to maintain digitised ledger accounts (Khaata), track balances, record crop sales, generate reports, and manage their membership plans.

The application features:
- **OTP-Only Authentication**: A secure and simplified mobile-first verification flow.
- **Multilingual Support**: Fully localized in English (`en`) and Marathi (`mr`).
- **Resilient Offline Fallback**: Features a local mock environment (using `localStorage`) when Firebase configuration is absent or during database timeouts.
- **Modern Responsive Design**: A rich glassmorphism UI with curated HSL color schemes.

---

## Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) (v18+) and `npm` installed.

### Local Installation

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd FarmerLedger
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Configure Environment Variables**:
   Create a `.env` file in the root directory (using `.env.example` as a reference):
   ```env
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_FIREBASE_MEASUREMENT_ID=your_measurement_id
   ```

4. **Run the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:5173](http://localhost:5173) in your browser.

5. **Build for Production**:
   ```bash
   npm run build
   ```

---

## Firebase & GCP Console Configuration Guide (From Scratch)

Follow these steps to fully configure your Firebase backend for Phone Auth and Firestore.

### 1. Create a Firebase Project
1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Click **Add Project**, name it (e.g., `farmer-ledger-ss`), and proceed.
3. Once the project is created, click the **Web icon (`</>`)** on the Project Overview page to register a new Web App.
4. Copy the Firebase configuration object keys and paste them into your local `.env` file.

### 2. Enable Phone Authentication
1. In the Firebase Console, go to **Build** ➔ **Authentication** in the left sidebar.
2. Click the **Sign-in method** tab.
3. Click **Add new provider** and select **Phone**.
4. Enable the Phone provider, configure any test phone numbers if needed (e.g., `+919130057189` with verification code `123456`), and click **Save**.

### 3. Initialize & Enable Cloud Firestore
1. In the Firebase Console, go to **Build** ➔ **Firestore Database**.
2. Click the **Create database** button.
3. Choose your database location (select a location closest to your users, e.g., `asia-south1` for India).
4. Select **Start in production mode** or **Start in test mode** and click **Create**.

### 4. Configure Firestore Security Rules
To allow unauthenticated users to check if a mobile number is already registered during the first step of signup, you must configure public read access specifically for the `users` collection.

1. In the Firestore Database section, click on the **Rules** tab at the top.
2. Replace the rules with the following configuration:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // Allow anyone to read and write user profile documents by mobile number
       match /users/{mobileNumber} {
         allow read, write: if true;
       }
     }
   }
   ```
3. Click **Publish**.

### 5. Configure API Key Restrictions (HTTP Referrers)
If you deploy your app or restrict your Google Cloud API key for security (preventing unauthorized use), you must explicitly authorize your domains.

1. Open the **[Google Cloud Credentials Console](https://console.cloud.google.com/apis/credentials?project=farmer-ledger-ss)** (select your project `farmer-ledger-ss`).
2. Under **API Keys**, click on the key you configured in your `.env` (often named `Browser key (auto created by Firebase)`).
3. Scroll to **Key restrictions** ➔ **Website restrictions**.
4. Add all referrers that require API key access. Ensure you include both local and deployed domains:
   - `http://localhost:5173/*` (Local Development)
   - `https://farmer-ledger-ss.firebaseapp.com/*` (Firebase Hosting Domain 1)
   - `https://farmer-ledger-ss.web.app/*` (Firebase Hosting Domain 2)
5. Click **Save**.
   *(Note: Key restriction changes may take up to 5 minutes to propagate).*

---

## Mock Mode Fallback

If no Firebase credentials are provided in `.env` (or if `isConfigValid` fails validation), the app automatically enters **Mock Mode** (`isMock = true`). 
- **Storage**: User profiles and authentication states are fully simulated using `localStorage` (saved under `farmer_profile_${mobile}`).
- **Phone Auth**: Verifying any 10-digit number with the default verification code `123456` will succeed and sign you into the local mock session.
- **GPS Mocking**: Geolocation automatically mocks Nashik region address parameters (`Niphad Rural / Nashik / 422301`) if GPS hardware is not present.
