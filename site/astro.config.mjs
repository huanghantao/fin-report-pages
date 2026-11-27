// @ts-check
import { defineConfig } from "astro/config";

/**
 * 把每张 `<table>` 包进一个滚动容器。
 *
 * 为什么不直接在表格上加 `overflow-x: auto`：那需要给 `<table>` 设
 * `display: block`，而一旦它变成块级盒子，表格内部的匿名 table box 就退化成
 * 「按内容宽度收缩」——列少的时候表格只占左边三分之二，右边空一大片。
 * 滚动该由**外层**负责，表格自己是 `display: table`、宽度铺满。
 */
function wrapTables() {
  /** 取一个节点里所有文字的长度，用来判断这张表是「数字表」还是「文字表」。 */
  const textLength = (node) => {
    if (node.type === "text") return (node.value ?? "").length;
    if (!node.children) return 0;
    return node.children.reduce((sum, child) => sum + textLength(child), 0);
  };

  /** 收集表里所有单元格。table 的直接子节点是 thead/tbody，不是 tr，得往下走一层。 */
  const collectCells = (node, out = []) => {
    if (node.type === "element" && (node.tagName === "td" || node.tagName === "th")) {
      out.push(node);
      return out;
    }
    for (const child of node.children ?? []) collectCells(child, out);
    return out;
  };

  const hasLongCell = (table) => collectCells(table).some((cell) => textLength(cell) > 20);

  return (tree) => {
    const walk = (node) => {
      if (!node.children) return;
      node.children = node.children.map((child) => {
        if (child.type === "element" && child.tagName === "table") {
          // 数字表靠 nowrap 保证各列能竖着比大小；文字表（红旗清单、课税明细这类
          // 整句填在格子里）如果也不换行，会横向撑到两倍宽，读者得左右拖着读。
          const className = ["table-wrap"];
          if (hasLongCell(child)) className.push("is-text");
          return {
            type: "element",
            tagName: "div",
            properties: { className },
            children: [child],
          };
        }
        walk(child);
        return child;
      });
    };
    walk(tree);
  };
}

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
    rehypePlugins: [wrapTables],
  },
});
