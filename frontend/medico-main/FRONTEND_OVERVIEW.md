# MEDICO Frontend - Complete System Overview

## What the Frontend Provides

MEDICO Frontend is a **Next.js-based Hospital Management Dashboard Suite** that provides role-based interfaces for:

1. **Super Admin Portal** - City-wide health analytics, outbreak monitoring, hospital network management
2. **Hospital Admin Dashboard** - Ward capacity management, waste prediction, resource planning
3. **Medical Staff Interface** - Patient management, bed assignment, treatment tracking, waste reporting
4. **Waste Management Team Portal** - Pickup requests, collection tracking, disposal management
5. **Emergency Service Control** - ICU availability, hospital suggestions, emergency metrics
6. **Real-time Notifications** - WebSocket-powered alerts across all roles

---

## Tech Stack

| Layer             | Technology                  | Purpose                                    |
| ----------------- | --------------------------- | ------------------------------------------ |
| **Framework**     | Next.js 15+                 | React-based SSR/SSG with App Router        |
| **Language**      | TypeScript                  | Type-safe development                      |
| **Styling**       | Tailwind CSS                | Utility-first CSS framework                |
| **UI Components** | Radix UI + Shadcn/ui        | Accessible, unstyled component library     |
| **Forms**         | React Hook Form + Zod       | Form validation and state management       |
| **Animation**     | Framer Motion               | Smooth page transitions and animations     |
| **Charts**        | Recharts                    | Data visualization (bar, line, pie charts) |
| **Tables**        | TanStack React Table        | Complex data table with sorting/filtering  |
| **Icons**         | Lucide React, Heroicons     | SVG icon library                           |
| **Database**      | LibSQL (Turso)              | Lightweight SQL database client            |
| **Notifications** | Sonner                      | Toast notifications                        |
| **Theme**         | Custom Provider             | Light/Dark mode support                    |
| **State**         | Mock Data + API Integration | Frontend state with backend API calls      |

---

## Project Structure

```
frontend/
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── layout.tsx                 # Root layout with theme provider
│   │   ├── page.tsx                   # Landing/home page with role cards
│   │   ├── globals.css                # Global styles
│   │   ├── hospital-admin/
│   │   │   └── page.tsx               # Hospital Admin Dashboard
│   │   ├── super-admin/
│   │   │   └── page.tsx               # Super Admin Dashboard
│   │   ├── medical-staff/
│   │   │   └── page.tsx               # Medical Staff Dashboard
│   │   ├── waste-management/
│   │   │   └── page.tsx               # Waste Management Dashboard
│   │   └── global-error.tsx           # Global error boundary
│   │
│   ├── components/                    # Reusable React components
│   │   ├── dashboard/                 # Dashboard-specific components
│   │   │   ├── app-sidebar.tsx        # Navigation sidebar
│   │   │   ├── dashboard-layout.tsx   # Layout wrapper for dashboards
│   │   │   ├── top-navbar.tsx         # Header navigation bar
│   │   │   ├── stats-card.tsx         # KPI stats card component
│   │   │   ├── bed-grid.tsx           # Bed capacity visualization
│   │   │   ├── hospital-map.tsx       # Map view of hospitals
│   │   │   ├── data-table.tsx         # Reusable data table
│   │   │   └── index.ts               # Barrel export
│   │   │
│   │   ├── ui/                        # Shadcn/ui components library
│   │   │   ├── button.tsx             # Button with variants
│   │   │   ├── card.tsx               # Card container
│   │   │   ├── dialog.tsx             # Modal dialog
│   │   │   ├── form.tsx               # Form wrapper (React Hook Form)
│   │   │   ├── input.tsx              # Text input
│   │   │   ├── select.tsx             # Select dropdown
│   │   │   ├── table.tsx              # Table component
│   │   │   ├── tabs.tsx               # Tabbed interface
│   │   │   ├── chart.tsx              # Chart wrapper
│   │   │   ├── accordion.tsx          # Accordion component
│   │   │   ├── badge.tsx              # Status badge
│   │   │   ├── alert.tsx              # Alert box
│   │   │   ├── skeleton.tsx           # Loading skeleton
│   │   │   ├── spinner.tsx            # Loading spinner
│   │   │   ├── toast/sonner.tsx       # Toast notifications
│   │   │   └── ... (40+ additional UI components)
│   │   │
│   │   ├── theme-provider.tsx         # Dark/light mode provider
│   │   └── ErrorReporter.tsx          # Global error tracking
│   │
│   ├── hooks/                         # Custom React hooks
│   │   └── use-mobile.ts              # Mobile breakpoint detection
│   │
│   ├── lib/                           # Utilities and helpers
│   │   ├── mock-data.ts               # TypeScript interfaces & sample data
│   │   ├── utils.ts                   # Helper functions (cn, formatting, etc.)
│   │   └── hooks/                     # Additional custom hooks
│   │
│   └── visual-edits/                  # Visual editing integration
│       ├── VisualEditsMessenger.tsx   # Visual editor communication
│       └── component-tagger-loader.js # Component tagging for visual editor
│
├── public/                            # Static assets
├── package.json                       # Dependencies & scripts
├── tsconfig.json                      # TypeScript configuration
├── next.config.ts                     # Next.js configuration
├── tailwind.config.ts                 # Tailwind CSS configuration
├── postcss.config.mjs                 # PostCSS configuration
└── components.json                    # Shadcn/ui configuration
```

