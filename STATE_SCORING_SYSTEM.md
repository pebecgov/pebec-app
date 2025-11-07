# State Scoring System

A clean, refactored indicator scoring form system that uses descriptive string values in the frontend and numeric point mappings only on the backend.

## 🏗️ Architecture

### Database Schema
- **Table**: `state_scores`
- **Fields**:
  - `state`: string - State name (e.g., "Lagos")
  - `indicator`: string - Indicator name (e.g., "access_to_electricity")
  - `subIndicator`: string - Sub-indicator name (e.g., "connection_days")
  - `value`: string - Descriptive string selected from form (e.g., "1-10")
  - `score`: float64 - Numeric score derived from value mapping
  - `createdAt`: number - Timestamp

### Backend (Convex)
- **File**: `convex/saveStateScore.ts`
- **Global Score Mappings**: Maps descriptive strings to numeric points
- **Functions**:
  - `saveStateScore`: Saves individual sub-indicator scores
  - `getStateScores`: Retrieves scores with optional filtering
  - `getStateRankings`: Calculates state rankings

### Frontend (React)
- **File**: `components/Admin/StateScoringForm.tsx`
- **Features**:
  - Two-panel layout (indicators/states + form)
  - Descriptive string options for all form fields
  - Progress tracking
  - Auto-save functionality

## 🎯 Key Features

### 1. Descriptive String Values
All form options use human-readable strings:
```typescript
"1-10": "1-10 Working days"
"very-affordable": "Very Affordable"
"yes": "Yes"
"no": "No"
```

### 2. Backend Score Mapping
Numeric scores are calculated server-side:
```typescript
const scoreMappings = {
  "very-affordable": 3,
  "moderately-affordable": 2,
  "less-affordable": 1,
  "not-affordable": 0,
  "yes": 1,
  "no": 0,
  // ... more mappings
};
```

### 3. Supported Indicators
- Access to Electricity
- Infrastructure
- Digital Connectivity
- Land Registration (Updated)
- Small Claims Courts
- Investor Aftercare Service
- Workforce Development
- Crisis Resilience
- Contract Enforcement
- Market Access
- Getting Credit
- Export-Import Facilitation
- Interstate Trade
- Paying Taxes (New)
- Grievance Redress Mechanisms (New)
- Access to Skilled Labour (New)

## 🚀 Usage

### Frontend Form
1. Select an indicator from the dropdown
2. Choose a state from the list
3. Fill out the descriptive form options
4. Click "Save" to store scores

### Backend Processing
1. Form submits descriptive string values
2. Backend maps strings to numeric scores
3. Scores are stored in the database
4. Rankings can be calculated and displayed

## 📊 Data Flow

```
Frontend Form → Descriptive Strings → Backend Mapping → Numeric Scores → Database
```

## 🔧 Configuration

### Adding New Indicators
1. Add indicator configuration to `indicators` object in `StateScoringForm.tsx`
2. Add corresponding score mappings to `scoreMappings` in `saveStateScore.ts`
3. Update form validation if needed

### Modifying Score Mappings
Edit the `scoreMappings` object in `convex/saveStateScore.ts` to change how descriptive strings map to numeric scores.

## 🎨 UI Components

- **StateScoringForm**: Main form component with two-panel layout
- **StateListItem**: Memoized state list item for performance
- **StateForm**: Dynamic form based on selected indicator
- **Progress tracking**: Visual progress bars and completion indicators

## 📈 Performance

- **React.memo**: Prevents unnecessary re-renders
- **useMemo**: Caches expensive calculations
- **useCallback**: Optimizes event handlers
- **Single form rendering**: Only one state form renders at a time

## 🔒 Security

- User authentication required
- Role-based access control
- Data validation on both frontend and backend
- Secure score mapping on server-side

## 🧪 Testing

The system is designed to be easily testable:
- Clear separation of concerns
- Pure functions for score mapping
- Isolated components
- Type-safe operations

## 📝 Notes

- All old files have been removed for a clean implementation
- The system is fully self-contained
- No external dependencies beyond the existing tech stack
- Easy to extend with new indicators and scoring logic
