import { env, createExecutionContext, waitOnExecutionContext } from 'cloudflare:test'
import { describe, it, expect, beforeEach } from 'vitest'
import worker from '../src/index.js'

const postRequest = () => new Request('https://example.com/visits', { method: 'POST' })

describe('Visitor counter worker', () => {
  beforeEach(async () => {
    await env.VISIT_COUNTER.delete('visit_count')
  })

  it('starts at 1 on the first visit', async () => {
    const ctx = createExecutionContext()
    const response = await worker.fetch(postRequest(), env, ctx)
    await waitOnExecutionContext(ctx)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.count).toBe(1)
  })

  it('increments the count on each POST', async () => {
    const ctx1 = createExecutionContext()
    await worker.fetch(postRequest(), env, ctx1)
    await waitOnExecutionContext(ctx1)

    const ctx2 = createExecutionContext()
    const response = await worker.fetch(postRequest(), env, ctx2)
    await waitOnExecutionContext(ctx2)
    const body = await response.json()

    expect(body.count).toBe(2)
  })

  it('rejects non-POST methods with 405', async () => {
    const request = new Request('https://example.com/visits', { method: 'GET' })
    const ctx = createExecutionContext()
    const response = await worker.fetch(request, env, ctx)
    await waitOnExecutionContext(ctx)

    expect(response.status).toBe(405)
  })

  it('handles the OPTIONS preflight with the right CORS headers', async () => {
    const request = new Request('https://example.com/visits', { method: 'OPTIONS' })
    const ctx = createExecutionContext()
    const response = await worker.fetch(request, env, ctx)
    await waitOnExecutionContext(ctx)

    expect(response.status).toBe(204)
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://abd-cloud-resume-v1.pages.dev'
    )
  })

  it('includes the CORS header on a normal response too', async () => {
    const ctx = createExecutionContext()
    const response = await worker.fetch(postRequest(), env, ctx)
    await waitOnExecutionContext(ctx)

    expect(response.headers.get('Access-Control-Allow-Origin')).toBe(
      'https://abd-cloud-resume-v1.pages.dev'
    )
  })

  it('returns 500 when the KV store fails', async () => {
    const brokenEnv = {
      VISIT_COUNTER: {
        get: async () => { throw new Error('KV is down') },
        put: async () => {},
      },
    }
    const ctx = createExecutionContext()
    const response = await worker.fetch(postRequest(), brokenEnv, ctx)
    await waitOnExecutionContext(ctx)

    expect(response.status).toBe(500)
  })
})