---

## Role-Based Dashboard Structure

### 1. **Super Admin Dashboard** (`/super-admin`)

**Scope:** District-wide hospital oversight

**Key Features:**

- **Regional Overview**: Summary of all hospitals, total bed capacity, occupancy rates
- **Disease Trends Chart**: Monthly admission patterns for dengue, COVID, malaria, typhoid
- **Outbreak Risk Assessment**: Risk levels (LOW/MODERATE/HIGH) based on disease patterns
- **Hospital Network Map**: Geolocation-based hospital visualization
- **Bed Availability Summary**: ICU, HDU, General ward capacity across district
- **Broadcast Notices**: Send alerts/notices to all hospital admins
- **Analytics Dashboard**: Admit/discharge trends, emergency response metrics

**Components Used:**

- `DashboardLayout` - Main layout wrapper
- `StatsCard` - KPI cards (Total Hospitals, Total Beds, etc.)
- `HospitalMap` - Interactive map visualization
- `DataTable` - Hospital list with sorting/filtering
- Charts (Recharts) - Disease trends, admission patterns

---

### 2. **Hospital Admin Dashboard** (`/hospital-admin`)

**Scope:** Single hospital management

**Key Features:**

- **Ward Management**: View/edit ICU, HDU, General ward capacities
- **Bed Status Grid**: Visual representation of bed occupancy
- **Waste Prediction**: ML-predicted waste generation based on patient count
- **Pickup Requests**: Create and track waste collection requests
- **Patient Summary**: Admitted patients, treatment types, status
- **Alerts & Notifications**: Real-time alerts for emergencies, waste issues
- **Resource Planning**: Identify bottlenecks, capacity constraints

**Components Used:**

- `BedGrid` - Interactive bed status visualization
- `StatsCard` - Ward capacity KPIs
- `DataTable` - Patients, waste requests
- Charts - Waste prediction trends
- Forms - Ward capacity editing

---

### 3. **Medical Staff Dashboard** (`/medical-staff`)

**Scope:** Ward-level operations within a hospital

**Key Features:**

- **Patient Management**:
  - Admit new patients
  - Assign beds to patients
  - Update treatment types
  - Transfer between wards
  - Discharge patients
- **Ward Status**: Real-time bed availability
- **Waste Reporting**: Log daily waste generation by ward
- **Treatment Tracking**: Patient vital signs, treatment progress
- **Quick Actions**: Bed assignment, discharge confirmation
- **Work Queue**: Pending admission/discharge/transfer requests

**Components Used:**

- Forms for patient admit/transfer/discharge
- `DataTable` - Patient list with inline actions
- Modal dialogs for confirmations
- Real-time notifications for pending actions

---

### 4. **Waste Management Dashboard** (`/waste-management`)

**Scope:** District-wide waste lifecycle management

**Key Features:**

- **Pickup Requests View**: Filter by status (pending, collected, disposed)
- **Collection Workflow**: Mark waste as collected with actual kg recorded
- **Disposal Tracking**: Verify disposal and record final weight (±20% tolerance)
- **Payment Management**: Record payment completion
- **Audit Trail**: Immutable disposal logs for compliance
- **Hospital-wise Analytics**: Waste generation patterns
- **Budget Tracking**: Cost per hospital, total disposal costs

