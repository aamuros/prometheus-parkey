import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import type { ReactNode } from 'react'

import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Parkey | Workspace' },
      {
        name: 'description',
        content: 'The Parkey parking operations workspace.',
      },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => (
    <section>
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <Link className="mt-6 inline-block underline" to="/">
        Return to overview
      </Link>
    </section>
  ),
})

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div className="mx-auto flex min-h-svh max-w-7xl flex-col px-6 md:px-12">
          <header className="flex flex-wrap items-center justify-between gap-6 border-b border-line py-7">
            <Link
              to="/"
              className="text-3xl font-extrabold tracking-tight"
              aria-label="Parkey home"
            >
              Parkey<span className="text-accent">.</span>
            </Link>
            <nav aria-label="Main navigation" className="flex gap-6 text-sm">
              <Link
                to="/"
                activeOptions={{ exact: true }}
                className="nav-link"
                activeProps={{
                  className: 'nav-link nav-active',
                  'aria-current': 'page',
                }}
              >
                Overview
              </Link>
              <Link
                to="/about"
                className="nav-link"
                activeProps={{
                  className: 'nav-link nav-active',
                  'aria-current': 'page',
                }}
              >
                About
              </Link>
            </nav>
          </header>
          <main id="main" tabIndex={-1} className="flex-1 py-16 md:py-24">
            {children}
          </main>
          <footer className="flex flex-wrap justify-between gap-3 border-t border-line py-6 text-xs text-muted">
            <span>Parkey · Made for the neighborhood.</span>
            <span>Poblacion, Makati, Philippines</span>
          </footer>
        </div>
        <Scripts />
      </body>
    </html>
  )
}
