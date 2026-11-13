# nomu (نمو)

A bilingual Arabic/English pediatric graduation project for children aged 0–3 years,
using React, Vite, JavaScript/JSX, and plain CSS. There are only two dashboards:
Mother and Doctor. There is no Admin dashboard.

## Run locally

Use Node.js 22.12+ or a supported newer LTS version and npm (previous setup
verified with Node.js 24).

```sh
npm install
npm run dev
npm run build
npm run lint
npm run preview
```

Open the URL printed by Vite (usually http://localhost:5173). Ctrl+C stops it.
On Windows PowerShell, use `npm.cmd` if the npm PowerShell wrapper is blocked.
Production output goes to `dist/`; preview serves that build locally.

## Folder structure

```text
src/
  assets/                       Existing images and SVGs (preserved)
  components/
    common/                     Shared UI such as buttons and cards
      .gitkeep
    mother/                     Student 1
      .gitkeep
    doctor/                     Student 2
      .gitkeep
    child-health/               Student 3; reusable in both dashboards
      GrowthChart.jsx
      VaccinationSchedule.jsx
      DevelopmentalMilestones.jsx
    ai/                         Student 4; frontend placeholders only
      AIChat.jsx
      AIHealthInsights.jsx
  pages/
    Home.jsx                    Existing home page, preserved
    auth/                       Student 4
      MotherLogin.jsx
      DoctorLogin.jsx
      MotherRegister.jsx
    mother/                     Student 1
      MotherDashboard.jsx
    doctor/                     Student 2
      DoctorDashboard.jsx
  layouts/
    MotherLayout.jsx
    DoctorLayout.jsx
  services/                     Future service modules; currently empty
    .gitkeep
  hooks/                        Future shared hooks
    .gitkeep
  contexts/                     Future shared React contexts
    .gitkeep
  locales/
    ar/                         Future Arabic translations
      .gitkeep
    en/                         Future English translations
      .gitkeep
  styles/
    App.css                     Existing component styles, unchanged
    index.css                   Existing global styles, unchanged
  App.jsx                       Route definitions
  main.jsx                      React entry point and global CSS import
```

Empty folders contain `.gitkeep` so they can be tracked when the team next uses
Git. Existing public assets and root configuration files are preserved.

## Team ownership

| Student | Owns | Features |
| --- | --- | --- |
| 1 | `src/pages/mother/`, `src/components/mother/` | Mother Dashboard |
| 2 | `src/pages/doctor/`, `src/components/doctor/` | Doctor Dashboard |
| 3 | `src/components/child-health/` | Growth charts, vaccinations, developmental milestones |
| 4 | `src/pages/auth/`, `src/components/ai/` | Mother/doctor authentication screens and AI frontend |

Work inside your assigned folders to reduce conflicts. Keep feature CSS beside
its component and use specific class names to avoid affecting other features.
Coordinate changes to shared component props before other students use them.

## Reusing child health components

These components are independent of either dashboard. From either
`src/pages/mother/MotherDashboard.jsx` or `src/pages/doctor/DoctorDashboard.jsx`,
use the same imports and render them inside the page when ready:

```jsx
import GrowthChart from '../../components/child-health/GrowthChart.jsx'
import VaccinationSchedule from '../../components/child-health/VaccinationSchedule.jsx'
import DevelopmentalMilestones from '../../components/child-health/DevelopmentalMilestones.jsx'

// Inside the dashboard's returned JSX:
// <GrowthChart />
// <VaccinationSchedule />
// <DevelopmentalMilestones />
```

The components currently show placeholder text. Agree on props for child data
later; keep role-specific navigation and behavior in the dashboard or layout.
The AI components also only show placeholder text and make no API requests.

## Routes and layouts

| URL | Page |
| --- | --- |
| `/` | Existing home page (`nomu 🌱`) |
| `/mother` | MotherDashboard inside MotherLayout |
| `/doctor` | DoctorDashboard inside DoctorLayout |
| `/mother/login` | MotherLogin |
| `/doctor/login` | DoctorLogin |
| `/mother/register` | MotherRegister |

`App.jsx` uses react-router-dom and BrowserRouter. Each dashboard layout provides
simple navigation and an Outlet for its page. Auth pages are standalone
placeholders. Routes are public for now; real authentication, backend, database,
and AI are not implemented. For production hosting, configure an SPA fallback to
`index.html` so direct links and refreshes on these routes work.

## Files requiring team coordination

Coordinate edits to `App.jsx` (routes), `main.jsx`, `layouts/`, `components/common/`,
`styles/`, `hooks/`, `contexts/`, `services/`, and `locales/`.
Also coordinate `package.json`, `package-lock.json`, `index.html`, Vite/lint
configuration, and this README. Only add a dependency once for the team.
Each student can develop feature files independently; agree on shared imports
and props before connecting features.

## Arabic and English

There is no translation system or language switcher yet. Locale folders are
prepared only. The existing document retains `lang="en" dir="ltr"` and its
bilingual title. Future Arabic mode should use `lang="ar" dir="rtl"`.
Existing CSS uses logical padding and `text-align: start` for direction support.

## Organization changes

- Extracted the existing App home markup into `src/pages/Home.jsx` without changing its output.
- Moved `src/App.css` and `src/index.css` into `src/styles/` and updated imports.
- Kept `App.jsx` focused on the six requested routes.
- Added five placeholder pages, five reusable feature placeholders, and two layouts.
- Added the requested empty folders with `.gitkeep` files.
- Added react-router-dom and updated this documentation.
- Preserved existing assets, configuration, and home styling. No Git operations are part of this work.

## Frontend Design System

All four students use the same shared foundation. This adds styling and reusable
controls only; existing pages and routes remain intact.

### Official color palette

| Purpose | Token | Color |
| --- | --- | --- |
| Primary Blue | `--color-primary` | `#4A90D9` |
| Secondary Pink / accent | `--color-accent` | `#E778A5` |
| Light Blue | `--color-light-blue` | `#E8F2FF` |
| Light Pink | `--color-light-pink` | `#FCE8F1` |
| Page Background | `--color-background` | `#F8FAFF` |
| White | `--color-white` | `#FFFFFF` |
| Main Text | `--color-text` | `#1E3355` |
| Muted Text | `--color-muted` | `#64748B` |
| Border | `--color-border` | `#E2E8F0` |

Blue is the main interactive color. Use pink sparingly for accents. Button labels
use a darker ink (`--color-button-text`, `#10223B`) for readability on pastel fills.
Avoid gradients and extra feature-specific color palettes.

### Fonts and direction

English uses **Inter**, Arabic uses **Cairo**. Both are loaded through Google Fonts
in `index.html`, with local fallback fonts if the network is unavailable.
Headings use 700, subheadings/labels/buttons 600, and body text 400.
Set the document to `<html lang="en" dir="ltr">` for English or
`<html lang="ar" dir="rtl">` for Arabic. Language selects the font; direction
controls layout. A mixed-language section can also set its own `lang` and `dir`.
No language switcher or translation system has been added.

### Shared CSS variables

`src/styles/variables.css` defines colors, font families and sizes, weights,
8px spacing tokens, radii, shadows, and transitions. `global.css` imports the
tokens, and `main.jsx` loads global styles after the preserved legacy `index.css`.
Do not import global styles again in each component. Component CSS imports its
own local stylesheet and uses variables already available throughout the app.

```css
.feature-panel {
  padding: var(--space-3); /* 24px */
  margin-block-end: var(--space-2); /* 16px */
  color: var(--color-text);
  background: var(--color-white);
  border-radius: var(--radius-card);
}
```

Spacing tokens `--space-1` through `--space-6` represent 8, 16, 24, 32, 40,
and 48px. `--space-8` is 64px. Controls use 10px corners; cards use 16px.
Optional utilities: `nomu-container` provides responsive page width/padding,
`nomu-stack` vertical spacing, `nomu-grid` responsive columns, `nomu-muted` muted
text, and `nomu-subheading` weight 600. Use logical properties such as
`padding-inline`, `margin-block`, and `text-align: start` for both directions.
Respect reduced-motion settings; transition tokens already handle them.

### Using Button, Card, and Input

From either dashboard or an auth page:

```jsx
import Button from '../../components/common/Button.jsx'
import Card from '../../components/common/Card.jsx'
import Input from '../../components/common/Input.jsx'

// Example markup to use inside your component's return:
<Card>
  <div className="nomu-stack">
    <h2>Account</h2>
    <Input label="Email" name="email" type="email" autoComplete="email" />
    <Button onClick={handleContinue}>Continue</Button>
    <Button variant="secondary" onClick={handleCancel}>Cancel</Button>
    <Button variant="accent" disabled>Coming soon</Button>
  </div>
</Card>
```

The handler names above are examples; define them in your feature before using
this markup. Shared components provide presentation, not application logic.

- **Button:** accepts `children`, `variant` (`primary`, `secondary`, `accent`),
  `className`, and standard button props such as `onClick` and `disabled`.
  Defaults to `type="button"` to avoid accidental form submission; explicitly
  use `type="submit"` in a form when needed. Unsupported variants fall back to primary.
- **Card:** accepts `children`, `className`, and standard div attributes. Provides
  white background, border, shadow, 16px corners, and 24px padding. Add your own
  heading inside it; it does not impose heading levels or feature content.
- **Input:** always provide a meaningful `label`. Accepts `id`, `type`,
  `className`, and standard input props including `name`, `required`, `disabled`,
  `value`, `onChange`, `autoComplete`, and ARIA attributes. Automatically connects
  the label with a unique generated ID when none is supplied. `className` applies
  to the input. For help text, give that text an ID and pass `aria-describedby`.
  Mark invalid values with `aria-invalid="true"` and provide a written explanation.
  This shared input is intended for text-like fields (text, email, password,
  number, date, etc.); coordinate separate checkbox/radio components when needed.

### Rules for all four developers

1. Reuse these components in Mother, Doctor, Child Health, Authentication, and AI
   features instead of copying their CSS or creating competing variants.
2. Use the shared tokens for colors, spacing, font sizes, radii, and shadows.
3. Keep pages calm and uncluttered: blue actions, occasional pink accents, white
   cards, and the shared page background. Do not add gradients or fake medical data.
4. Keep labels visible, preserve keyboard focus, use semantic headings, and test
   both document directions. Do not use placeholders as a replacement for labels.
5. Use responsive widths and grid utilities; avoid fixed widths that overflow
   small screens. Use feature-specific class names and keep CSS in your own folders.
6. Coordinate before changing shared files: `styles/variables.css`,
   `styles/global.css`, legacy `styles/index.css` / `styles/App.css`, all files in
   `components/common/`, `main.jsx`, `index.html`, `App.jsx`, and `layouts/`.
   Also coordinate dependency/configuration changes and updates to this guide.
   Agree on shared component prop changes so another student's imports keep working.