**Components Used:**

- `DataTable` - Request list with status filtering
- Modal forms - Collection/disposal/payment recording
- Charts - Waste trends over time
- Status badges - Request state visualization

---

## Core Components

### Dashboard-Specific Components

| Component           | Purpose                                            | Props                             |
| ------------------- | -------------------------------------------------- | --------------------------------- |
| **DashboardLayout** | Page layout with sidebar, header, content area     | `children`, `title`               |
| **AppSidebar**      | Navigation sidebar with role-based menu            | `role`                            |
| **TopNavbar**       | Header with notifications, user menu, theme toggle | `userName`, `role`                |
| **StatsCard**       | KPI card with icon, value, trend                   | `title`, `value`, `trend`, `icon` |
| **BedGrid**         | 2D grid visualization of bed status                | `beds`, `onBedClick`              |
| **HospitalMap**     | Geolocation-based hospital markers                 | `hospitals`, `onHospitalClick`    |
| **DataTable**       | Sortable, filterable data table                    | `columns`, `data`, `onRowClick`   |

### UI Component Library (40+ Components)

**Forms & Input:**

- `Form` - React Hook Form wrapper
- `Input` - Text input with validation
- `Select` - Dropdown selector
- `Checkbox`, `Radio`, `Toggle` - Selection controls
- `Textarea` - Multi-line text
- `Field` - Label + input wrapper

**Display:**

- `Card` - Container component
- `Badge` - Status/tag display
- `Alert` - Alert messages
- `Dialog` - Modal dialog
- `Sheet` - Side drawer
- `Tabs` - Tabbed interface
- `Accordion` - Expandable sections

**Data:**

- `Table` - Data grid
- `Pagination` - Page navigation
- `Chart` - Recharts wrapper

**Feedback:**

- `Spinner` - Loading indicator
- `Skeleton` - Loading placeholder
- `Sonner Toast` - Notifications

---

## Data Types & Interfaces

### Core Interfaces (from `lib/mock-data.ts`)

```typescript
// Hospital Management
interface Hospital {
  id: string;
  name: string;
  location: string;
  totalBeds: number;
  availableBeds: number;
  occupiedBeds: number;
  status: "active" | "inactive" | "maintenance";
  lat: number;
  lng: number;
  contactNumber: string;
  emergencyCapacity: number;
}

// Patient Lifecycle
interface Patient {
  id: string;
  name: string;
  age: number;
  gender: "male" | "female" | "other";
  condition: string;
  severity: "critical" | "serious" | "stable" | "minor";
  bedNumber: string;
  admissionTime: string;
  treatmentType: string;
  doctor: string;
  status: "admitted" | "discharged" | "transferred";
}

// Bed Tracking
interface Bed {
  id: string;
  number: string;
  ward: string;
  floor: number;
  status: "available" | "occupied" | "cleaning" | "reserved";
  patientId?: string;
  type: "general" | "icu" | "emergency" | "pediatric" | "maternity";
}

// Emergency Services
interface Ambulance {
  id: string;
  vehicleNumber: string;
  status: "available" | "dispatched" | "returning" | "maintenance";
  location: string;
  driver: string;
  lastUpdated: string;
}

// Waste Management
interface WastePickupRequest {
  id: string;
  hospitalId: string;
  hospitalName: string;
  wasteType: "infectious" | "hazardous" | "radioactive" | "general";
  quantity: number;
  unit: "kg" | "liters";
  status: "pending" | "collected" | "disposed";
  requestedAt: string;
  collectedAt?: string;
  disposedAt?: string;
  paymentStatus: "pending" | "completed";
  amount: number;
}

// Analytics
interface DiseaseData {
  month: string;
  dengue: number;
  covid: number;
  malaria: number;
  typhoid: number;
}

interface WasteAnalytics {
  date: string;
  actual: number;
  predicted: number;
}

// Notifications
interface Notification {
  id: string;
  title: string;
  message: string;
  severity: "critical" | "warning" | "info" | "success";
  read: boolean;
  timestamp: string;
  actionUrl?: string;
}
```

---

## Key Features

### 1. **Role-Based Access Control**

- Landing page (`page.tsx`) presents role selection cards
- Each role navigates to dedicated dashboard with specific features
- Sidebar navigation updates based on selected role
- Mock data simulates role-specific data filtering

