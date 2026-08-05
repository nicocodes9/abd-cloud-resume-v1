/* =========================================================================
   DOM REFERENCES
   ========================================================================= */
const yearElement = document.getElementById('year')
const menuButton = document.querySelector('.menu-button')
const mobileMenu = document.getElementById('mobile-menu')
const visitCountElement = document.getElementById('visit-count')

/* =========================================================================
   FOOTER YEAR
   ========================================================================= */
yearElement.textContent = new Date().getFullYear()

/* =========================================================================
   MOBILE MENU TOGGLE
   ========================================================================= */
if (menuButton && mobileMenu) {
  menuButton.addEventListener('click', () => {
    const isOpen = menuButton.getAttribute('aria-expanded') === 'true'
    menuButton.setAttribute('aria-expanded', String(!isOpen))
    mobileMenu.hidden = isOpen
  })

  mobileMenu.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      menuButton.setAttribute('aria-expanded', 'false')
      mobileMenu.hidden = true
    })
  })
}

/* =========================================================================
   VISITOR COUNTER (Cloud Resume Challenge)
   -------------------------------------------------------------------------
   Fetches (and increments) the visit count from a Cloudflare Worker + KV
   backend, then animates the number into the footer.

   SETUP: replace COUNTER_API_URL below with your deployed Worker URL.
   See backend/README.md for how to build and deploy that Worker.
   ========================================================================= */
const COUNTER_API_URL = 'https://PLACEHOLDER.workers.dev/visits'

const COUNT_ANIMATION_MS = 1200

/**
 * Animates a number counting up inside a target element.
 * @param {number} target - the final number to land on
 * @param {HTMLElement} element - element whose textContent gets updated
 */
function animateCount(target, element) {
  const startTime = performance.now()

  function step(now) {
    const progress = Math.min((now - startTime) / COUNT_ANIMATION_MS, 1)
    const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
    const current = Math.floor(target * eased)

    element.textContent = current.toLocaleString()

    if (progress < 1) {
      requestAnimationFrame(step)
    }
  }

  requestAnimationFrame(step)
}

/**
 * Calls the counter API and renders the result.
 * Fails silently in the UI (shows "—") so a backend outage never breaks the page.
 */
async function loadVisitorCount() {
  if (!visitCountElement) return

  try {
    const response = await fetch(COUNTER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    if (!response.ok) {
      throw new Error(`Counter API responded with ${response.status}`)
    }

    const data = await response.json()

    if (typeof data.count !== 'number') {
      throw new Error('Counter API response missing a numeric "count" field')
    }

    animateCount(data.count, visitCountElement)
  } catch (error) {
    console.warn('[visitor-counter]', error.message)
    visitCountElement.textContent = '—'
  }
}

loadVisitorCount()
