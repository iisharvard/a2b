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

## License

This project is licensed under the MIT License - see the LICENSE file for details. 
