import type { ReservationStatus } from '@parkey/shared-types'
import { Link, createFileRoute } from '@tanstack/react-router'
import { useReducer, useState } from 'react'

import { Dialog } from '../components/dialog'
import { Icon } from '../components/icon'
import {
  activeReservation,
  bays,
  filterReservations,
  initialWorkspace,
  statusLabels,
  workspaceReducer,
} from '../demo/workspace'
import type { DemoReservation, WorkspaceState } from '../demo/workspace'

export const Route = createFileRoute('/')({ component: Workspace })
type View = 'overview' | 'reservations' | 'spaces'
const navigation = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'reservations', label: 'Reservations', icon: 'ticket' },
  { id: 'spaces', label: 'Parking spaces', icon: 'parking' },
] as const

function Workspace() {
  const [state, dispatch] = useReducer(workspaceReducer, initialWorkspace)
  const [view, setView] = useState<View>('overview')
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedBay, setSelectedBay] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const parked = state.reservations.filter(
    (item) => item.status === 'checked_in',
  )
  const upcoming = state.reservations.filter(
    (item) => item.status === 'confirmed',
  )
  const free =
    bays.length - parked.length - upcoming.length - state.blockedBays.length
  const selected = state.reservations.find((item) => item.id === selectedId)
  const bayReservation = selectedBay
    ? activeReservation(state, selectedBay)
    : undefined
  const filtered = filterReservations(state.reservations, search, filter)

  function changeReservation(item: DemoReservation, status: ReservationStatus) {
    dispatch({ type: 'reservation', id: item.id, status })
    setNotice(`${item.id}: ${statusLabels[status].toLowerCase()} in this demo.`)
    setSelectedId(null)
  }

  return (
    <div className="workspace">
      <aside className="sidebar">
        <a href="#main" className="wordmark" aria-label="Parkey workspace">
          parkey<span>↗</span>
        </a>
        <div className="workspace-name">
          <span className="workspace-symbol">P</span>
          <div>
            <strong>Poblacion parking</strong>
            <span>Operator workspace</span>
          </div>
        </div>
        <p className="nav-caption">MANAGE</p>
        <nav aria-label="Workspace navigation">
          {navigation.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`sidebar-link ${view === item.id ? 'is-active' : ''}`}
              aria-current={view === item.id ? 'page' : undefined}
              onClick={() => {
                if (view === item.id) return
                setDirection(
                  navigation.findIndex((entry) => entry.id === item.id) >
                    navigation.findIndex((entry) => entry.id === view)
                    ? 'forward'
                    : 'backward',
                )
                setView(item.id)
                setNotice('')
              }}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id === 'reservations' && (
                <span className="nav-count">{upcoming.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="neighborhood-mark" aria-hidden="true">
            <span>P</span>
            <span>↗</span>
          </div>
          <p>
            A little less circling.
            <br />A little more living.
          </p>
          <Link to="/about" className="sidebar-about">
            About this preview <Icon name="arrow" size={16} />
          </Link>
          <div className="operator-profile">
            <span className="avatar">PO</span>
            <div>
              <strong>Preview operator</strong>
              <span>Local demo workspace</span>
            </div>
          </div>
        </div>
      </aside>
      <div className="workspace-main">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>{' '}
            <strong>
              {navigation.find((item) => item.id === view)?.label}
            </strong>
          </div>
          <span className="preview-label">
            <span />
            Frontend preview
          </span>
        </header>
        <main key={view} id="main" tabIndex={-1} data-motion={direction}>
          <div className="demo-banner">
            <Icon name="info" size={17} />
            <span>
              Fictional data. Changes stay in this session and do not affect
              real parking.
            </span>
            <button
              type="button"
              onClick={() => {
                dispatch({ type: 'reset' })
                setNotice('Demo data reset.')
                setSelectedId(null)
                setSelectedBay(null)
              }}
            >
              <Icon name="reset" size={15} /> Reset demo
            </button>
          </div>
          <div className="page-heading">
            <div>
              <p className="eyebrow">POBLACION, MAKATI</p>
              <h1>
                {view === 'overview'
                  ? 'Parking overview'
                  : view === 'reservations'
                    ? 'Reservations'
                    : 'Parking spaces'}
              </h1>
              <p className="page-description">
                {view === 'overview'
                  ? 'Arrivals, spaces, and the details that keep things moving.'
                  : view === 'reservations'
                    ? 'Find a booking and manage its demo arrival or departure.'
                    : 'Inspect each bay and update unassigned demo availability.'}
              </p>
            </div>
            <div className="snapshot-date">
              <Icon name="clock" size={17} />
              <div>
                <strong>Tuesday, 27 October</strong>
                <span>2026 · sample day · Manila time</span>
              </div>
            </div>
          </div>
          <p role="status" className={`notice ${notice ? 'has-notice' : ''}`}>
            {notice}
          </p>
          {view === 'overview' && (
            <>
              <section className="summary" aria-label="Demo parking summary">
                <div>
                  <span>Available spaces</span>
                  <strong>
                    {String(free).padStart(2, '0')}
                    <small> / {bays.length}</small>
                  </strong>
                  <p>Ready for the next arrival</p>
                </div>
                <div>
                  <span>Currently parked</span>
                  <strong>{String(parked.length).padStart(2, '0')}</strong>
                  <p>
                    {Math.round((parked.length / bays.length) * 100)}% of total
                    capacity
                  </p>
                </div>
                <div>
                  <span>Upcoming arrivals</span>
                  <strong>{String(upcoming.length).padStart(2, '0')}</strong>
                  <p>Reserved in this sample day</p>
                </div>
              </section>
              <div className="operations-grid">
                <ParkingPlan state={state} onSelect={setSelectedBay} />
                <section className="arrivals-panel">
                  <div className="section-heading">
                    <div>
                      <p className="eyebrow">NEXT UP</p>
                      <h2>Expected arrivals</h2>
                    </div>
                    <span className="number-tag">{upcoming.length}</span>
                  </div>
                  <p className="section-description">
                    A quick look at who’s on the way.
                  </p>
                  <div className="arrival-list">
                    {upcoming.length ? (
                      upcoming.map((item) => (
                        <button
                          className="arrival-item"
                          type="button"
                          key={item.id}
                          onClick={() => setSelectedId(item.id)}
                        >
                          <span className="arrival-time">
                            {item.arrival}
                            <span>arrival</span>
                          </span>
                          <span className="arrival-person">
                            <strong>{item.driver}</strong>
                            <span>
                              {item.plate} · {item.bay}
                            </span>
                          </span>
                          <Icon name="chevron" size={16} />
                        </button>
                      ))
                    ) : (
                      <p className="empty-state">
                        All sample arrivals have been handled.
                      </p>
                    )}
                  </div>
                  <div className="arrivals-footer">
                    <Icon name="pin" size={18} />
                    <div>
                      <strong>Parkey demo lot</strong>
                      <span>Poblacion · Fictional location</span>
                    </div>
                  </div>
                </section>
              </div>
            </>
          )}
          {view === 'spaces' && (
            <>
              <div className="space-summary">
                <span>
                  <strong>{bays.length}</strong> total spaces
                </span>
                <span>
                  <strong>{free}</strong> available
                </span>
                <span>
                  <strong>{state.blockedBays.length}</strong> unavailable
                </span>
              </div>
              <ParkingPlan state={state} onSelect={setSelectedBay} />
              <p className="helper-text">
                Select an unassigned space to mark it available or unavailable.
                Assigned spaces must be handled through their reservation.
              </p>
            </>
          )}
          {view !== 'spaces' && (
            <section className="reservation-section">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">
                    {view === 'overview'
                      ? 'THE DAY’S ACTIVITY'
                      : 'DEMO DAY · 27 OCT 2026'}
                  </p>
                  <h2>
                    {view === 'overview' ? 'Reservations' : 'All reservations'}
                  </h2>
                </div>
                {view === 'overview' && (
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => setView('reservations')}
                  >
                    View all reservations <Icon name="arrow" size={16} />
                  </button>
                )}
              </div>
              <div className="table-toolbar">
                <label className="search-field">
                  <Icon name="search" size={18} />
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search name, plate, or booking…"
                    aria-label="Search reservations"
                  />
                </label>
                <label className="filter-field">
                  <span>Status</span>
                  <select
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    aria-label="Filter reservation status"
                  >
                    <option value="all">All reservations</option>
                    <option value="confirmed">Upcoming</option>
                    <option value="checked_in">Parked</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </label>
              </div>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Driver / booking</th>
                      <th>Vehicle</th>
                      <th>Space</th>
                      <th>Parking time</th>
                      <th>Status</th>
                      <th>
                        <span className="sr-only">Details</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="driver-cell">
                            <span className="avatar">{item.initials}</span>
                            <span>
                              <strong>{item.driver}</strong>
                              <small>{item.id}</small>
                            </span>
                          </div>
                        </td>
                        <td>
                          <strong className="plate">{item.plate}</strong>
                          <small>{item.vehicle}</small>
                        </td>
                        <td>
                          <span className="bay-tag">{item.bay}</span>
                        </td>
                        <td>
                          <span>
                            {item.arrival} – {item.departure}
                          </span>
                          <small>27 Oct 2026</small>
                        </td>
                        <td>
                          <Status status={item.status} />
                        </td>
                        <td>
                          <button
                            type="button"
                            className="row-action"
                            onClick={() => setSelectedId(item.id)}
                            aria-label={`View reservation ${item.id}`}
                          >
                            Details <Icon name="chevron" size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!filtered.length && (
                <div className="empty-state">
                  <Icon name="search" size={28} />
                  <h3>No matching reservations</h3>
                  <p>Try another name, plate, booking number, or status.</p>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setSearch('')
                      setFilter('all')
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
              <div className="table-footer">
                <span>
                  {filtered.length} of {state.reservations.length} demo
                  reservations
                </span>
                <span>All times in Asia/Manila</span>
              </div>
            </section>
          )}
          <footer className="workspace-footer">
            <span>
              parkey<span className="accent">↗</span>{' '}
              <span className="footer-copy">Made for the neighborhood.</span>
            </span>
            <span>Frontend demo · No services connected</span>
          </footer>
        </main>
      </div>
      {selected && (
        <Dialog title="Reservation details" onClose={() => setSelectedId(null)}>
          <div className="detail-intro">
            <span className="avatar large">{selected.initials}</span>
            <div>
              <h3>{selected.driver}</h3>
              <p>{selected.id} · Fictional driver</p>
            </div>
            <Status status={selected.status} />
          </div>
          <dl className="detail-list">
            <div>
              <dt>Location</dt>
              <dd>Parkey demo lot · Poblacion</dd>
            </div>
            <div>
              <dt>Vehicle</dt>
              <dd>
                {selected.plate} · {selected.vehicle}
              </dd>
            </div>
            <div>
              <dt>Parking space</dt>
              <dd>{selected.bay}</dd>
            </div>
            <div>
              <dt>Sample date</dt>
              <dd>27 October 2026</dd>
            </div>
            <div>
              <dt>Parking time</dt>
              <dd>
                {selected.arrival} – {selected.departure} · Manila
              </dd>
            </div>
          </dl>
          <p className="dialog-note">
            These actions update this preview only. No real reservation,
            payment, or access pass is created.
          </p>
          <div className="dialog-actions">
            {selected.status === 'confirmed' && (
              <>
                <button
                  type="button"
                  className="secondary-button danger-text"
                  onClick={() => changeReservation(selected, 'cancelled')}
                >
                  Cancel demo booking
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => changeReservation(selected, 'checked_in')}
                >
                  <Icon name="check" size={17} />
                  Check in
                </button>
              </>
            )}
            {selected.status === 'checked_in' && (
              <button
                type="button"
                className="primary-button"
                onClick={() => changeReservation(selected, 'completed')}
              >
                Check out <Icon name="arrow" size={17} />
              </button>
            )}
            {(selected.status === 'completed' ||
              selected.status === 'cancelled') && (
              <button
                type="button"
                className="secondary-button"
                onClick={() => setSelectedId(null)}
              >
                Close
              </button>
            )}
          </div>
        </Dialog>
      )}
      {selectedBay && (
        <Dialog
          title={`Parking space ${selectedBay}`}
          onClose={() => setSelectedBay(null)}
        >
          <div className="bay-detail-mark">
            <Icon name="parking" size={40} />
            <strong>{selectedBay}</strong>
            <span>
              {bayReservation
                ? statusLabels[bayReservation.status]
                : state.blockedBays.includes(selectedBay)
                  ? 'Unavailable'
                  : 'Available'}
            </span>
          </div>
          <p className="dialog-note">
            {bayReservation
              ? `Assigned to ${bayReservation.driver} · ${bayReservation.plate}. Manage this space through the reservation.`
              : 'Change the availability of this unassigned space in the local preview.'}
          </p>
          <div className="dialog-actions">
            {bayReservation ? (
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setSelectedId(bayReservation.id)
                  setSelectedBay(null)
                }}
              >
                View reservation <Icon name="arrow" size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  dispatch({ type: 'toggle-bay', bay: selectedBay })
                  setNotice(`${selectedBay} availability updated in this demo.`)
                  setSelectedBay(null)
                }}
              >
                {state.blockedBays.includes(selectedBay)
                  ? 'Mark available'
                  : 'Mark unavailable'}
              </button>
            )}
          </div>
        </Dialog>
      )}
    </div>
  )
}