### 2. **Real-Time Notifications**

- Sonner toast library for immediate user feedback
- Notification center in top navbar
- WebSocket integration ready (backend provides `/ws` endpoint)
- Severity levels: `critical`, `warning`, `info`, `success`

### 3. **Dark/Light Mode**

- `ThemeProvider` component wraps entire app
- Tailwind CSS dark mode classes (`dark:`)
- Theme toggle in top navbar
- Persisted to localStorage as `hospital-theme`

### 4. **Interactive Data Tables**

- TanStack React Table for advanced sorting/filtering
- Inline actions (edit, delete, view details)
- Pagination and row selection
- Responsive design with horizontal scroll on mobile

### 5. **Form Handling**

- React Hook Form for form state management
- Zod for schema validation
- Custom error messages per field
- Async validation ready (backend integration)

### 6. **Data Visualization**

- Recharts for charts (bar, line, pie, area)
- Hospital map with Leaflet (geolocation)
- Custom bed grid component for ICU/HDU visualization
- Stats cards with trend indicators

### 7. **Mobile Responsive Design**

- Tailwind CSS responsive utilities
- Custom `use-mobile` hook for breakpoint detection
- Collapsible sidebar on mobile
- Touch-friendly interactions

---

## Development Workflow

### Starting the Development Server

```bash
npm run dev
# Starts Next.js dev server with Turbopack
# Access at http://localhost:3000
```

### Building for Production

```bash
npm run build
npm start
```

### Linting Code

```bash
npm run lint
```

---

## Integration Points

### Backend API Integration

Currently using **mock data** (`lib/mock-data.ts`), but ready for API integration:

1. Replace mock data imports with API calls
2. Update hooks to fetch from backend endpoints:
   - `GET /api/hospitals/*` - Hospital data
   - `GET /api/beds/*` - Bed management
   - `GET /api/patients/*` - Patient data
   - `GET /api/waste/*` - Waste requests
   - `GET /api/emergencies/*` - Emergency data
   - `POST /api/notifications/subscribe` - WebSocket connection

3. Use React Query or SWR for data fetching and caching

### WebSocket Connection

Backend provides real-time updates via WebSocket. Frontend needs:

```typescript
// Connect to WebSocket
const ws = new WebSocket(
  "ws://localhost:8000/ws?role=hospital_admin&hospital_id=1",
);

// Listen for events
ws.onmessage = (event) => {
  const { type, data } = JSON.parse(event.data);
  // Handle: emergency.created, bed.occupied, notification.new, etc.
};
```

---

## Configuration Files

| File                 | Purpose                                           |
| -------------------- | ------------------------------------------------- |
| `tsconfig.json`      | TypeScript configuration with path aliases (`@/`) |
| `next.config.ts`     | Next.js settings (API routes, redirects, etc.)    |
| `tailwind.config.ts` | Tailwind CSS customization (colors, breakpoints)  |
| `postcss.config.mjs` | CSS processing pipeline                           |
| `components.json`    | Shadcn/ui CLI configuration                       |

---

## Next Steps for Development

1. **API Integration**: Replace mock data with real backend calls
2. **WebSocket Real-Time**: Implement live notification updates
3. **Form Submissions**: Connect forms to backend endpoints
4. **User Authentication**: Add login/logout (JWT or session-based)
5. **Error Handling**: Global error boundary with retry logic
6. **Loading States**: Skeleton screens during data fetch
7. **Offline Support**: Service workers and cache strategy
8. **Performance**: Image optimization, code splitting, lazy loading

---

## Deployment

The frontend is optimized for deployment to:

- **Vercel** (seamless Next.js deployment)
- **Netlify** (with build configuration)
- **Docker** (containerized deployment)
- **Traditional hosting** (Node.js + nginx)

### Environment Variables Required

```env
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000
# WebSocket URL
NEXT_PUBLIC_WS_URL=ws://localhost:8000
# Analytics (optional)
NEXT_PUBLIC_ORCHIDS_PROJECT_ID=a836e496-ccc0-4733-ad14-4ed50699c534
```

---

## Browser Logging & Monitoring

Integrated with Orchids monitoring:

- Script: `orchids-browser-logs.js` (project ID: `a836e496-ccc0-4733-ad14-4ed50699c534`)
- Route tracking enabled for navigation monitoring
- Error reporting via `ErrorReporter` component
