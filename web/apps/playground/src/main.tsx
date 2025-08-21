/**
 * @fileoverview Entry point for the Spectrogram playground application.
 * What: Bootstraps the React application used for interactive experiments.
 * How: Locates the target DOM node, validates its existence, and mounts the
 * playground component into it.
 */

import { createRoot } from 'react-dom/client'
import { PlaygroundApp } from './playground-app'

/**
 * Identifier for the host DOM element where the React app mounts.
 * Why: Using a named constant avoids hard-coded "magic" strings and eases
 * future refactoring of the mounting point.
 */
const ROOT_ELEMENT_ID = 'root'

/**
 * Initialize and render the playground application into the DOM.
 * Why: Wraps bootstrapping logic in a function for clarity and testability.
 * How: Locates the host element, fails fast if missing, then renders the
 * application via React's `createRoot` API.
 */
export function initializePlayground(): void {
  const container = document.getElementById(ROOT_ELEMENT_ID)
  if (container === null) {
    throw new Error(
      `Cannot initialize playground: element with id "${ROOT_ELEMENT_ID}" not found.`
    )
  }

  const root = createRoot(container)
  root.render(<PlaygroundApp />)
}

// Kick off playground initialization immediately upon module load.
initializePlayground()


