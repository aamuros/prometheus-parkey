import type { AppInfo } from '@parkey/shared-types'
import { Link, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: Overview })

const app: AppInfo = {
  name: 'Parkey',
  description: 'A home for parking operations in Poblacion, Makati.',
}

function Overview() {
  return (
    <section aria-labelledby="welcome-heading" className="max-w-3xl">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        Workspace
      </p>
      <h1
        id="welcome-heading"
        className="mt-5 text-4xl font-semibold leading-tight tracking-tight md:text-6xl"
      >
        Welcome to {app.name}.
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
        {app.description}
      </p>
      <div className="mt-16 border-t border-line pt-8">
        <h2 className="text-lg font-semibold">Your workspace starts here</h2>
        <p className="mt-3 max-w-lg leading-relaxed text-muted">
          Operator and administrator tools are coming in a future release.
        </p>
        <Link
          to="/about"
          className="mt-7 inline-flex min-h-11 items-center gap-3 rounded-md bg-accent px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          About Parkey <span aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  )
}
