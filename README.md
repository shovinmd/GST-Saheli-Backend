# GST Saheli Backend Server ⚙️

The GST Saheli backend is a Node.js Express server that interfaces with MongoDB Atlas for profile state management, coordinates Firebase token authentication, and dispatches rich transactional emails (supporting both SMTP Relay and Brevo HTTP REST API).

---

## 🛠️ Tech Stack
*   **Runtime**: Node.js (v18+)
*   **Framework**: Express.js
*   **Database**: MongoDB Atlas via Mongoose ORM
*   **Email Deliverability**: SMTP Relay (highly recommended, e.g. Gmail / Brevo SMTP) or Brevo Transactional REST API
*   **Identity Provider**: Firebase Admin SDK (with fallback mock support)

---

## 🔑 Environment Variables (`.env`)

Create a `.env` file inside the `backend/` directory with the following variables:

```env
PORT=5000
MONGODB_URI=mongodb+srv://MyPro:<password>@cluster0.ey3rp.mongodb.net/GST?retryWrites=true&w=majority

# Optional: Path to your Firebase service account JSON.
# Leave blank to run in mock validation mode for developer test purposes.
FIREBASE_SERVICE_ACCOUNT_PATH=

# DEFAULT EMAIL CONFIGURATION (Brevo REST API)
BREVO_API_KEY=your_brevo_api_key_here
SENDER_EMAIL=no-reply@gstsaheli.com
SENDER_NAME="GST Saheli Team"

# SMTP RELAY CONFIGURATION (RECOMMENDED FOR CLOUD DEPLOYMENTS LIKE VERCEL)
# Use SMTP Relay to completely bypass Brevo's "unrecognized IP address" restrictions.
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=shovinmicheldavid1285@gmail.com
SMTP_PASS=your-smtp-password-or-app-password
```

> [!TIP]
> **Why use SMTP?**
> When deploying backend servers on serverless cloud platforms like Vercel, server IP addresses change dynamically. Brevo blocks REST API calls from unknown IPs with a `401 Unauthorized` error. Using SMTP Relay (`smtp-relay.brevo.com` or Gmail SMTP) bypasses source IP restrictions completely.

---

## 🔌 API Endpoints

### 1. Authentication & Profile
*   **`POST /api/auth/signup`**
    - **Description**: Verifies the user ID token and creates or returns the user profile in MongoDB Atlas. If it is a new user, triggers a welcome email.
    - **Header**: `Authorization: Bearer <firebase_token>` (optional)
    - **Body Parameters**:
        ```json
        {
          "firebaseUid": "user_uid",
          "email": "user@example.com",
          "name": "User Name",
          "phoneNumber": "9876543210"
        }
        ```
*   **`POST /api/auth/forgot-password`**
    - **Description**: Generates a secure Firebase reset link and sends it to the user's registered inbox.
    - **Body Parameters**:
        ```json
        {
          "email": "user@example.com"
        }
        ```
*   **`POST /api/user/profile`**
    - **Description**: Securely updates the user's profile image `photoUrl` in MongoDB.
    - **Header**: `Authorization: Bearer <firebase_token>` (required)
    - **Body Parameters**:
        ```json
        {
          "photoUrl": "https://example.com/avatar.png"
        }
        ```

### 2. User Statistics & Reports
*   **`POST /api/user/report`**
    - **Description**: Dispatches a beautifully formatted learning progress summary containing XP coins, active streaks, and badge details.
    - **Body Parameters**:
        ```json
        {
          "email": "user@example.com",
          "name": "User Name",
          "points": 250,
          "streak": 5,
          "badgesCount": 3
        }
        ```
*   **`POST /api/user/practice`**
    - **Description**: Records quiz results in the database under the secure `practices` collection (linked to the user's UID) and awards XP coins.
    - **Header**: `Authorization: Bearer <firebase_token>` (required)
    - **Body Parameters**:
        ```json
        {
          "quizTitle": "GST Rate Master Quiz",
          "score": 80,
          "totalQuestions": 5,
          "pointsEarned": 80
        }
        ```

---

## 🚀 Running the Server

1.  **Navigate to directory**:
    ```bash
    cd backend
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Start the server**:
    ```bash
    npm start
    ```
    *(For development mode with auto-reload: `npm run dev`)*

---

## ☁️ Vercel Deployment

This backend is pre-configured for serverless deployment on Vercel via the `vercel.json` config file.

### Steps to Deploy:
1. Log in to [vercel.com](https://vercel.com) using GitHub.
2. Import your `GST-Saheli-Backend` repository.
3. Add environment variables:
   - `MONGODB_URI`
   - `SMTP_HOST`
   - `SMTP_PORT`
   - `SMTP_USER`
   - `SMTP_PASS`
   - `SENDER_EMAIL`
   - `SENDER_NAME`
4. Click **Deploy**.
