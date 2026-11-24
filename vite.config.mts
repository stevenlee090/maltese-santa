import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Relative base so the build works on GitHub Pages under any repo name.
export default defineConfig({
  base: './',
  plugins: [react()],
  // `yarn dev` talks to a local `wrangler dev` for the claim API.
  server: { proxy: { '/api': 'http://localhost:8787' } },
})
