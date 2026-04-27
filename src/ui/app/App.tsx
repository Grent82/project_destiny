import { Navigate, NavLink, Route, Routes } from 'react-router-dom'

import './App.css'
import { CombatScreen } from '../screens/CombatScreen'
import { DashboardScreen } from '../screens/DashboardScreen'
import { DistrictsScreen } from '../screens/DistrictsScreen'
import { EventLogScreen } from '../screens/EventLogScreen'
import { FactionsScreen } from '../screens/FactionsScreen'
import { MissionPrepScreen } from '../screens/MissionPrepScreen'
import { RosterScreen } from '../screens/RosterScreen'
import { ShopsScreen } from '../screens/ShopsScreen'
import { screenCatalog } from '../screens/screenCatalog'

function ScreenPlaceholder(props: { title: string; summary: string }) {
  const { summary, title } = props

  return (
    <section className="screen-panel">
      <p className="eyebrow">Project Destiny</p>
      <h1>{title}</h1>
      <p className="summary">{summary}</p>
      <div className="placeholder-grid">
        <article>
          <h2>Purpose</h2>
          <p>This screen exists to lock the feature boundary and future UI route.</p>
        </article>
        <article>
          <h2>Next step</h2>
          <p>Attach application selectors and use cases without moving business rules into the UI layer.</p>
        </article>
      </div>
    </section>
  )
}

export function App() {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">Project Destiny</p>
          <h2 className="brand">Operations Shell</h2>
          <p className="sidebar-copy">
            Route-level placeholders for the first browser-game feature areas.
          </p>
        </div>

        <nav aria-label="Primary" className="nav-list">
          {screenCatalog.map((screen) => (
            <NavLink
              key={screen.path}
              className={({ isActive }) =>
                isActive ? 'nav-link nav-link-active' : 'nav-link'
              }
              to={screen.path}
            >
              {screen.title}
            </NavLink>
          ))}
        </nav>
      </aside>

      <main className="content">
        <Routes>
          <Route path="/" element={<Navigate replace to="/dashboard" />} />
          <Route path="/dashboard" element={<DashboardScreen />} />
          <Route path="/roster" element={<RosterScreen />} />
          <Route path="/districts" element={<DistrictsScreen />} />
          <Route path="/factions" element={<FactionsScreen />} />
          <Route path="/missions" element={<MissionPrepScreen />} />
          <Route path="/shops" element={<ShopsScreen />} />
          <Route path="/combat" element={<CombatScreen />} />
          <Route path="/event-log" element={<EventLogScreen />} />
          {screenCatalog
            .filter(
              (screen) =>
                ![
                  '/dashboard',
                  '/roster',
                  '/districts',
                  '/factions',
                  '/missions',
                  '/shops',
                  '/combat',
                  '/event-log',
                ].includes(
                  screen.path,
                ),
            )
            .map((screen) => (
              <Route
                key={screen.path}
                path={screen.path}
                element={<ScreenPlaceholder {...screen} />}
              />
            ))}
        </Routes>
      </main>
    </div>
  )
}
