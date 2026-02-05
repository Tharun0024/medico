# 🏥 Orchids Smart Hospital UI Suite

A comprehensive healthcare management dashboard built with **Next.js 15**, **React 19**, **Tailwind CSS 4**, and **Framer Motion**. This application provides role-based dashboards for managing hospital operations, patient care, medical waste disposal, and city-wide health analytics.

![Next.js](https://img.shields.io/badge/Next.js-15.5-black?logo=next.js)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38B2AC?logo=tailwind-css)

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Role-Based Dashboards](#role-based-dashboards)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [Component Library](#component-library)
- [Environment Setup](#environment-setup)
- [Deployment](#deployment)

---

## 🌟 Overview

Orchids Smart Hospital UI Suite is a modern healthcare management platform designed to streamline hospital operations across multiple stakeholder roles. The application features:

- **Role-based access control** with separate dashboards for different user types
- **Real-time analytics** and data visualization
- **Responsive design** optimized for desktop and mobile devices
- **Dark/Light mode** theming support
- **Animated UI components** using Framer Motion

---

## ✨ Features

### Core Features

- 🏛️ **Multi-tenant Architecture** - Supports government, hospital, medical staff, and waste management portals
- 📊 **Interactive Dashboards** - Real-time stats, charts, and data tables
- 🌙 **Theme Support** - Light and dark mode with system preference detection
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile devices
- ⚡ **Fast Performance** - Built with Next.js Turbopack for rapid development

### Healthcare-Specific Features

- 🛏️ **Bed Management** - Real-time bed availability and patient assignments
- 👨‍⚕️ **Patient Tracking** - Admission, discharge, and patient history
- 🗑️ **Waste Management** - Medical waste tracking and disposal scheduling
- 🚑 **Ambulance Fleet** - City-wide ambulance monitoring and dispatch
- 📈 **Health Analytics** - Outbreak prediction and regional health trends

---

## 🛠️ Tech Stack

### Frontend Framework

| Technology | Version | Purpose                         |
| ---------- | ------- | ------------------------------- |
| Next.js    | 15.5.7  | React framework with App Router |
| React      | 19.0.0  | UI library                      |
| TypeScript | 5.x     | Type safety                     |

### Styling & UI

| Technology    | Version | Purpose                         |
| ------------- | ------- | ------------------------------- |
| Tailwind CSS  | 4.x     | Utility-first CSS framework     |
| Framer Motion | 12.x    | Animation library               |
| Radix UI      | Various | Accessible component primitives |
| Lucide React  | 0.552   | Icon library                    |
| shadcn/ui     | Latest  | Pre-built UI components         |

### Data & Charts

| Technology      | Version | Purpose                 |
| --------------- | ------- | ----------------------- |
| Recharts        | 3.0.2   | Chart library           |
| TanStack Query  | 5.75    | Data fetching & caching |
| Zod             | 4.1     | Schema validation       |
| React Hook Form | 7.60    | Form management         |

### Database & Auth

| Technology  | Version | Purpose                    |
| ----------- | ------- | -------------------------- |
| Drizzle ORM | 0.44    | Database ORM               |
| Better Auth | 1.3.10  | Authentication             |
| libSQL      | 0.15    | SQLite-compatible database |

### Additional Libraries

- **Three.js** - 3D graphics and globe visualization
- **Embla Carousel** - Touch-friendly carousels
- **Sonner** - Toast notifications
- **date-fns** - Date manipulation

---

## 📁 Project Structure

```
frontend/
├── public/                    # Static assets
├── src/
│   ├── app/                   # Next.js App Router pages
│   │   ├── page.tsx           # Landing page (role selection)
│   │   ├── layout.tsx         # Root layout
│   │   ├── globals.css        # Global styles
│   │   ├── login/             # Authentication pages
│   │   │
│   │   ├── super-admin/       # Government Portal
│   │   │   ├── page.tsx       # Main dashboard
│   │   │   ├── hospitals/     # Hospital network management
│   │   │   ├── outbreaks/     # Outbreak monitoring
│   │   │   ├── ambulances/    # Fleet management
│   │   │   ├── analytics/     # Regional analytics
│   │   │   └── settings/      # System settings
│   │   │
│   │   ├── hospital-admin/    # Hospital Admin Portal
│   │   │   ├── page.tsx       # Main dashboard
│   │   │   ├── beds/          # Bed management
│   │   │   ├── patients/      # Patient records
│   │   │   ├── waste/         # Waste tracking
│   │   │   ├── notifications/ # Alert center
│   │   │   └── settings/      # Hospital settings
│   │   │
│   │   ├── medical-staff/     # Clinical Staff Portal
│   │   │   ├── page.tsx       # Main dashboard
│   │   │   ├── add-patient/   # Quick patient admission
│   │   │   ├── patients/      # Patient management
│   │   │   ├── beds/          # Bed assignments
│   │   │   └── waste/         # Waste reporting
│   │   │
│   │   └── waste-management/  # Waste Management Portal
│   │       ├── page.tsx       # Main dashboard
│   │       ├── requests/      # Pickup requests
│   │       ├── history/       # Collection history
│   │       └── payments/      # Payment tracking
│   │
│   ├── components/
│   │   ├── ui/                # Reusable UI components (53+ components)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   └── ...
│   │   ├── dashboard/         # Dashboard-specific components
│   │   │   ├── app-sidebar.tsx
│   │   │   ├── dashboard-layout.tsx
│   │   │   ├── stats-card.tsx
│   │   │   ├── bed-grid.tsx
│   │   │   ├── hospital-map.tsx
│   │   │   └── data-table.tsx
│   │   └── theme-provider.tsx
│   │
│   ├── hooks/                 # Custom React hooks
│   │   └── use-mobile.ts
│   │
│   └── lib/                   # Utilities and data
│       ├── utils.ts           # Helper functions
│       └── mock-data.ts       # Sample data
│
├── components.json            # shadcn/ui configuration
├── next.config.ts             # Next.js configuration
├── tailwind.config.ts         # Tailwind configuration
├── tsconfig.json              # TypeScript configuration
└── package.json               # Dependencies
```

---

## 👥 Role-Based Dashboards

### 1. 🏛️ Super Admin (Government Portal)

**Route:** `/super-admin`

The government-level dashboard for city-wide health management:

| Feature                 | Description                                |
| ----------------------- | ------------------------------------------ |
| **Regional Overview**   | City-wide health statistics and trends     |
| **Hospital Network**    | Monitor all hospitals in the region        |
| **Outbreak Monitoring** | Disease outbreak tracking and predictions  |
| **Ambulance Fleet**     | Real-time ambulance location and dispatch  |
| **Analytics**           | Comprehensive health analytics and reports |
| **Settings**            | System-wide configuration                  |

### 2. 🏥 Hospital Admin

**Route:** `/hospital-admin`

Hospital management dashboard for administrators:

| Feature              | Description                         |
| -------------------- | ----------------------------------- |
| **Bed Management**   | Real-time bed availability by ward  |
| **Patient Tracking** | Active patients and admission stats |
| **Waste Analytics**  | Medical waste generation metrics    |
| **Notifications**    | AI-powered alerts and notifications |
| **Settings**         | Hospital configuration              |

### 3. 👨‍⚕️ Medical Staff

**Route:** `/medical-staff`

Clinical portal for doctors and nurses:

| Feature               | Description                       |
| --------------------- | --------------------------------- |
| **Quick Patient Add** | Fast patient admission form       |
| **Patient List**      | View and manage assigned patients |
| **Bed Assignment**    | Assign/reassign patient beds      |
| **Waste Report**      | Log medical waste for pickup      |

### 4. 🚛 Waste Management

**Route:** `/waste-management`

Operations dashboard for waste disposal teams:

| Feature                | Description                    |
| ---------------------- | ------------------------------ |
| **Pickup Requests**    | Incoming collection requests   |
| **Collection History** | Past pickups and records       |
| **Payments**           | Payment tracking and invoicing |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 20.0.0
- **npm**, **yarn**, **pnpm**, or **bun**

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Sanjay-2927/orchids-smart-hospital-ui-suite.git
   cd orchids-smart-hospital-ui-suite
   ```

2. **Install dependencies**

   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Run the development server**

   ```bash
   npm run dev
   ```

4. **Open in browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

---

## 📜 Available Scripts

| Command         | Description                             |
| --------------- | --------------------------------------- |
| `npm run dev`   | Start development server with Turbopack |
| `npm run build` | Build for production                    |
| `npm run start` | Start production server                 |
| `npm run lint`  | Run ESLint                              |

---

## 🧩 Component Library

The project includes **53+ reusable UI components** built with Radix UI primitives and styled with Tailwind CSS:

### Form Components

- `Button`, `Input`, `Textarea`, `Select`
- `Checkbox`, `Radio Group`, `Switch`, `Slider`
- `Calendar`, `Date Picker`, `OTP Input`
- `Form` (with React Hook Form integration)

### Layout Components

- `Card`, `Dialog`, `Sheet`, `Drawer`
- `Accordion`, `Collapsible`, `Tabs`
- `Sidebar`, `Navigation Menu`, `Breadcrumb`
- `Scroll Area`, `Resizable Panels`

### Data Display

- `Table`, `Data Table`, `Badge`
- `Avatar`, `Tooltip`, `Hover Card`
- `Progress`, `Skeleton`, `Spinner`
- `Alert`, `Toast (Sonner)`

### Dashboard Components

- `StatsCard` - Animated statistics display
- `DashboardLayout` - Consistent page layout
- `DashboardGrid` - Responsive grid system
- `BedGrid` - Hospital bed visualization
- `HospitalMap` - Geographic visualization
- `DataTable` - Advanced data tables

---

## ⚙️ Environment Setup

Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL=your_database_url

# Authentication
BETTER_AUTH_SECRET=your_secret_key

# API Keys (if needed)
NEXT_PUBLIC_API_URL=your_api_url
```

---

## 🌐 Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Configure environment variables
4. Deploy

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Other Platforms

The app can be deployed to any platform supporting Node.js:

- AWS (EC2, ECS, Lambda)
- Google Cloud Platform
- Azure App Service
- Railway, Render, Fly.io

---

## 📄 License

This project is proprietary software. All rights reserved.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📞 Support

For support and inquiries, please contact the development team.

---

<div align="center">
  <p>Built with ❤️ using Next.js and React</p>
  <p>© 2024-2026 Orchids Smart Hospital UI Suite</p>
</div>
