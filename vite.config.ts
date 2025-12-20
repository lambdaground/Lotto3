import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // 👇 [중요] 이 줄을 추가해서 @assets가 attached_assets 폴더임을 알려줍니다.
      "@assets": path.resolve(__dirname, "./attached_assets"),
    },
  },
  build: {
    outDir: "dist",
  },
})
