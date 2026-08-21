import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RegisterView from '@/views/auth/RegisterView.vue'

const { getPublicSettingsMock, keyRegisterMock, registerMock, routerPushMock } = vi.hoisted(() => ({
  getPublicSettingsMock: vi.fn(),
  keyRegisterMock: vi.fn(),
  registerMock: vi.fn(),
  routerPushMock: vi.fn()
}))

const publicSettings = {
  registration_enabled: true,
  email_verify_enabled: false,
  promo_code_enabled: false,
  invitation_code_enabled: false,
  affiliate_enabled: true,
  turnstile_enabled: true,
  turnstile_site_key: 'site-key',
  site_name: 'Sub2API',
  registration_email_suffix_whitelist: [],
  linuxdo_oauth_enabled: false,
  wechat_oauth_enabled: false,
  oidc_oauth_enabled: false,
  github_oauth_enabled: false,
  google_oauth_enabled: false
}

vi.mock('vue-router', () => ({
  useRouter: () => ({ push: routerPushMock }),
  useRoute: () => ({ query: {} })
}))

vi.mock('vue-i18n', () => ({
  createI18n: () => ({
    global: {
      t: (key: string) => key
    }
  }),
  useI18n: () => ({
    t: (key: string) => key,
    locale: { value: 'en' }
  })
}))

vi.mock('@/stores', () => ({
  useAuthStore: () => ({ register: registerMock, keyRegister: keyRegisterMock }),
  useAppStore: () => ({
    showError: vi.fn(),
    showSuccess: vi.fn(),
    showWarning: vi.fn()
  })
}))

vi.mock('@/api/auth', async () => {
  const actual = await vi.importActual<typeof import('@/api/auth')>('@/api/auth')
  return {
    ...actual,
    getPublicSettings: (...args: unknown[]) => getPublicSettingsMock(...args)
  }
})

function mountRegister() {
  return mount(RegisterView, {
    global: {
      stubs: {
        AuthLayout: { template: '<div><slot /><slot name="footer" /></div>' },
        Icon: true,
        TurnstileWidget: { template: '<div data-testid="turnstile-widget" />' },
        LoginAgreementPrompt: true,
        EmailOAuthButtons: true,
        LinuxDoOAuthSection: true,
        WechatOAuthSection: true,
        OidcOAuthSection: true,
        RouterLink: true,
        transition: false
      }
    }
  })
}

describe('RegisterView invitation layout', () => {
  beforeEach(() => {
    getPublicSettingsMock.mockReset()
    keyRegisterMock.mockReset()
    keyRegisterMock.mockResolvedValue({ id: 1 })
    registerMock.mockReset()
    routerPushMock.mockReset()
    getPublicSettingsMock.mockResolvedValue(publicSettings)
  })

  it('keeps the optional affiliate invitation field before Turnstile', async () => {
    const wrapper = mountRegister()
    await flushPromises()

    const invitationField = wrapper.get('[data-testid="affiliate-invitation-field"]')
    const turnstile = wrapper.get('[data-testid="registration-turnstile"]')

    expect(invitationField.get('input').attributes('id')).toBe('affiliate_code')
    expect(invitationField.text()).toContain('common.optional')
    expect(
      invitationField.element.compareDocumentPosition(turnstile.element) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('uses the mandatory invitation field without duplicating the affiliate field', async () => {
    getPublicSettingsMock.mockResolvedValueOnce({
      ...publicSettings,
      invitation_code_enabled: true
    })

    const wrapper = mountRegister()
    await flushPromises()

    expect(wrapper.find('[data-testid="affiliate-invitation-field"]').exists()).toBe(false)
    expect(wrapper.get('#invitation_code').exists()).toBe(true)
  })

  it('renders the custom account identifier in account mode', async () => {
    getPublicSettingsMock.mockResolvedValueOnce({
      ...publicSettings,
      account_login_enabled: true
    })

    const wrapper = mountRegister()
    await flushPromises()

    expect(wrapper.get('label[for="email"]').text()).toContain('auth.accountLabel')
    expect(wrapper.get('#email').attributes('type')).toBe('text')
    expect(wrapper.get('#email').attributes('autocomplete')).toBe('username')
  })

  it('keeps key registration available when normal registration is disabled', async () => {
    getPublicSettingsMock.mockResolvedValueOnce({
      ...publicSettings,
      registration_enabled: false
    })

    const wrapper = mountRegister()
    await flushPromises()

    expect(wrapper.get('[data-testid="registration-disabled"]').text()).toContain(
      'auth.registrationDisabled'
    )
    expect(wrapper.find('#email').exists()).toBe(false)
    expect(wrapper.find('[data-testid="registration-submit"]').exists()).toBe(false)

    await wrapper.get('[data-testid="registration-mode-key"]').trigger('click')

    expect(wrapper.find('[data-testid="registration-disabled"]').exists()).toBe(false)
    await wrapper.get('#register-access-key').setValue('abcdefghijklmnopqrstuvwxyz123456')
    await wrapper.get('#admin-secret').setValue('registration-secret')
    expect(wrapper.get('[data-testid="registration-submit"]').text()).toContain('auth.keyRegister')

    await wrapper.get('form').trigger('submit')
    await flushPromises()

    expect(keyRegisterMock).toHaveBeenCalledWith(
      'abcdefghijklmnopqrstuvwxyz123456',
      'registration-secret'
    )
    expect(routerPushMock).toHaveBeenCalledWith('/dashboard')
  })
})
