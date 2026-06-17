# GST Saheli Backend Server ⚙️

The GST Saheli backend is a Node.js Express server that interfaces with MongoDB Atlas for profile state management, coordinates Firebase token authentication, and dispatches rich transactional emails via the Brevo SMTP API.

---

## 🛠️ Tech Stack
*   **Runtime**: Node.js (v18+)
*   **Framework**: Express.js
*   **Database**: MongoDB Atlas via Mongoose ORM
*   **Email Deliverability**: Brevo Transactional API (SMTP)
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

# Brevo configuration parameters
BREVO_API_KEY=your_brevo_api_key_here
SENDER_EMAIL=no-reply@gstsaheli.com
SENDER_NAME="GST Saheli Team"
```

---

## 🔌 API Endpoints

### 1. Authentication
*   **`POST /api/auth/signup`**
    - **Description**: Verifies the user ID token and creates or returns the user profile in MongoDB Atlas. If it is a new user, triggers the Brevo welcome email.
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
2. Select **Add New...** > **Project** and import your `GST-Saheli-Backend` repository.
3. Keep default settings (Framework Preset: **Other**, Root Directory: `./`).
4. Expand **Environment Variables** and add:
   - `MONGODB_URI` (MongoDB connection string)
   - `BREVO_API_KEY` (API key from Brevo)
   - `SENDER_EMAIL` (Sender email)
   - `SENDER_NAME` (Sender name)
   - `NODE_ENV` = `production`
5. Click **Deploy**. Vercel will automatically host the Express server.

