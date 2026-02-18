# Smart Crayfish Farming System - IoT Dashboard

A modern web-based dashboard for monitoring and controlling a Smart Crayfish Farming System using Internet of Things (IoT) technology.

## Features

- **Real-time Sensor Monitoring**: Live display of water quality parameters including:
  - Temperature (°C)
  - pH levels
  - Dissolved Oxygen (mg/L)
  - Electrical Conductivity (mS/cm)

- **Automated Control System**: 
  - Automatic aeration control based on dissolved oxygen levels
  - Water circulation management
  - Automated feeding schedules

- **Alert System**: Real-time notifications when water parameters exceed safe thresholds

- **Historical Data Visualization**: Interactive charts showing trends over time for all monitored parameters

- **Manual Control Panel**: Override capabilities for emergency situations

- **Remote Dashboard**: Accessible from any device with internet connection

## Technology Stack

- **Next.js 14** - React framework for production
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Composable charting library
- **Lucide React** - Beautiful icon library

## Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn

### Installation

1. Install dependencies:
```bash
npm install
# or
yarn install
```

2. Run the development server:
```bash
npm run dev
# or
yarn dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main dashboard page
│   └── globals.css         # Global styles
├── components/
│   ├── SensorCard.tsx      # Sensor display components
│   ├── AlertPanel.tsx      # Alert notification panel
│   ├── ControlPanel.tsx    # Manual actuator controls
│   └── HistoricalChart.tsx # Historical data charts
├── lib/
│   ├── constants.ts        # System constants and thresholds
│   └── utils.ts            # Utility functions
├── types/
│   └── index.ts            # TypeScript type definitions
└── package.json
```

## Water Quality Thresholds

The system monitors water quality against the following optimal ranges for crayfish:

- **Temperature**: 20-28°C
- **pH**: 6.5-8.5
- **Dissolved Oxygen**: 5-12 mg/L
- **Electrical Conductivity**: 0.1-2.0 mS/cm

## Development

This project uses:
- TypeScript for type safety
- Tailwind CSS for styling
- Recharts for data visualization
- Mock data generation for demonstration purposes

To connect to actual IoT sensors, replace the mock data generator in `app/page.tsx` with API calls to your IoT backend.

## License

This project is part of a thesis design for Cebu Institute of Technology.

## Authors

- Elwison Denampo
- Keith Chadberc Niven Villanueva
- Carl Joseph Perez (Seph)

---

**Adviser**: Engr. Tampus  
**Institution**: Cebu Institute of Technology  
**Year**: 2025


