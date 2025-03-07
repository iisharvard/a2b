# Negotiation App for Frontline Negotiators

A React application designed for frontline negotiators who need to analyze case files, extract key information, and develop negotiation strategies.

## Features

- **AI-Powered Analysis**: Extract Islands of Agreement, generate Iceberg analysis, identify negotiation components, determine redlines and bottomlines, and create scenario analyses.
- **Interactive Editing**: Real-time markdown editing and preview for all analyses.
- **Dynamic Boundary Adjustment**: Recalculate redlines and bottomlines based on revised analyses.
- **Scenario Visualization**: Visual representation of negotiation scenarios along a spectrum.
- **Risk Assessment**: Detailed risk analysis for selected scenarios with editable assessment tables.
- **Retrieval-Augmented Generation (RAG)**: Search through large case files using semantic search to find relevant information quickly.
- **File Upload**: Upload multiple case files in various formats instead of copying and pasting content.

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- OpenAI API Key (for embeddings)
- ChromaDB (for vector storage)

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

3. Set up environment variables
   ```
   cp .env.example .env
   ```
   Then edit the `.env` file to add your OpenAI API key.

4. Set up ChromaDB (optional, for RAG functionality)
   ```
   pip install chromadb
   ```
   Or use Docker:
   ```
   docker pull chromadb/chroma
   docker run -p 8000:8000 chromadb/chroma
   ```

5. Start the development server
   ```
   npm run dev
   ```

6. Build for production
   ```
   npm run build
   ```

## Usage

### Initial Setup

1. Enter your case file text or upload case files
2. Specify the two negotiation parties (your side and the other side)
3. Click "Enter" to process the information

### Using the RAG Search

1. After processing your case, the RAG search panel will appear
2. Click "Index Case for Search" to prepare the case for semantic search
3. Enter your search query in the search box
4. View the search results showing the most relevant parts of your case file
5. Use this to quickly find information in large case files

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
│   │   ├── FileUploader.tsx
│   │   ├── LoadingOverlay.tsx
│   │   ├── MarkdownEditor.tsx
│   │   ├── rag/
│   │   │   ├── CaseSearch.tsx
│   │   │   ├── CaseSearchPanel.tsx
│   │   │   ├── SearchResults.tsx
│   │   │   └── index.ts
│   │   ├── RiskAssessmentTable.tsx
│   │   └── ScenarioSpectrum.tsx
│   ├── pages/
│   │   ├── InitialSetup.tsx
│   │   ├── NegotiationScenario.tsx
│   │   ├── RedlineBottomline.tsx
│   │   ├── ReviewAndRevise.tsx
│   │   └── RiskAssessment.tsx
│   ├── services/
│   │   ├── api.ts
│   │   └── rag/
│   │       ├── documentLoader.ts
│   │       ├── embeddingService.ts
│   │       ├── index.ts
│   │       ├── ragService.ts
│   │       └── vectorStore.ts
│   │   
│   ├── store/
│   │   ├── index.ts
│   │   ├── negotiationSlice.ts
│   │   └── ragSlice.ts
│   │   
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   └── react-app-env.d.ts
├── index.html
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## License

This project is licensed under the MIT License - see the LICENSE file for details. 