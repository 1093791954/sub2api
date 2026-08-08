import { afterEach, describe, expect, it } from 'vitest'

import {
  getAgentBoxEmbedConfig,
  isAgentBoxFooterControlVisible,
  isAgentBoxNavItemVisible,
} from '../agentboxEmbed'

const config = {
  schemaVersion: 1,
  navigation: {
    user: { mode: 'allowlist', items: ['/dashboard', '/keys'] },
    admin: { mode: 'all', items: [] },
  },
  footer: { themeToggle: false, sidebarCollapse: true },
}

afterEach(() => {
  Reflect.deleteProperty(window, '__AGENTBOX_EMBED_CONFIG__')
})

describe('AgentBox embedded shell configuration', () => {
  it('leaves normal browser sessions fully visible', () => {
    expect(getAgentBoxEmbedConfig()).toBeNull()
    expect(isAgentBoxNavItemVisible('user', '/orders')).toBe(true)
    expect(isAgentBoxFooterControlVisible('themeToggle')).toBe(true)
  })

  it('applies an AgentBox allowlist and footer controls', () => {
    Object.assign(window, { __AGENTBOX_EMBED_CONFIG__: config })

    expect(isAgentBoxNavItemVisible('user', '/dashboard')).toBe(true)
    expect(isAgentBoxNavItemVisible('user', '/orders')).toBe(false)
    expect(isAgentBoxNavItemVisible('admin', '/admin/users')).toBe(true)
    expect(isAgentBoxFooterControlVisible('themeToggle')).toBe(false)
    expect(isAgentBoxFooterControlVisible('sidebarCollapse')).toBe(true)
  })

  it('rejects malformed injected values and fails open to normal navigation', () => {
    Object.assign(window, { __AGENTBOX_EMBED_CONFIG__: {
      schemaVersion: 2,
      navigation: config.navigation,
      footer: config.footer,
    } })

    expect(getAgentBoxEmbedConfig()).toBeNull()
    expect(isAgentBoxNavItemVisible('user', '/orders')).toBe(true)
  })
})
