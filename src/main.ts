import './style.css'
import { marked } from 'marked'
import { ENV } from './env'
import type { TaxMode } from './env'

type Step = 'terms' | 'form' | 'thankyou'

interface FormState {
  name: string
  email: string
  transactionDate: string
  total: string
}

type FormField = keyof FormState

interface SubmissionSummary {
  reference?: string
  total: number
  email: string
  transactionDateTime: string
}

interface CalculatedAmounts {
  subtotal: number
  total: number
  taxInclude: number
  taxRate: number
}

const TAX_LABELS: Record<TaxMode, string> = {
  inclusive: '内税',
  exclusive: '外税',
  none: '非課税',
}

const TAX_GUIDE: Record<TaxMode, string> = {
  inclusive: '入力金額は税込合計として扱われます。',
  exclusive: '入力金額は税抜金額として扱い、送信時に税込合計を計算します。',
  none: '入力金額は非課税としてそのまま送信されます。',
}

const app = document.querySelector<HTMLDivElement>('#app')

let termsHtml = '<p>利用約款を読み込み中です…</p>'

const state: {
  step: Step
  form: FormState
  showConfirm: boolean
  loading: boolean
  error: string
  fieldErrors: Partial<Record<FormField, string>>
  submissionSummary: SubmissionSummary | null
} = {
  step: 'terms',
  form: getInitialFormState(),
  showConfirm: false,
  loading: false,
  error: '',
  fieldErrors: {},
  submissionSummary: null,
}

function getInitialFormState(): FormState {
  return {
    name: '',
    email: '',
    transactionDate: getDefaultTransactionDate(),
    total: '',
  }
}

