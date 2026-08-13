# HTML 流程图模板

`build-flowchart` 输出一个自包含 HTML 文件。Mermaid 负责流程图渲染，Tailwind 负责排版。两者均来自 CDN。

## 骨架

```html
<!doctype html>
<html lang="zh">
  <head>
    <meta charset="utf-8" />
    <title>产品流程图 — {{产品名称}}</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script type="module">
      import mermaid from "https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs";
      mermaid.initialize({ startOnLoad: true, theme: "neutral", securityLevel: "loose" });
    </script>
    <style>
      .changed { stroke: #16a34a; stroke-width: 3px; }
      .removed { stroke: #dc2626; stroke-dasharray: 4 4; }
      .added   { stroke: #2563eb; stroke-width: 3px; }
    </style>
  </head>
  <body class="bg-stone-50 text-slate-900 font-sans">
    <main class="max-w-6xl mx-auto px-6 py-12 space-y-12">
      <header>...</header>
      <section id="current-flow">...</section>
      <!-- 仅变更对比模式才有 -->
      <section id="after-flow">...</section>
    </main>
  </body>
</html>
```

## Header

产品名称、生成日期、图例说明（绿色=新增节点/路径，红色虚线=移除，蓝色=修改）。不写废话，直接进入流程图。

## 流程图区域

### 全量模式（从蓝图/代码生成）

一张完整的产品用户操作流程图，包含所有功能模块的用户路径。

```html
<section id="current-flow" class="space-y-6">
  <h2 class="text-2xl font-bold">产品流程全图</h2>
  <div class="rounded-lg border border-slate-200 bg-white p-6">
    <pre class="mermaid">
      flowchart TD
        A[用户打开首页] --> B{有待复习卡片?}
        B -- 是 --> C[进入复习流]
        B -- 否 --> D[创建新笔记]
        C --> E[逐张卡片复习]
        E --> F{记住了?}
        F -- 是 --> G[推进到下一阶段]
        F -- 否 --> H[重置到第1天]
        G --> I[复习完成]
        H --> I
        D --> J[编辑 Markdown 内容]
        J --> K[保存并生成首次复习任务]
    </pre>
  </div>
</section>
```

### 变更对比模式（从 Spec 生成）

两栏并排：左边是当前全量流程，右边是变更后全量流程。变更涉及的节点用颜色标记。

```html
<section class="grid grid-cols-2 gap-8">
  <div>
    <h3 class="text-xl font-semibold mb-4">📋 当前流程</h3>
    <div class="rounded-lg border border-slate-200 bg-white p-4">
      <pre class="mermaid">
        flowchart TD
          A[...] --> B[...]
      </pre>
    </div>
  </div>
  <div>
    <h3 class="text-xl font-semibold mb-4">🚀 变更后流程</h3>
    <div class="rounded-lg border border-slate-200 bg-white p-4">
      <pre class="mermaid">
        flowchart TD
          A[...] --> B[...]
          B --> C[新增功能]:::added
          classDef added stroke:#2563eb,stroke-width:3px,fill:#dbeafe;
      </pre>
    </div>
  </div>
</section>
```

## 样式指南

### 调色板（命名色值）

| 名称 | 色值 | 用途 |
|:---|:---|:---|
| **ink** | `#1e293b` | 正文、普通节点边框 |
| **canvas** | `#fafaf9` | 页面背景 |
| **paper** | `#ffffff` | 流程图卡片背景 |
| **grow** | `#16a34a` | 新增节点/路径 |
| **cut** | `#dc2626` | 移除节点/路径 |
| **shift** | `#2563eb` | 修改节点/路径 |
| **accent** | `#6366f1` | 签名元素、关键路径高亮 |

### 字体

- **标题**：`font-serif`（如 Georgia）——给流程图一种"蓝图手稿"的质感，区别于千篇一律的无衬线 AI 模板。
- **节点文字 / 正文**：`font-sans`（系统默认）——清晰易读。
- **图例标签**：`font-mono text-xs uppercase tracking-wider`——像工程图纸上的标注。

### 签名元素

每张流程图左上角有一条 **indigo 色的竖线**（`border-l-4 border-indigo-500`），贯穿整个卡片左侧。这是"蓝图驱动"体系的视觉 DNA——像建筑蓝图边缘的装订线。其他部分保持克制安静。

### 节点设计

- 用用户能理解的自然语言（"用户点击提交"），不用代码术语（"POST /api/submit"）。
- 决策节点用菱形，操作节点用圆角矩形，起止点用圆形。
- 关键路径（Happy Path）用 **accent** 色加粗连线。

### 总体气质

- 追求"精心设计过的工程图纸"感，不是企业仪表盘，也不是花哨的营销页。
- 大量留白，让流程图呼吸。
- 动效克制：仅 Mermaid 自身渲染动画，不额外加动画。
- 除 Tailwind CDN 和 Mermaid ESM 外不引入任何脚本，纯静态。
