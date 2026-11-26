/** Independent frontend-only demo preview; no production bindings or Firebase. */
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ plugins: [react()] });