function getDefaultTransactionDate(): string {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  const local = new Date(now.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}

function render() {
  if (!app) return

  const computed = calculateAmounts(Number(state.form.total))

  app.innerHTML = `
    <main class="app-shell">
      <header class="hero">
        <span class="hero__eyebrow">Kvitanco Invoice</span>
        <h1 class="hero__title">WEB領収証発行予約</h1>
        <p class="hero__subtitle">
          これはデモプログラムです。
        </p>
        <span class="tax-pill">${TAX_LABELS[ENV.TAX_MODE]} / 税率 ${ENV.TAX_RATE}%</span>
      </header>
      ${state.error ? `<div class="error-banner">${escapeHtml(state.error)}</div>` : ''}
      ${renderStep(state.step, computed)}
    </main>
    ${state.showConfirm ? renderConfirmModal(computed) : ''}
  `

  attachEvents()
}

function renderStep(step: Step, computed: CalculatedAmounts): string {
  if (step === 'terms') {
    return `
      <section class="card">
        <div class="step-indicator"><strong>STEP 01</strong> 利用約款の確認</div>
        <div class="terms terms--markdown">${termsHtml}</div>
        <div class="actions">
          <button id="agree-button" class="button button-primary">同意して入力へ</button>
        </div>
      </section>
    `
  }

  if (step === 'form') {
    return `
      <section class="card">
        <div class="step-indicator"><strong>STEP 02</strong> 情報入力</div>
        <form id="reservation-form" novalidate>
          <div class="form-grid">
            <div class="input-field${fieldErrorClass('name')}">
              <label for="name">領収証宛名 *</label>
              <input id="name" name="name" type="text" autocomplete="name" value="${escapeAttribute(state.form.name)}" aria-invalid="${Boolean(getFieldError('name'))}" required />
              ${fieldErrorText('name')}
            </div>
            <div class="input-field${fieldErrorClass('email')}">
              <label for="email">メールアドレス *</label>
              <input id="email" name="email" type="email" autocomplete="email" value="${escapeAttribute(state.form.email)}" aria-invalid="${Boolean(getFieldError('email'))}" required />
              ${fieldErrorText('email')}
            </div>
            <div class="input-field${fieldErrorClass('transactionDate')}">
              <label for="transactionDate">取引日時 *</label>
              <input id="transactionDate" name="transactionDate" type="datetime-local" value="${escapeAttribute(state.form.transactionDate)}" aria-invalid="${Boolean(getFieldError('transactionDate'))}" required />
              ${fieldErrorText('transactionDate')}
            </div>
            <div class="input-field${fieldErrorClass('total')}">
              <label for="total">合計金額 (JPY) *</label>
              <input id="total" name="total" type="number" min="0" step="0.01" inputmode="decimal" value="${escapeAttribute(state.form.total)}" aria-invalid="${Boolean(getFieldError('total'))}" required />
              <small>${TAX_GUIDE[ENV.TAX_MODE]}</small>
              ${fieldErrorText('total')}
            </div>
          </div>
          <div class="summary-panel" aria-live="polite">
            <div class="summary-panel__row"><span>小計</span><span>${formatCurrency(computed.subtotal)}</span></div>
            <div class="summary-panel__row"><span>税額</span><span>${formatCurrency(computed.taxInclude)}</span></div>
            <div class="summary-panel__row"><span>税込合計</span><span>${formatCurrency(computed.total)}</span></div>
          </div>
          <div class="actions">
            <button type="submit" class="button button-primary" ${state.loading ? 'disabled' : ''}>${state.loading ? '処理中…' : '確認へ進む'}</button>
          </div>
        </form>
      </section>
    `
  }

  return `
    <section class="card thankyou">
      <div class="thankyou__badge">✓</div>
      <h2 class="thankyou__title">受付が完了しました</h2>
      <p class="thankyou__notes">
        ご入力いただいた内容はAPIへ送信されました。確認メールが${state.submissionSummary?.email ?? 'ご登録のメールアドレス'}宛に届きます。
      </p>
      ${state.submissionSummary ? `
        <div class="summary-panel">
          <div class="summary-panel__row"><span>受付番号</span><span>${state.submissionSummary.reference ?? 'ー'}</span></div>
          <div class="summary-panel__row"><span>合計金額</span><span>${formatCurrency(state.submissionSummary.total)}</span></div>
          <div class="summary-panel__row"><span>取引日時</span><span>${formatDateDisplay(state.submissionSummary.transactionDateTime)}</span></div>
        </div>
      ` : ''}
      <div class="actions" style="justify-content:center;">
        <button id="start-new" class="button button-primary">新しい予約を作成</button>
      </div>
    </section>
  `
}

function renderConfirmModal(computed: CalculatedAmounts): string {
  return `
    <div class="modal-backdrop">
      <div class="modal-card">
        <h2>入力内容の確認</h2>
        <ul class="confirm-list">
          <li>宛名: <span>${escapeHtml(state.form.name) || '（未入力）'}</span></li>
          <li>メール: <span>${escapeHtml(state.form.email)}</span></li>
          <li>取引日時: <span>${formatDateDisplay(state.form.transactionDate)}</span></li>
          <li>金額: <span>${formatCurrency(computed.total)}</span> <span class="chip">${TAX_LABELS[ENV.TAX_MODE]}</span></li>
        </ul>
        <div class="summary-panel">
          <div class="summary-panel__row"><span>小計</span><span>${formatCurrency(computed.subtotal)}</span></div>
          <div class="summary-panel__row"><span>税額</span><span>${formatCurrency(computed.taxInclude)}</span></div>
          <div class="summary-panel__row"><span>税込合計</span><span>${formatCurrency(computed.total)}</span></div>
        </div>
        <div class="actions">
          <button id="cancel-confirm" class="button button-secondary" ${state.loading ? 'disabled' : ''}>修正する</button>
          <button id="confirm-submit" class="button button-primary" ${state.loading ? 'disabled' : ''}>${state.loading ? '送信中…' : '送信する'}</button>
        </div>
      </div>
    </div>
  `
}

function attachEvents() {
  if (state.step === 'terms') {
    document.getElementById('agree-button')?.addEventListener('click', () => {
      state.step = 'form'
      state.error = ''
      state.fieldErrors = {}
      render()
    })
  }

  if (state.step === 'form') {
    const formEl = document.getElementById('reservation-form') as HTMLFormElement | null
    formEl?.addEventListener('input', handleFormInput)
    formEl?.addEventListener('submit', handleFormSubmit)
  }

  if (state.step === 'thankyou') {
    document.getElementById('start-new')?.addEventListener('click', () => {
      state.step = 'form'
      state.form = getInitialFormState()
      state.fieldErrors = {}
      state.submissionSummary = null
      render()
    })
  }

  if (state.showConfirm) {
    document.getElementById('cancel-confirm')?.addEventListener('click', () => {
      state.showConfirm = false
      render()
    })
    document.getElementById('confirm-submit')?.addEventListener('click', submitReservation)
  }
}

function handleFormInput(event: Event) {
  const target = event.target as HTMLInputElement | HTMLTextAreaElement
  if (!target?.name) return
  if (!Object.prototype.hasOwnProperty.call(state.form, target.name)) return
  const field = target.name as keyof FormState
  state.form = { ...state.form, [field]: target.value }
  if (state.fieldErrors[field]) {
    const nextErrors = { ...state.fieldErrors }
    delete nextErrors[field]
    state.fieldErrors = nextErrors
  }
}

function handleFormSubmit(event: Event) {
  event.preventDefault()
  const validation = validateForm(state.form)
  state.fieldErrors = validation.errors
  if (!validation.valid) {
    state.error = validation.summary ?? '入力内容を確認してください。'
    state.showConfirm = false
    render()
    return
  }

  state.error = ''
  state.fieldErrors = {}
  state.showConfirm = true
  render()
}

function validateForm(form: FormState): {
  valid: boolean
  summary?: string
  errors: Partial<Record<FormField, string>>
} {
  const errors: Partial<Record<FormField, string>> = {}

  if (!form.name.trim()) {
    errors.name = '宛名を入力してください。'
  }

  if (!form.email.trim()) {
    errors.email = 'メールアドレスを入力してください。'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = '有効なメールアドレスを入力してください。'
  }

  if (!form.transactionDate) {
    errors.transactionDate = '取引日時を入力してください。'
  } else if (Number.isNaN(new Date(form.transactionDate).getTime())) {
    errors.transactionDate = '正しい取引日時を入力してください。'
  }

  const total = Number(form.total)
  if (!form.total.trim()) {
    errors.total = '合計金額を入力してください。'
  } else if (!Number.isFinite(total) || total <= 0) {
    errors.total = '合計金額は0より大きい数値で入力してください。'
  }

  const valid = Object.keys(errors).length === 0

  return {
    valid,
    summary: valid ? undefined : '未入力または形式が正しくない項目があります。',
    errors,
  }
}

async function submitReservation() {
  if (state.loading) return

  const formValidation = validateForm(state.form)
  state.fieldErrors = formValidation.errors
  if (!formValidation.valid) {
    state.error = formValidation.summary ?? '入力内容を確認してください。'
    state.showConfirm = false
    render()
    return
  }

  state.loading = true
  render()

  try {
    const payload = buildPayload(state.form)
    const response = await fetch(ENV.API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ENV.API_KEY,
      },
      body: JSON.stringify(payload),
    })

    const body = await safeJson(response)

    if (!response.ok) {
      throw new Error(body?.message || 'APIリクエストに失敗しました。')
    }

    const computed = calculateAmounts(Number(state.form.total))

    state.submissionSummary = {
      reference: body?.id ?? body?.reference ?? body?.requestId,
      total: computed.total,
      email: state.form.email,
      transactionDateTime: payload.invoice.transactionDateTime,
    }

    state.step = 'thankyou'
    state.form = getInitialFormState()
    state.fieldErrors = {}
    state.error = ''
  } catch (error) {
    const message = error instanceof Error ? error.message : '送信に失敗しました。時間をおいて再度お試しください。'
    state.error = message
  } finally {
    state.loading = false
    state.showConfirm = false
    render()
  }
}

