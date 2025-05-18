# Negotiation App for Frontline Negotiators

A React application designed for frontline negotiators who need to analyze case files, extract key information, and develop negotiation strategies.

## Features

- **AI-Powered Analysis**: Extract Islands of Agreement, generate Iceberg analysis, identify negotiation components, determine redlines and bottomlines, and create scenario analyses.
- **Interactive Editing**: Real-time markdown editing and preview for all analyses.
- **Dynamic Boundary Adjustment**: Recalculate redlines and bottomlines based on revised analyses.
- **Scenario Visualization**: Visual representation of negotiation scenarios along a spectrum.
- **Risk Assessment**: Detailed risk analysis for selected scenarios with editable assessment tables. (TODO)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone https://github.com/yourusername/negotiation-app.git
   cd negotiation-app
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Start the development server
   ```
   npm run dev
   ```

4. Build for production
   ```
   npm run build
   ```

## Usage

### Initial Setup

1. Enter your case file text
2. Specify the two negotiation parties (your side and the other side)
3. Click "Enter" to process the information

### Review and Revise

1. Review the AI-generated analysis:
   - Islands of Agreement (IoA)
   - Iceberg analysis (positions, reasoning, motives for both parties)
   - Components (issues to be negotiated)
2. Edit any of these sections in real-time with markdown support
3. Click "Generate Redline/Bottomline" to proceed

### Redline/Bottomline Adjustment

1. View the AI-generated redlines and bottomlines for each component and each party
2. Edit these boundaries directly
3. Request AI recalculation of redlines/bottomlines based on revised analyses
4. Click "Finalize Boundaries" to proceed to the scenario view

### Negotiation Scenario

1. Select a negotiation component to view its scenarios
2. View the 5 possible scenarios along a spectrum
3. Select any scenario to see its details
4. Click "Generate Risk Assessment" to analyze the selected scenario

### Risk Assessment

1. View and edit the risk assessment table for the selected scenario
2. Add new risk categories as needed
3. Navigate back to scenarios or finish the analysis

## Technology Stack

- **Frontend Framework**: React with TypeScript
- **State Management**: Redux Toolkit
- **UI Framework**: Material UI
- **Data Visualization**: D3.js
- **Markdown Support**: React-Markdown with CodeMirror
- **Build Tool**: Vite

## Project Structure

```
negotiation-app/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── ComponentCard.tsx
│   │   ├── LoadingOverlay.tsx
│   │   ├── MarkdownEditor.tsx
│   │   ├── RiskAssessmentTable.tsx
│   │   └── ScenarioSpectrum.tsx
│   ├── pages/
│   │   ├── InitialSetup.tsx
│   │   ├── NegotiationScenario.tsx
│   │   ├── RedlineBottomline.tsx
│   │   ├── ReviewAndRevise.tsx
│   │   └── RiskAssessment.tsx
│   ├── services/
│   │   └── api.ts
│   │   
│   ├── store/
│   │   ├── index.ts
│   │   └── negotiationSlice.ts
│   │   
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
└── README.md
```

## Firebase Setup for Development and Production

This project uses Firebase for backend services, including Firestore and Cloud Storage. Proper setup is crucial for both local development and production.

### Local Development with Firebase Emulators

For local development, we use Firebase Emulators to simulate Firestore and Cloud Storage. This allows for offline development, faster testing, and avoids incurring costs on your live Firebase project. It also helps mitigate CORS issues locally when uploading files to Storage.

**Prerequisites:**

*   Firebase CLI installed: `npm install -g firebase-tools`
*   Authenticated with Firebase: `firebase login`

**Emulator Configuration:**

*   The emulator settings are defined in `firebase.json`. This file configures the ports for Firestore (default: 8080) and Storage (default: 9199), and specifies the rules files to be used.
*   The application (`src/firebase.ts`) is configured to automatically connect to these emulators when running in a development environment (`import.meta.env.DEV` is true and hostname is `localhost`).

**Running the Emulators:**

1.  Start the Firebase emulators:
    ```bash
    npm run emulator
    ```
    This command (defined in `package.json`) runs `firebase emulators:start --only storage,firestore`.
2.  In a separate terminal, start your development server:
    ```bash
    npm run dev
    ```

Your application will now use the local Firebase emulators.

### Production: Cloud Storage CORS Configuration

When your application is deployed to production (e.g., on Vercel at `https://a2b-nu.vercel.app`), the browser will enforce Cross-Origin Resource Sharing (CORS) policies when the frontend tries to upload files directly to your Firebase Cloud Storage bucket. You need to configure your bucket to allow requests from your production domain.

**Prerequisites:**

*   Google Cloud CLI (gcloud CLI) installed and initialized:
    *   Follow the [official installation guide](https://cloud.google.com/sdk/docs/install).
    *   Initialize the CLI and authenticate: `gcloud init`
*   Ensure your `gsutil` (part of gcloud CLI) is using a compatible Python version (3.8-3.12). If you encounter Python version errors with `gsutil`:
    *   Consider using a Python version manager like `conda` or `pyenv` to switch to a compatible version (e.g., 3.12).
    *   Alternatively, set the `CLOUDSDK_PYTHON` environment variable to the path of a compatible Python interpreter before running `gsutil` commands:
        ```bash
        export CLOUDSDK_PYTHON=/path/to/compatible/python3.12
        ```

**Steps to Configure CORS:**

1.  **Create a `cors-config.json` file** on your local machine with the following content, replacing `https://your-app-domain.com` with your actual production domain(s):

    ```json
    [
      {
        "origin": ["https://a2b-nu.vercel.app"],
        "method": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "responseHeader": ["Content-Type", "Authorization", "X-Goog-Resumable"],
        "maxAgeSeconds": 3600
      }
    ]
    ```

2.  **Identify your Firebase Storage bucket name.** This is typically `YOUR_PROJECT_ID.firebasestorage.app` (e.g., `negotiation-cb662.firebasestorage.app`).

3.  **Apply the CORS configuration using `gsutil`:**
    Open your terminal and run:
    ```bash
    gsutil cors set /path/to/your/cors-config.json gs://YOUR_BUCKET_NAME
    ```
    Example:
    ```bash
    gsutil cors set ./cors-config.json gs://negotiation-cb662.firebasestorage.app
    ```

4.  **Verify the configuration (optional but recommended):**
    ```bash
    gsutil cors get gs://YOUR_BUCKET_NAME
    ```
    This command will print the current CORS policy set on the bucket.

This setup ensures that your deployed web application can interact with Firebase Cloud Storage without being blocked by browser CORS policies. Remember that Firebase Storage Security Rules (`storage.rules`) will still govern the authorization of these requests.

### Deploying Security Rules

After updating your `firestore.rules` or `storage.rules` files, you need to deploy them to Firebase for the changes to take effect on your project. Ensure you are in your project's root directory in the terminal.

*   To deploy only Firestore rules:
    ```bash
    firebase deploy --only firestore:rules
    ```
*   To deploy only Storage rules:
    ```bash
    firebase deploy --only storage:rules
    ```
*   To deploy both Firestore and Storage rules simultaneously:
    ```bash
    firebase deploy --only firestore:rules,storage:rules
    ```
*   To deploy all Firebase project features (including rules, hosting, functions if configured):
    ```bash
    firebase deploy
    ```

It's recommended to deploy rules specifically to avoid unintended changes to other services.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