function Status({ status }: { status: ReservationStatus }) {
  return (
    <span className={`status status-${status}`}>
      <span />
      {statusLabels[status]}
    </span>
  )
}

function ParkingPlan({
  state,
  onSelect,
}: {
  state: WorkspaceState
  onSelect: (bay: string) => void
}) {
  return (
    <section className="parking-panel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">PARKEY DEMO LOT</p>
          <h2>Space overview</h2>
        </div>
        <span className="plan-label">16 spaces · Ground level</span>
      </div>
      <div className="parking-plan">
        <div className="plan-edge">
          <span>GROUND LEVEL</span>
          <span>POBLACION / DEMO</span>
        </div>
        {['A', 'B'].map((row) => (
          <div className={`parking-row row-${row}`} key={row}>
            {bays
              .filter((bay) => bay.startsWith(row))
              .map((bay) => {
                const reservation = activeReservation(state, bay)
                const status =
                  reservation?.status === 'checked_in'
                    ? 'occupied'
                    : reservation
                      ? 'reserved'
                      : state.blockedBays.includes(bay)
                        ? 'blocked'
                        : 'available'
                return (
                  <button
                    type="button"
                    key={bay}
                    className={`parking-bay ${status}`}
                    onClick={() => onSelect(bay)}
                    aria-label={`Space ${bay}: ${status}. View details`}
                  >
                    <span className="bay-number">{bay}</span>
                    {status === 'occupied' ? (
                      <span className="plan-car" aria-hidden="true">
                        <span />
                      </span>
                    ) : status === 'blocked' ? (
                      <span className="blocked-mark" aria-hidden="true">
                        ×
                      </span>
                    ) : (
                      <span className="bay-center" aria-hidden="true">
                        {status === 'reserved' ? 'R' : 'P'}
                      </span>
                    )}
                  </button>
                )
              })}
          </div>
        ))}
        <div className="driving-lane">
          <span>
            ENTRY <span aria-hidden="true">→</span>
          </span>
          <span className="lane-line" />
          <Icon name="arrow" size={23} />
          <span className="lane-line" />
          <span>
            EXIT <span aria-hidden="true">↗</span>
          </span>
        </div>
      </div>
      <div className="plan-legend">
        <span>
          <i className="legend-available" />
          Available
        </span>
        <span>
          <i className="legend-occupied" />
          Parked
        </span>
        <span>
          <i className="legend-reserved" />
          Reserved
        </span>
        <span>
          <i className="legend-blocked" />
          Unavailable
        </span>
      </div>
    </section>
  )
}
