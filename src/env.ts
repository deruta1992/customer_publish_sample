export type TaxMode = 'inclusive' | 'exclusive' | 'none'

const DEFAULT_API_ENDPOINT = 'https://rqopkcftnc.execute-api.ap-northeast-1.amazonaws.com/prod/invoice/'
const DEFAULT_DEV_ENDPOINT = '/openapi/invoice'
const DEFAULT_TAX_RATE = 10

const parseTaxMode = (value?: string): TaxMode => {
  if (value === 'exclusive' || value === 'none') return value
  return 'inclusive'
}

const parseTaxRate = (value?: string): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : DEFAULT_TAX_RATE
}

/**
 * 各種API・税計算に利用する設定値。実値は `.env`, `.env.local` などのVite環境変数で注入し、
 * リポジトリにはコミットしないようにしてください。
 */
export const ENV = {
  /** 領収証予約APIのエンドポイントURL。 */
  API_ENDPOINT:
    import.meta.env.VITE_API_ENDPOINT || (import.meta.env.DEV ? DEFAULT_DEV_ENDPOINT : DEFAULT_API_ENDPOINT),
  /** Kvitancoで発行された店舗ID。 */
  SHOP_ID: import.meta.env.VITE_SHOP_ID || 'your-shop-id',
  /** APIキー。GitHub Pages公開時はGitHub Secretsなどでビルド時に注入してください。 */
  API_KEY: import.meta.env.VITE_API_KEY || 'your-api-key',
  /** 金額を小計/税額に分解するモード（内税/外税/非課税）。 */
  TAX_MODE: parseTaxMode(import.meta.env.VITE_TAX_MODE),
  /** 税率（%）。 */
  TAX_RATE: parseTaxRate(import.meta.env.VITE_TAX_RATE),
} as const
