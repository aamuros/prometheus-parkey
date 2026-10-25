import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  head: () => ({ meta: [{ title: 'About | Parkey' }] }),
  component: About,
})

function About() {
  return (
    <section className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        About Parkey
      </p>
      <h1 className="mt-5 text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
        Made for the neighborhood.
      </h1>
      <p className="mt-6 text-lg leading-relaxed text-muted">
        Parkey is a parking reservation platform taking shape in Poblacion,
        Makati, Philippines.
      </p>
      <p className="mt-5 leading-relaxed text-muted">
        We’re building a simpler way for drivers and local parking operators to
        connect. Parking discovery and reservations will be available in a
        future release.
      </p>
      <Link
        to="/"
        className="mt-8 inline-flex min-h-11 items-center text-sm font-medium text-accent underline underline-offset-4"
      >
        Back to overview
      </Link>
    </section>
  )
}
