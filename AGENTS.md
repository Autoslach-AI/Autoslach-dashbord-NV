# Project: NEURAL_AGENT_OS

## UI Component: Double Ribbon Intelligent

The "Double Ribbon Intelligent" is the standard navigation engine for this project. When the user mentions "Double ruban intelligent" or requests a navigation structure of this type, use this defined logic.

### Core Architecture
- **Primary Ribbon (Global)**: Fixed on the left, `#000000` background, `border-white/10`.
- **Secondary Ribbon (Specific)**: Persistent manual menu triggered by items like "Agents" or "Word Assistant".
- **Toggle Node**: A "Crochet" button to collapse/expand the primary ribbon, located in the header.
- **Admin Node**: A profile section at the bottom that contains "Settings".

### Implementation Detail
The component is stored in `/components/DoubleRibbonIntelligent.tsx`.

### Design Constrains
- Background: Black Obsidian (`#000000`)
- Borders: `white/10` (0.1 opacity)
- Typography: High-contrast Monospaced/Sans-serif hybrid, uppercase tracking.
- Colors: Neon Green (`#4ade80`) for active states and pulses.
