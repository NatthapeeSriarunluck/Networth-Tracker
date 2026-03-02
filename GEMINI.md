# Net Worth Tracker Architecture

## Overview
A high-performance financial intelligence platform for tracking net worth, asset allocation, and historical growth trajectories. Built with a modern Turborepo monorepo architecture.

## Tech Stack
- **Monorepo Management**: [Turborepo](https://turbo.build/) (v2.8+) with Terminal UI enabled.
- **Backend API**: [FastAPI](https://fastapi.tiangolo.com/) (Python 3.12+) serving as the data orchestration layer.
- **Frontend**: [Next.js](https://nextjs.org/) (v16+) with [Shadcn UI](https://ui.shadcn.com/) and [Tailwind CSS](https://tailwindcss.com/) (v4 engine).
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL) for secure financial data storage.
- **Visualizations**: [Recharts](https://recharts.org/) for interactive growth curves and allocation pie charts.

## Key Features
- **Real-time FX Rates**: Automated USD/THB rate fetching via `yfinance`.
- **Growth Trajectory**: Interactive area charts showing historical net worth evolution.
- **Asset Allocation**: Dynamic pie charts with sector labeling and trending data.
- **Manual Data Entry**: Secure "Record Position" dialog built with Shadcn UI components.
- **Financial Ledger**: Detailed historical table with period-over-period delta tracking.

## Development Workflow
- **Run All**: `npm run dev` (starts both API and Web in Turborepo TUI).
- **Run API Only**: `npm run api:dev`.
- **Run Web Only**: `npm run web:dev`.
- **UI Components**: Shadcn UI components are located in `apps/web/src/components/ui`. Add new ones using `npx shadcn@latest add [component]`.

## Configuration
- **Supabase**: Requires `SUPABASE_URL` and `SUPABASE_KEY` in `apps/api/.env`.
- **Tailwind**: Utilizes the modern CSS-first configuration (`globals.css`) for theming and variable management.
- **Turborepo**: Configured in `turbo.json` for interactive tasks and persistent dev servers.
