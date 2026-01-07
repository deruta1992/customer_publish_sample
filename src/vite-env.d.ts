/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_ENDPOINT?: string
  readonly VITE_SHOP_ID?: string
  readonly VITE_API_KEY?: string
  readonly VITE_TAX_MODE?: string
  readonly VITE_TAX_RATE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
