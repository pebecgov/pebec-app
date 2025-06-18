# PEBEC Portal System

A comprehensive management platform for the Nigerian Presidential Enabling Business Environment Council (PEBEC). This system facilitates the tracking, monitoring, and reporting of DLI progress across all 37 Nigerian states and various government levels.

## 🎯 Overview

The PEBEC DLI Management System is designed to streamline the implementation and monitoring of business environment reforms across Nigeria. It provides role-based access for different stakeholders, from state-level reform champions to federal executives, ensuring comprehensive oversight of development initiatives.

## 🏛️ Supported Government Roles

### Federal Level
- **President** - Presidential DLI step-by-step analysis and oversight
- **Vice President** - Vice Presidential DLI monitoring and reporting
- **Admin** - System administration and comprehensive DLI management
- **World Bank** - International development partner access with detailed step analysis
- **Staff** - General administrative access
- **Federal** - Federal government coordination

### State Level
- **State Governor** - State-wide DLI oversight and progress monitoring
- **Reform Champion** - Direct DLI implementation and tracking
- **Saber Agent** - On-ground DLI execution and step completion
- **MDA (Ministries, Departments & Agencies)** - Internal reporting and compliance
- **Sub-National** - Regional coordination and monitoring

### Judicial & Law Enforcement
- **Deputies** - Law enforcement coordination
- **Magistrates** - Judicial system integration

## 🚀 Key Features

### DLI Management
- **Step-by-Step Tracking** - Detailed progress monitoring for each DLI phase
- **Real-time Status Updates** - Live progress tracking across all states
- **Completion Analytics** - Comprehensive statistics and completion rates
- **State-by-State Analysis** - Detailed breakdowns by Nigerian states

### Advanced Analytics
- **Presidential Dashboard** - High-level executive overview
- **World Bank Interface** - International partner reporting
- **Progress Visualization** - Charts, graphs, and progress indicators
- **Completion Rate Calculations** - Accurate nationwide progress metrics

### Reporting & Documentation
- **PDF Report Generation** - Automated report creation
- **Internal Reporting System** - MDA and departmental reports
- **Draft Management** - Save and resume report progress
- **Status Tracking** - Comprehensive status monitoring

### User Management
- **Role-Based Access Control** - Secure, permission-based system
- **Multi-State Support** - All 37 Nigerian states supported
- **Clerk Authentication** - Secure user authentication system
- **Safe User Operations** - Error-handled user management

## 🛠️ Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **UI Components**: Radix UI, Tailwind CSS, Material Tailwind
- **Backend**: Convex (Real-time database)
- **Authentication**: Clerk
- **Charts & Analytics**: Nivo, Recharts, Chart.js
- **PDF Generation**: jsPDF, html2canvas
- **Deployment**: Vercel

## 📦 Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd pebec-app
```

2. **Install dependencies**
```bash
npm install --legacy-peer-deps
```
*Note: The `--legacy-peer-deps` flag is required due to React 19 compatibility with some packages.*

3. **Set up environment variables**
```bash
cp .env.example .env.local
```
Configure your Convex and Clerk credentials in `.env.local`

4. **Set up Convex**
```bash
npx convex dev
```

5. **Start the development server**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to access the application.

## 🏗️ Project Structure

```
app/(site)/
├── admin/                 # Admin dashboard and DLI management
├── president/             # Presidential oversight interface
├── vice_president/        # Vice Presidential monitoring
├── world_bank/            # World Bank partner access
├── state_governor/        # State governor dashboard
├── reform_champion/       # Reform champion tools
├── saber_agent/          # SABER agent interface
├── mda/                  # MDA reporting system
└── sub_national/         # Regional coordination

components/
├── DLI/                  # DLI-specific components
├── ReformChampionDashboard/ # Dashboard components
└── ui/                   # Reusable UI components

convex/
├── dli.ts               # DLI management queries/mutations
├── users.ts             # User management
├── internal_reports.ts  # Reporting system
└── schema.ts           # Database schema
```

## 🎯 Key DLI Categories

1. **DLI 1**: State-Level Business Regulatory Impact Assessment
2. **DLI 2**: Ease of Registering Property 
3. **DLI 3**: Revenue Administration
4. **DLI 4**: Public Procurement Reforms
5. **DLI 5**: Institutional Delivery and Grievance Redress
6. **DLI 6**: Transparency in Trade Processes
7. **DLI 7**: Service Efficiency Improvements
8. **DLI 8**: Improved Public Access to Information

## 🌍 Nigerian States Coverage

The system supports all **37 Nigerian states**, including the Federal Capital Territory (FCT), providing comprehensive nationwide coverage for DLI implementation and monitoring.

## 🔧 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## 📊 Key Metrics Tracked

- **State Completion Rates** - Percentage of DLI completion per state
- **Step-by-Step Progress** - Detailed tracking of individual DLI phases
- **Reform Champion Performance** - Individual contributor metrics
- **Timeline Compliance** - Progress against scheduled milestones
- **Cross-State Comparisons** - Comparative analysis across states

## 🚀 Deployment

### Vercel (Recommended)
[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo/pebec-app)

### Netlify
[![Deploy with Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/your-repo/pebec-app)

## 📄 License

This project contains licensed components. Unauthorized use outside this project is prohibited and may result in legal action.

## 🤝 Contributing

This is a government system for PEBEC DLI management. Contributions are managed through official government channels and authorized development teams.

## 📞 Support

For technical support and system access, contact the PEBEC technical team through official government channels.

---

**Built for the Nigerian Presidential Enabling Business Environment Council (PEBEC)**  
*Advancing Nigeria's Business Environment Through Technology*
