import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  // Finance Admin is served under:
  // https://www.eotcst.org/finance/
  base: "/finance/",
});
