import { useState } from 'react'
import { Link } from 'react-router-dom'

import { gameActions, selectEventPresentation, selectLastResolvedEventSummary, selectMorningReportItems } from '../../application'
import { useAppDispatch, useAppSelector } from '../app/hooks'

const SECTION_ORDER = ['Your house', 'Your contracts', 'The city'] as const

export function MorningReport() {
  const dispatch = useAppDispatch()
  const items = useAppSelector(selectMorningReportItems)
  const decisionEvent = useAppSelector(selectEventPresentation)
  const lastResolvedEventSummary = useAppSelector(selectLastResolvedEventSummary)
  const [expandedIds, setExpandedIds] = useState<string[]>([])

  if (items.length === 0 || decisionEvent || lastResolvedEventSummary) return null

  const sections = SECTION_ORDER.map((section) => ({
    section,
    items: items.filter((item) => item.section === section),
  })).filter((entry) => entry.items.length > 0)

  return (
    <div className="event-report-overlay">
      <div className="event-report-panel">
        <p className="event-report-eyebrow">Morning Report</p>
        <h2 className="event-report-title">Marion's ledger for the turn</h2>
        <p className="event-report-summary">
          Routine matters are gathered here. Read what changed, open a line if you need detail, then step into the day.
        </p>

        <div className="event-report-sections">
          {sections.map(({ section, items: sectionItems }) => (
            <section key={section} className="event-report-section">
              <h3 className="event-report-section-title">{section}</h3>
              <ul className="event-report-list">
                {sectionItems.map((item) => {
                  const isExpanded = expandedIds.includes(item.eventId)
                  const anchor = item.actorName ?? item.districtName ?? item.kicker
                  return (
                    <li key={item.eventId} className="event-report-item">
                      <button
                        type="button"
                        className="event-report-item-toggle"
                        onClick={() =>
                          setExpandedIds((current) =>
                            isExpanded
                              ? current.filter((entry) => entry !== item.eventId)
                              : [...current, item.eventId],
                          )
                        }
                      >
                        <span className="event-report-item-headline">{item.title}</span>
                        <span className="event-report-item-anchor">{anchor}</span>
                        <span className="event-report-item-expander">{isExpanded ? 'Hide' : 'Details'}</span>
                      </button>
                      {isExpanded && (
                        <div className="event-report-item-body">
                          {item.sceneText && <p className="event-report-item-scene">{item.sceneText}</p>}
                          <p>{item.bodyText}</p>
                          <Link className="event-report-item-link" to={item.route}>
                            {item.routeLabel}
                          </Link>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </section>
          ))}
        </div>

        <div className="event-report-actions">
          <button
            type="button"
            className="event-report-continue"
            onClick={() =>
              dispatch(
                gameActions.resolveInformationalEvents({
                  eventIds: items.map((item) => item.eventId),
                }),
              )
            }
          >
            Enter the day
          </button>
        </div>
      </div>
    </div>
  )
}
