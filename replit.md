# Lotto 6/45 - South Korean Lottery App

## Overview

A South Korean Lotto 6/45 lottery application that provides number generation, winning number statistics, and historical draw data analysis. The app features multi-language support (Korean, English, Chinese, Japanese), dark/light theme switching, and comprehensive lottery statistics visualization.

The application allows users to:
- Generate random lottery numbers with optional manual number selection
- View latest winning numbers and historical draw data
- Analyze number frequency statistics, hot/cold numbers, and common pairs
- Filter statistics by year and month

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript, using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Charts**: Recharts for statistical data visualization

The frontend follows a page-based structure with shared components:
- Pages: Dashboard, Generate, Statistics, History
- Custom components: LottoBall, NumberPicker, LanguageSelector, ThemeToggle
- Full internationalization with 4 languages via context-based i18n system

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **API Pattern**: REST API endpoints under `/api/lotto/*`
- **Data Storage**: Static JSON file (`lotto-history.json`) containing historical draw data
- **Build**: esbuild for production server bundling

Key API endpoints:
- `/api/lotto/latest` - Most recent winning numbers
- `/api/lotto/statistics` - Number frequency analysis
- `/api/lotto/history` - Paginated historical draws
- `/api/lotto/generate` - Number generation with optional user selections

### Data Layer
- **Schema Validation**: Zod for runtime type validation
- **Database Config**: Drizzle ORM configured for PostgreSQL (schema defined but storage currently uses in-memory/JSON)
- **Shared Types**: TypeScript types shared between client and server via `@shared` path alias

### Development Setup
- Hot module replacement via Vite dev server
- Express serves Vite middleware in development
- Static file serving from `dist/public` in production

## External Dependencies

### Database
- PostgreSQL configured via Drizzle ORM (DATABASE_URL environment variable)
- Current implementation uses static JSON file for lottery data
- User storage implemented as in-memory Map (can be migrated to PostgreSQL)

### Third-Party Libraries
- **Radix UI**: Accessible component primitives (dialogs, dropdowns, tooltips, etc.)
- **Recharts**: Chart library for statistics visualization
- **date-fns**: Date formatting and manipulation
- **Embla Carousel**: Carousel component support

### Fonts
- Google Fonts: Noto Sans KR (Korean), Noto Sans SC (Chinese), Noto Sans JP (Japanese), Inter (Western/Numbers)

### Build Tools
- Vite with React plugin for frontend
- esbuild for server bundling
- TypeScript for type checking across the monorepo