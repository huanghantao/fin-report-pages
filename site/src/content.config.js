/**
 * 内容集合：直接读仓根 `reports/` 下的报告。
 *
 * 为什么不用默认的 `glob` loader：一份报告是「Markdown + 同目录的 meta.json」两件东西，
 * 而 meta.json 里有报告卡片要用的全部结构化字段（代码、名称、快照日、九个章节、红旗计数、
 * 阅读统计）。用自定义 loader 一次把两者读成一条记录，页面里就不用再回头去捞文件。
 */
import { defineCollection } from "astro:content";
import fs from "node:fs/promises";
import path from "node:path";

const REPORTS_DIR = path.resolve(process.cwd(), "..", "reports");

/** 递归找出所有 `company-analysis.md`。 */
async function findReports(dir) {
  const found = [];
  const walk = async (current) => {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name === "company-analysis.md") {
        found.push(full);
      }
    }
  };
  await walk(dir);
  return found;
}

const reports = defineCollection({
  loader: {
    name: "fin-report-loader",
    load: async ({ store, logger }) => {
      store.clear();
      let files = [];
      try {
        files = await findReports(REPORTS_DIR);
      } catch {
        logger.warn(`找不到报告目录 ${REPORTS_DIR}，站点将只有一张空索引`);
        return;
      }
      for (const file of files) {
        const relative = path.relative(REPORTS_DIR, file);
        // id = `600887.SH/2026-11-26`：既做路由参数，也做 meta 的查找键。
        const id = path.dirname(relative).split(path.sep).join("/");
        const raw = await fs.readFile(file, "utf-8");

        let meta = {};
        try {
          meta = JSON.parse(
            await fs.readFile(path.join(path.dirname(file), "meta.json"), "utf-8"),
          );
        } catch {
          logger.warn(`${id} 缺少 meta.json，卡片只能显示代码与日期`);
        }

        // 拆掉 front-matter：字段已经由 meta.json 提供，留着会被渲染成正文。
        const body = raw.replace(/^---\n[\s\S]*?\n---\n/, "");

        store.set({
          id,
          // filePath 是相对 site 根的真实路径：Astro 靠它把 body 交给 Markdown 渲染器，
          // 缺了它 render() 会拿到一份空内容（页面上只剩标题，正文一个字没有）。
          filePath: path.relative(path.resolve(process.cwd()), file),
          // deferredRender 让渲染推迟到运行时：200 页报告的正文不必在 loader 里编译一遍。
          deferredRender: true,
          data: {
            code: String(meta.code ?? id.split("/")[0] ?? ""),
            name: String(meta.name ?? ""),
            asOf: String(meta.as_of ?? id.split("/")[1] ?? ""),
            period: String(meta.period ?? ""),
            sections: (meta.documents?.[0]?.sections ?? []).map(String),
            charts: (meta.charts ?? []).map((item) => String(item.path ?? "")),
            evidenceCount: Number(meta.evidence_count ?? 0),
            gapCount: Number(meta.gap_count ?? 0),
            redFlags: {
              triggered: Number(meta.red_flags?.triggered ?? 0),
              insufficient: Number(meta.red_flags?.insufficient ?? 0),
              total: Number(meta.red_flags?.total ?? 0),
            },
            reading: {
              chunks: Number(meta.reading?.chunks ?? 0),
              chunksRead: Number(meta.reading?.chunks_read ?? 0),
              pages: Number(meta.reading?.pages ?? 0),
              pagesRead: Number(meta.reading?.pages_read ?? 0),
              judgements: Number(meta.reading?.judgements ?? 0),
            },
            topics: Number(meta.notes?.selected ?? 0),
          },
          body,
        });
      }
      logger.info(`读到 ${files.length} 份报告`);
    },
  },
});

export const collections = { reports };
