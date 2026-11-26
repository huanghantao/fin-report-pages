// @ts-check
import { defineConfig } from "astro/config";

// 站点部署在 <user>.github.io/<repo>/，base 必须与仓库同名，否则站内链接会指错。
export default defineConfig({
  site: "https://huanghantao.github.io",
  base: "/fin-report-pages",
  trailingSlash: "always",
  build: { format: "directory" },
  markdown: {
    // 报告里有大量表格，GFM 的管道语法是必需的；shiki 主题沿用暖色调。
    gfm: true,
    shikiConfig: { theme: "github-light", wrap: false },
  },
});
