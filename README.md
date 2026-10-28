# CareMatrix OS — Clinical Operations Fabric

An enterprise hospital command surface bridging administrative capacity, clinical safety engines, multi-vital deterioration detection, and post-discharge follow-up.

---

## 🏥 Modules Overview

- **BedFlow (`/admin/bedflow`)**: Live ward capacity tracking, surge pressure scoring, and predictive admission what-if simulation.
- **LabLoop (`/clinical/labloop`)**: Closed-loop critical result notification with automated clinical escalation countdown timers and acknowledgement tracking.
- **MedMismatch (`/clinical/medmismatch`)**: Cross-document medication reconciliation identifying regimen discrepancies across EHR sources with side-by-side evidence inspection.
- **DoseGuard (`/clinical/doseguard`)**: Multi-prescriber duplicate active ingredient safety checks, cumulative toxicity tracking, and drug-drug interaction warnings.
- **SilentSignal (`/clinical/silentsignal`)**: Multi-parameter subtle vital sign deterioration trend detection alerting clinicians before overt decompensation.
- **ScanCompare (`/clinical/scancompare`)**: Side-by-side longitudinal radiology imaging and report difference analysis with anatomical landmark tracking.
- **FollowUpShield (`/patient/followupshield`)**: Patient-facing post-discharge care management, appointment timeline, and red-flag symptom escalation checklist.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 16 (App Router + Turbopack)](https://nextjs.org/)
- **UI Library**: [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Database / ORM**: PostgreSQL, [Drizzle ORM](https://orm.drizzle.team/) (with built-in resilient in-memory fallback for zero-config demonstration)
- **Language**: TypeScript

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (Node.js 20+ recommended)
- npm or yarn / pnpm

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-username>/carematrix-os.git
cd carematrix-os

# Install dependencies
npm install
```

### Local Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Building for Production

```bash
npm run build
npm run start
```

---

## 🌐 Deploy to Vercel

The easiest way to deploy CareMatrix OS is using the [Vercel Platform](https://vercel.com).

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Database Configuration (Optional)

The application includes an in-memory mock data layer so it runs out-of-the-box without requiring an external PostgreSQL instance.

To connect a real PostgreSQL database:
1. Set `DATABASE_URL` in your Vercel Project Settings or local `.env.local` file:
   ```env
   DATABASE_URL=postgres://username:password@hostname:5432/dbname
   ```
2. Push schema and seed initial data:
   ```bash
   npm run db:push # if configured in drizzle.config.json
   ```

---

## 📄 License

MIT
