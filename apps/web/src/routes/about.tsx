import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  head: () => ({ meta: [{ title: 'About | Parkey' }] }),
  component: About,
})

function About() {
  return (
    <main id="main" tabIndex={-1} className="about-page">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        About Parkey
      </p>
      <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
        Explore the Parkey frontend.
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-muted">
        Parkey is a parking reservation platform taking shape in Poblacion,
        Makati, Philippines.
      </p>
      <p className="mt-5 leading-relaxed text-muted">
        This workspace uses fictional drivers, reservations, and a fictional
        parking lot. Search bookings, preview check-in and check-out, and change
        unassigned space availability. Changes last only for this page session;
        refresh or use Reset demo to start again.
      </p>
      <p className="mt-5 leading-relaxed text-muted">
        No authentication, real-time availability, payment processing, or
        backend services are connected. The independent mobile frontend previews
        driver discovery, vehicles, and trips. The two previews do not
        synchronize.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex min-h-11 items-center text-sm font-medium text-accent underline underline-offset-4"
      >
        Back to overview
      </Link>
    </main>
  )
}
