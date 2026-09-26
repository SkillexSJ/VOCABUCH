import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: "Vocabuch",
    description:
      "Capture vocabulary with context sentences directly from any webpage.",
    permissions: ["storage", "contextMenus", "activeTab"],
    host_permissions: ["http://localhost:4000/*", "http://127.0.0.1:4000/*"],
    icons: {
      16: "favicon-16x16.png",
      32: "favicon-32x32.png",
    },
    action: {
      default_title: "Vocabulary Capture",
      default_icon: "/favicon-16x16.png",
    },
    browser_specific_settings: {
      gecko: {
        id: "vocabuch@local",
        strict_min_version: "109.0",
      },
    },
  },
});
