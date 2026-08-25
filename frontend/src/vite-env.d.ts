/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Base URL of the FastAPI backend, e.g. `http://localhost:8000`.
   *
   * Set in `frontend/.env`. When unset the app falls back to the page's own
   * origin, which only works if something is proxying the API onto it.
   */
  readonly VITE_API_URL?: string;
}
