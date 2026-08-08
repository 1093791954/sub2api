export type AgentBoxNavigationScope = 'user' | 'admin'

export interface AgentBoxNavigationRule {
  mode: 'all' | 'allowlist'
  items: string[]
}

export interface AgentBoxEmbedConfig {
  schemaVersion: 1
  navigation: Record<AgentBoxNavigationScope, AgentBoxNavigationRule>
  footer: {
    themeToggle: boolean
    sidebarCollapse: boolean
  }
}

const EMBED_CONFIG_KEY = '__AGENTBOX_EMBED_CONFIG__'

function isNavigationRule(value: unknown): value is AgentBoxNavigationRule {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<AgentBoxNavigationRule>
  return (
    (candidate.mode === 'all' || candidate.mode === 'allowlist') &&
    Array.isArray(candidate.items) &&
    candidate.items.every(item => typeof item === 'string' && item.length > 0)
  )
}

function isEmbedConfig(value: unknown): value is AgentBoxEmbedConfig {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<AgentBoxEmbedConfig>
  return (
    candidate.schemaVersion === 1 &&
    !!candidate.navigation &&
    isNavigationRule(candidate.navigation.user) &&
    isNavigationRule(candidate.navigation.admin) &&
    !!candidate.footer &&
    typeof candidate.footer.themeToggle === 'boolean' &&
    typeof candidate.footer.sidebarCollapse === 'boolean'
  )
}

export function getAgentBoxEmbedConfig(): AgentBoxEmbedConfig | null {
  if (typeof window === 'undefined') return null
  const value = (window as unknown as Record<string, unknown>)[EMBED_CONFIG_KEY]
  return isEmbedConfig(value) ? value : null
}

export function isAgentBoxNavItemVisible(scope: AgentBoxNavigationScope, itemId: string): boolean {
  const config = getAgentBoxEmbedConfig()
  if (!config) return true
  const rule = config.navigation[scope]
  return rule.mode === 'all' || rule.items.includes(itemId)
}

export function isAgentBoxFooterControlVisible(control: 'themeToggle' | 'sidebarCollapse'): boolean {
  const config = getAgentBoxEmbedConfig()
  return !config || config.footer[control]
}