function buildPayload(form: FormState) {
  const amounts = calculateAmounts(Number(form.total))
  const transactionDateISO = new Date(form.transactionDate).toISOString()

  return {
    name: form.name.trim(),
    email: form.email.trim(),
    phone: '',
    kvitancoInvoiceShopId: ENV.SHOP_ID,
    invoice: {
      transactionDateTime: transactionDateISO,
      subtotal: amounts.subtotal.toFixed(2),
      total: amounts.total.toFixed(2),
      taxInclude: amounts.taxInclude.toFixed(2),
      taxRate: amounts.taxRate.toFixed(2),
      memo: '',
    },
  }
}

function calculateAmounts(input: number): CalculatedAmounts {
  const amount = Number.isFinite(input) && input > 0 ? input : 0
  const taxRate = ENV.TAX_MODE === 'none' ? 0 : ENV.TAX_RATE
  const ratio = taxRate / 100

  let subtotal = amount
  let total = amount
  let taxInclude = 0

  if (ENV.TAX_MODE === 'inclusive') {
    total = amount
    subtotal = ratio > 0 ? amount / (1 + ratio) : amount
    taxInclude = total - subtotal
  } else if (ENV.TAX_MODE === 'exclusive') {
    subtotal = amount
    taxInclude = ratio > 0 ? amount * ratio : 0
    total = subtotal + taxInclude
  } else {
    subtotal = amount
    total = amount
    taxInclude = 0
  }

  return {
    subtotal: roundCurrency(subtotal),
    total: roundCurrency(total),
    taxInclude: roundCurrency(taxInclude),
    taxRate,
  }
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDateDisplay(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'ー'
  return new Intl.DateTimeFormat('ja-JP', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, '&#96;')
}

function getFieldError(field: FormField): string | undefined {
  return state.fieldErrors[field]
}

function fieldErrorClass(field: FormField): string {
  return getFieldError(field) ? ' input-field--error' : ''
}

function fieldErrorText(field: FormField): string {
  const error = getFieldError(field)
  return error ? `<span class="field-error">${escapeHtml(error)}</span>` : ''
}

async function loadTerms() {
  try {
    const termsUrl = `${import.meta.env.BASE_URL}terms.md`
    const response = await fetch(termsUrl, { cache: 'no-cache' })
    if (!response.ok) {
      throw new Error(`Failed to load terms: ${response.status}`)
    }
    const markdown = await response.text()
    const markdownHtml = await marked.parse(markdown)
    termsHtml = markdownHtml
  } catch (error) {
    console.error('Terms markdown load failed', error)
    termsHtml = '<p class="terms-error">利用約款の読み込みに失敗しました。時間をおいて再度お試しください。</p>'
  } finally {
    render()
  }
}

async function safeJson(response: Response): Promise<any> {
  try {
    return await response.json()
  } catch {
    return null
  }
}

render()
loadTerms().catch((error) => {
  console.error('Terms initialization failed', error)
})
