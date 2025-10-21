/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_STRIPE_PRICE_BASIC: string
  readonly VITE_STRIPE_PRICE_PROFESSIONAL: string
  readonly VITE_STRIPE_PRICE_ENTERPRISE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
