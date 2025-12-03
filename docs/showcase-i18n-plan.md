# Showcase 多语言优化方案（v2.0）

> 整合 Claude 与 Codex 讨论结果的最终实施方案

---

## 一、项目背景

### 当前状态

| 项目 | 现状 |
|------|------|
| 静态数据 | `src/data/nano-banana-prompts.json`（约 550 条，仅中文） |
| 适配器 | `src/shared/adapters/nano-banana-prompts.ts`（无多语言支持） |
| 项目语言 | 当前仅 `zh`, `en` |
| 上游仓库 | 支持 16 种语言 |

### 目标

从 `YouMind-OpenLab/awesome-nano-banana-pro-prompts` 同步数据，实现静态文件的多语言支持。

---

## 二、用户特别强调的需求【必须遵守】

| 编号 | 需求 | 说明 |
|------|------|------|
| **🔴 R1** | 不影响现有功能 | 管理员新增、用户生成图片分享功能不受影响 |
| **🔴 R2** | 完全重新生成数据 | 不保留现有 JSON，从上游全新生成 |
| **🔴 R3** | 使用 Submodule 方式 | 需提供后期跟踪更新的操作说明 |
| **🔴 R4** | 同步所有 16 种语言 | 即使当前项目只用 zh/en，也要全部同步，方便后期扩展 |

---

## 三、架构设计

### 数据流向图

```
┌─────────────────────────────────────────────────────────────────┐
│                     上游仓库 (Submodule)                         │
│  .source/awesome-nano-banana-pro-prompts/                       │
│  ├── README.md          (en)                                    │
│  ├── README_zh.md       (zh)                                    │
│  ├── README_zh-TW.md    (zh-TW)                                 │
│  ├── README_ja-JP.md    (ja)                                    │
│  └── ... (共 16 种语言)                                          │
└──────────────────────────┬──────────────────────────────────────┘
                           │ pnpm sync:youmind
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  scripts/sync-youmind-prompts.ts                                │
│  - 解析 Markdown                                                │
│  - 多语言合并                                                    │
│  - 不做过滤（职责单点化）                                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ 覆盖写入【🔴 R2】
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  src/data/nano-banana-prompts.json                              │
│  - 全量 16 语言【🔴 R4】                                         │
│  - i18n 结构                                                    │
└──────────────────────────┬──────────────────────────────────────┘
                           │ 运行时读取
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│  src/shared/adapters/nano-banana-prompts.ts                     │
│  - Locale 规范化                                                 │
│  - Banned 关键词过滤（单点）                                      │
│  - 语言回退逻辑                                                  │
└──────────────────────────┬──────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌─────────────────────┐    ┌─────────────────────────────────────┐
│ 静态数据展示         │    │ 数据库数据【🔴 R1 不受影响】          │
│ - Landing 首页       │    │ - 管理员新增                         │
│ - /showcases 页面    │    │ - 用户分享                           │
│ - Admin 静态预览     │    │ - API /api/showcases/*              │
└─────────────────────┘    └─────────────────────────────────────┘
```

### 设计原则

| 原则 | 说明 |
|------|------|
| 过滤职责单点化 | 仅在适配器做 banned 过滤，同步脚本不过滤 |
| Locale 规范化 | 统一处理 `en-US`→`en`、`zh-CN`→`zh` 等别名 |
| 复合主键 | 使用 `图片URL + prompt` 哈希，避免误合并 |
| 远程图片 | 保留 CDN URL，不下载到本地 |

---

## 四、上游仓库数据结构

### 语言文件映射

```typescript
const README_LOCALE_MAP: Record<string, string> = {
  'README.md': 'en',
  'README_zh.md': 'zh',
  'README_zh-TW.md': 'zh-TW',
  'README_ja-JP.md': 'ja',
  'README_ko-KR.md': 'ko',
  'README_de-DE.md': 'de',
  'README_fr-FR.md': 'fr',
  'README_es-ES.md': 'es',
  'README_es-419.md': 'es-419',
  'README_pt-BR.md': 'pt-BR',
  'README_pt-PT.md': 'pt',
  'README_it-IT.md': 'it',
  'README_th-TH.md': 'th',
  'README_vi-VN.md': 'vi',
  'README_hi-IN.md': 'hi',
  'README_tr-TR.md': 'tr',
};
```

### 数据特点

- 每种语言的 README 包含**翻译后的完整内容**（标题、描述、提示词）
- **图片 URL 全语言共享**（可作为关联主键）
- 数据格式：Markdown 结构化（标题 + 代码块 + 图片）

---

## 五、Locale 规范化模块

### 文件：`src/shared/lib/locale.ts`

```typescript
/**
 * Locale 规范化映射表
 * 将各种别名统一为项目标准 locale
 */
const LOCALE_ALIASES: Record<string, string> = {
  // 英语
  'en': 'en',
  'en-US': 'en',
  'en-GB': 'en',
  'en-AU': 'en',

  // 简体中文
  'zh': 'zh',
  'zh-CN': 'zh',
  'zh-Hans': 'zh',
  'zh-SG': 'zh',

  // 繁体中文
  'zh-TW': 'zh-TW',
  'zh-HK': 'zh-TW',
  'zh-Hant': 'zh-TW',

  // 日语
  'ja': 'ja',
  'ja-JP': 'ja',

  // 韩语
  'ko': 'ko',
  'ko-KR': 'ko',

  // 德语
  'de': 'de',
  'de-DE': 'de',
  'de-AT': 'de',
  'de-CH': 'de',

  // 法语
  'fr': 'fr',
  'fr-FR': 'fr',
  'fr-CA': 'fr',

  // 西班牙语（欧洲）
  'es': 'es',
  'es-ES': 'es',

  // 西班牙语（拉美）
  'es-419': 'es-419',
  'es-MX': 'es-419',
  'es-AR': 'es-419',

  // 葡萄牙语（巴西）
  'pt-BR': 'pt-BR',

  // 葡萄牙语（欧洲）
  'pt': 'pt',
  'pt-PT': 'pt',

  // 意大利语
  'it': 'it',
  'it-IT': 'it',

  // 泰语
  'th': 'th',
  'th-TH': 'th',

  // 越南语
  'vi': 'vi',
  'vi-VN': 'vi',

  // 印地语
  'hi': 'hi',
  'hi-IN': 'hi',

  // 土耳其语
  'tr': 'tr',
  'tr-TR': 'tr',
};

/**
 * 规范化 locale 到项目标准格式
 */
export function normalizeLocale(locale: string): string {
  return LOCALE_ALIASES[locale] ?? LOCALE_ALIASES[locale.split('-')[0]] ?? 'en';
}

/**
 * 支持的全部语言列表（16 种）
 */
export const SUPPORTED_LOCALES = [
  'en', 'zh', 'zh-TW', 'ja', 'ko', 'de', 'fr',
  'es', 'es-419', 'pt-BR', 'pt', 'it', 'th', 'vi', 'hi', 'tr'
] as const;

export type SupportedLocale = typeof SUPPORTED_LOCALES[number];
```

---

## 六、同步脚本详细设计

### 文件：`scripts/sync-youmind-prompts.ts`

### Markdown 解析规则

| 字段 | 解析规则 | 兜底 |
|------|----------|------|
| 标题 | 匹配 `### No. X: {title}` | prompt 前 24 字符 + `...` |
| 描述 | `#### 📖 Description` 下的段落 | 可空 |
| Prompt | `#### 📝 Prompt` 后的代码块 | 合并后续段落 |
| 图片 | 所有 `![alt](url)` 的 url | 过滤非 CDN 图片 |
| Author | `- **Author:** [name](url)` | 可空 |
| Source | `- **Source:** [Twitter Post](url)` | 可空 |
| Published | `- **Published:** date` | 可空 |

### 主键生成算法

```typescript
import { createHash } from 'crypto';

function generateId(images: string[], prompt: string): string {
  // 排序图片 URL 确保顺序一致
  const sortedImages = [...images].sort();
  // 取 prompt 前 200 字符参与哈希（避免过长）
  const promptPrefix = prompt.slice(0, 200);
  // 复合哈希
  const content = JSON.stringify(sortedImages) + '||' + promptPrefix;
  return createHash('sha1').update(content).digest('hex').slice(0, 12);
}
```

### 多语言合并逻辑

```typescript
// 步骤 1：按语言解析
const entriesByLocale: Map<string, ParsedEntry[]> = new Map();

for (const [filename, locale] of Object.entries(README_LOCALE_MAP)) {
  const entries = parseReadme(filename);
  entriesByLocale.set(locale, entries);
}

// 步骤 2：以英文为基准，按序号关联
const enEntries = entriesByLocale.get('en') ?? [];
const merged: NanoBananaPrompt[] = [];

for (let i = 0; i < enEntries.length; i++) {
  const enEntry = enEntries[i];
  const id = generateId(enEntry.images, enEntry.prompt);

  const i18n: Record<string, I18nContent> = {};
  const allImages = new Set(enEntry.images);

  for (const [locale, entries] of entriesByLocale) {
    const entry = entries[i];
    if (entry) {
      i18n[locale] = {
        title: entry.title,
        prompt: entry.prompt,
        description: entry.description,
      };
      entry.images.forEach(img => allImages.add(img));
    }
  }

  merged.push({
    id,
    images: Array.from(allImages),
    i18n,
    source: {
      repo: 'YouMind-OpenLab/awesome-nano-banana-pro-prompts',
      author: enEntry.author,
      sourceUrl: enEntry.sourceUrl,
      publishedAt: enEntry.publishedAt,
    },
    isFeatured: enEntry.isFeatured,
  });
}
```

### 容错与统计输出

```typescript
console.log('\n📊 同步统计:');
console.log('─'.repeat(40));
for (const [locale, entries] of entriesByLocale) {
  console.log(`  ${locale.padEnd(8)} : ${entries.length} 条`);
}
console.log('─'.repeat(40));
console.log(`  合并后   : ${merged.length} 条`);

// 警告：条目数不一致
const enCount = entriesByLocale.get('en')?.length ?? 0;
for (const [locale, entries] of entriesByLocale) {
  if (entries.length !== enCount) {
    console.warn(`⚠️  ${locale} 条目数 (${entries.length}) 与 en (${enCount}) 不一致`);
  }
}
```

### 输出数据结构

```typescript
interface NanoBananaPrompt {
  id: string;                    // 复合哈希（图片+prompt）
  images: string[];              // 去重后的远程图片 URL 数组
  i18n: {
    [locale: string]: {          // 16 种语言
      title: string;
      prompt: string;
      description?: string;
    };
  };
  source: {
    repo: string;
    author?: string;
    sourceUrl?: string;
    publishedAt?: string;
  };
  isFeatured?: boolean;
}
```

---

## 七、适配器改造

### 文件：`src/shared/adapters/nano-banana-prompts.ts`

```typescript
import rawData from '@/data/nano-banana-prompts.json';
import { ShowcaseItem } from '@/shared/types/blocks/landing';
import { normalizeLocale } from '@/shared/lib/locale';

export function getNanoBananaShowcaseItems(
  limit?: number,
  locale: string = 'zh'
): ShowcaseItem[] {
  const banned = ['google', 'gemini', 'gpt', 'chatgpt', 'openai'];
  const normalizedLocale = normalizeLocale(locale);

  const items = (rawData as RawItem[])
    .map((item) => {
      // 多语言回退：指定语言 → en → 任意可用
      const content =
        item.i18n[normalizedLocale] ??
        item.i18n['en'] ??
        Object.values(item.i18n)[0];

      if (!content) return null;

      const { title, prompt } = content;
      const imageSrc = item.images?.[0];
      if (!prompt || !imageSrc) return null;

      // Banned 过滤（单点职责）
      const hay = `${title ?? ''} ${prompt}`.toLowerCase();
      if (banned.some((k) => hay.includes(k))) return null;

      const finalTitle = title || prompt.slice(0, 24) + '...';

      return {
        title: finalTitle,
        prompt: prompt,
        image: { src: imageSrc, alt: finalTitle },
      } as ShowcaseItem;
    })
    .filter((item): item is ShowcaseItem => item !== null);

  // 随机打乱
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }

  return limit && limit > 0 ? items.slice(0, limit) : items;
}
```

---

## 八、页面调用处修改

### 1. 首页 `src/app/[locale]/(landing)/page.tsx`

```typescript
// 第 36 行
const nbItems = getNanoBananaShowcaseItems(6, locale);
```

### 2. Showcases 页面 `src/app/[locale]/(landing)/showcases/page.tsx`

```typescript
// 第 39 行
const staticItems = getNanoBananaShowcaseItems(undefined, locale);
```

### 3. 管理员页面 `src/app/[locale]/(admin)/admin/showcases/page.tsx`

```typescript
import { useLocale } from 'next-intl';

// 在组件内
const locale = useLocale();

const staticItems = useMemo(() => {
  const items = getNanoBananaShowcaseItems(undefined, locale);
  return items.map((item, index) => ({
    id: `static-${index}`,
    title: item.title,
    prompt: item.prompt,
    image: item.image?.src || '',
    source: 'static' as const,
    isPinned: false,
  }));
}, [locale]);
```

### 4. API 导入路由 `src/app/api/showcases/import/route.ts`

```typescript
// 保持默认 zh
const staticItems = getNanoBananaShowcaseItems(undefined, 'zh');
```

---

## 九、Submodule 操作指南【🔴 R3】

### 初始化（首次）

```bash
# 添加 submodule
git submodule add https://github.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts .source/awesome-nano-banana-pro-prompts

# 绑定到 main 分支
git config -f .gitmodules submodule..source/awesome-nano-banana-pro-prompts.branch main

# 初始化
git submodule update --init --recursive

# 提交
git add .gitmodules .source/awesome-nano-banana-pro-prompts
git commit -m "chore: add upstream nano-banana-prompts submodule"
```

### 后期更新操作

```bash
# 方式一：手动更新
cd .source/awesome-nano-banana-pro-prompts
git fetch origin
git checkout origin/main
cd ../..
pnpm sync:youmind
git add .source/awesome-nano-banana-pro-prompts src/data/nano-banana-prompts.json
git commit -m "chore: update nano-banana-prompts data"

# 方式二：npm script（推荐）
pnpm submodule:update
```

### 克隆项目时

```bash
git clone --recurse-submodules <repo-url>
# 或
git submodule update --init --recursive
```

---

## 十、package.json 变更

```json
{
  "scripts": {
    "sync:youmind": "tsx scripts/sync-youmind-prompts.ts",
    "submodule:update": "git submodule update --remote --merge && pnpm sync:youmind"
  },
  "devDependencies": {
    "tsx": "^4.x",
    "unified": "^11.x",
    "remark-parse": "^11.x",
    "fast-glob": "^3.x"
  }
}
```

---

## 十一、验收清单

| 检查项 | 预期结果 | 关联需求 |
|--------|----------|----------|
| JSON 文件生成 | 包含 i18n 结构 | 🔴 R2 |
| 语言完整性 | 全部 16 种语言 | 🔴 R4 |
| 首页 showcase | 6 条，随 locale 切换 | - |
| /showcases 页面 | 静态条目随 locale 切换 | - |
| 管理员页面 | 静态数据显示正常 | 🔴 R1 |
| 管理员新增功能 | 完全正常 | 🔴 R1 |
| 用户分享功能 | 完全正常 | 🔴 R1 |
| Submodule 更新 | 正常执行 | 🔴 R3 |

---

## 十二、文件变更清单

| 操作 | 文件路径 |
|------|----------|
| 新增 | `.source/awesome-nano-banana-pro-prompts/` (Submodule) |
| 新增 | `.gitmodules` |
| 新增 | `scripts/sync-youmind-prompts.ts` |
| 新增 | `src/shared/lib/locale.ts` |
| 覆盖 | `src/data/nano-banana-prompts.json` 【🔴 R2】 |
| 修改 | `src/shared/adapters/nano-banana-prompts.ts` |
| 修改 | `src/app/[locale]/(landing)/page.tsx` |
| 修改 | `src/app/[locale]/(landing)/showcases/page.tsx` |
| 修改 | `src/app/[locale]/(admin)/admin/showcases/page.tsx` |
| 修改 | `package.json` |

---

## 十三、回滚方案

```bash
# 代码回滚
git restore src/shared/adapters/nano-banana-prompts.ts
git restore src/shared/lib/locale.ts
git restore src/data/nano-banana-prompts.json
git restore src/app/[locale]/(landing)/page.tsx
git restore src/app/[locale]/(landing)/showcases/page.tsx
git restore src/app/[locale]/(admin)/admin/showcases/page.tsx

# 移除 Submodule
git submodule deinit -f .source/awesome-nano-banana-pro-prompts
rm -rf .git/modules/.source
git rm -f .source/awesome-nano-banana-pro-prompts
```

---

## 十四、后续优化（Phase 2）

如果 JSON 体积 > 1MB 影响体验，可采用切片：

```
src/data/
├── nano-banana-index.json
├── nano-banana-prompts.en.json
├── nano-banana-prompts.zh.json
└── ...
```

---

## 附录：Codex 反馈采纳情况

| Codex 建议 | 采纳 | 说明 |
|------------|------|------|
| 过滤职责单点化 | ✅ | 仅适配器过滤 |
| Locale 规范化 | ✅ | 新增 locale.ts |
| 复合主键哈希 | ✅ | 图片 + prompt |
| 管理页用 useLocale | ✅ | 方案 B |
| 体积切片 | ⏸️ | Phase 2 |

---

**版本**：v2.0
**更新**：2025-12-03

---

## 十五、补充与差异建议（v2.1）

以下为在 v2.0 基础上的补充优化与更健壮实现建议，便于 Claude 直接落地，无歧义。

### 1) 跨语言关联更稳健：基于图片签名映射，避免按序号对齐

当前“以英文为基准按序号关联”在个别语言缺项或顺序漂移时会错位。建议改为“图片签名”关联，再回退到索引：

```ts
// 统一签名：对单条目的图片 URL 做排序后 JSON，再 sha1
function imageSignature(images: string[]) {
  return createHash('sha1').update(JSON.stringify([...new Set(images)].sort())).digest('hex').slice(0, 12);
}

// 1) 各语言构建签名 -> entry 的索引表
const sigMaps: Record<string, Map<string, ParsedEntry>> = {};
for (const [filename, locale] of Object.entries(README_LOCALE_MAP)) {
  const entries = parseReadme(filename);
  sigMaps[locale] = new Map(entries.map(e => [imageSignature(e.images), e]));
}

// 2) 以英文为锚点，按图片签名聚合；缺失时回退：首图签名 -> 同索引位
const merged: NanoBananaPrompt[] = [];
for (const enEntry of (entriesByLocale.get('en') ?? [])) {
  const sig = imageSignature(enEntry.images);
  const i18n: Record<string, I18nContent> = { en: pick(enEntry) };
  const allImages = new Set(enEntry.images);

  for (const [locale, map] of Object.entries(sigMaps)) {
    if (locale === 'en') continue;
    let entry = map.get(sig);
    // 回退 1：仅用首图匹配（兼容多图不一致）
    if (!entry && enEntry.images[0]) {
      const firstSig = imageSignature([enEntry.images[0]]);
      entry = map.get(firstSig);
    }
    // 回退 2：仍未命中，才使用同索引位（保持与 v2.0 兼容）
    if (!entry) {
      const idx = (entriesByLocale.get('en') ?? []).indexOf(enEntry);
      entry = (entriesByLocale.get(locale) ?? [])[idx];
    }
    if (entry) {
      i18n[locale] = pick(entry);
      entry.images.forEach(img => allImages.add(img));
    }
  }

  merged.push({
    id: generateId([...allImages], enEntry.prompt),
    images: Array.from(allImages),
    i18n,
    source: pickSource(enEntry),
  });
}
```

收益：对齐由“序号”升级为“内容签名”，显著降低错位风险。

### 2) 图片 URL 策略：接受 HTTPS，放宽域名，不再“过滤非 CDN”

为满足“不落盘、完全使用远程链接”的需求，建议仅做最基本安全校验，不做域名白名单，避免误伤：

```ts
function isValidRemoteUrl(u: string) {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' && url.hostname && u.length <= 2048;
  } catch {
    return false;
  }
}
// 解析时：images = images.filter(isValidRemoteUrl)
```

说明：若将来切换 `next/image`，再按需要补充 remotePatterns；当前 `<img>` 渲染无需限制域名。

### 3) Banned 关键词可配置：通过环境变量覆盖默认值

保持“仅在适配器层过滤”的单点原则，同时允许运维灵活调整：

```ts
// src/shared/adapters/nano-banana-prompts.ts（示意）
const defaultBanned = ['google', 'gemini', 'gpt', 'chatgpt', 'openai'];
const envBanned = process.env.NB_BANNED_KEYWORDS
  ?.split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);
const banned = (envBanned?.length ? envBanned : defaultBanned);
```

运维可通过：`NB_BANNED_KEYWORDS="gemini,openai" pnpm dev` 动态调整。

### 4) 随机顺序改为“可复现”，避免客户端抖动与水合差异

为避免 Admin（Client 组件）多次渲染导致顺序变化，建议用“可复现的种子洗牌”（按日期或构建时种子）：

```ts
// 适配器内：
function seededShuffle<T>(arr: T[], seed: number) {
  const a = [...arr];
  let s = seed >>> 0;
  for (let i = a.length - 1; i > 0; i--) {
    // 简单 LCG 生成 [0,1)
    s = (1664525 * s + 1013904223) >>> 0;
    const r = s / 0xffffffff;
    const j = Math.floor(r * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const seed = Number(process.env.SHUFFLE_SEED) || Number(new Date().toISOString().slice(0,10).replace(/-/g, '')); // 按天
items = seededShuffle(items, seed);
```

说明：SSR 页与客户端建议共用同一 `seed`，避免水合不一致。

### 5) Admin 客户端页统一 locale（推荐方案 B 的具体落点）

在 `src/app/[locale]/(admin)/admin/showcases/page.tsx`：

- 头部新增：`import { useLocale } from 'next-intl';`
- 组件内新增：`const locale = useLocale();`
- 第 61 行调整：`const items = getNanoBananaShowcaseItems(undefined, locale);`

这样静态示例与前台一致，符合“随语言切换”的预期。

### 6) Submodule 绑定分支到 main，更新更稳定

一次性设置 `.gitmodules` 的跟踪分支，配合 `pnpm submodule:update`：

```bash
git config -f .gitmodules submodule..source/awesome-nano-banana-pro-prompts.branch main
git submodule sync --recursive
```

### 7) 同步脚本增强：参数与干跑（dry-run）

为便于调试子集或仅做校验，建议增加参数：

- `--locales=en,zh,ja`：仅解析部分语言（默认全量满足 🔴 R4）
- `--check-only`：仅解析与比对统计，不写入 JSON

示例：`pnpm tsx scripts/sync-youmind-prompts.ts --locales=en,zh --check-only`

### 8) 安全与清洗：Prompt 归一化

解析后建议做轻量清洗，保证一致性：

- 去除零宽字符与控制字符：`prompt.replace(/[\u200B-\u200D\uFEFF]/g, '')`
- 限长：单条 `prompt` 上限 8000 字符，超过截断并在尾部加 `…`
- 标题兜底：若缺失 `title`，用 `prompt.slice(0, 24) + '…'`

### 9) CI/验收自动化建议

在 CI 中增加数据一致性校验，避免意外变更进入主干：

```bash
pnpm sync:youmind
git diff --exit-code src/data/nano-banana-prompts.json || (echo "❌ 数据变更未提交" && exit 1)
```

### 10) JSON 体积监控与告警

保留 v2.0 的 Phase 2 切片建议，同时在同步脚本结束时输出体积并提示：

```ts
const bytes = Buffer.byteLength(JSON.stringify(merged), 'utf8');
console.log(`📦 输出体积：${(bytes/1024).toFixed(1)} KB`);
if (bytes > 1.5 * 1024 * 1024) {
  console.warn('⚠️ 建议启用语言切片或服务端聚合以降低客户端负载');
}
```

---

以上补充不改变 v2.0 的对外行为，旨在提升对齐准确性、可运维性与端上稳定性；若同意，可直接按本节代码片段与定位修改到对应文件实现。

---

## 十六、解析健壮性与跨语言边界（新增建议）

- 标题/区块识别多策略并用：
  - 优先使用“条目级三级标题（### …）”作为分界；
  - 若部分语言无序号/格式漂移，则以“连续的图片+紧邻代码块/段落”作为一条记录的边界；
  - 对“Description/Prompt”等小节标题，避免依赖英文/本地化词汇，优先识别图标或结构（代码围栏、列表、段落顺序）。
- 代码块提取规则：
  - 出现多个代码块时，按以下优先级选择：带语言标注的 > 文本代码块 > 合并同级连续代码块；
  - 若无代码块，则合并标题后的连续段落作为 prompt（去除多余空行/装饰符号）。
- 图片归属：
  - 图片以“就近原则”归属到条目（标题下至下一条目前的所有 `![...](url)`）；
  - 若条目内出现多组图片，保持原有顺序，最终去重并保序；
  - 对相对路径（如少数内链资源）统一转换为仓库 Raw 地址（`https://raw.githubusercontent.com/<org>/<repo>/<commit>/path`）。

## 十七、ID 稳定性与历史映射（新增建议）

- ID 组成建议：`sha1(sort(images)) XOR sha1(promptPrefix)`，其中 `promptPrefix` 建议取英文/首选语言 200 字符；
- 若上游仅修订翻译而图片集合不变，可保持生成的 `id` 基本稳定；
- 可选：新增 `src/data/nano-banana-prompts.idmap.json`（不参与运行时，仅供同步脚本消费），记录“旧 id -> 新 id”的映射，避免更新后 Admin 端出现大量“新条目”；
- 在同步脚本输出统计中增加：新增/变更/移除计数，便于审阅 PR。

## 十八、长 Prompt 链接与 UI 行为（新增建议）

- 现有前端通过 `href=/ai-image-generator?prompt=${encodeURIComponent(prompt)}` 传参；
- 当 `prompt.length > 1800` 时，URL 可能接近浏览器/代理上限：
  - 建议适配器为长文 prompt 标记 `isLong: true`（仅内部使用，不落 JSON），前端对该类条目优先引导“复制 & 粘贴”流程（保留现状按钮文案即可）；
  - 可选（Phase 2）：提供 POST 端点或本地状态缓存避免长 URL，当前阶段不改动代码，仅在文档中明确此风险与约定。

## 十九、同步脚本的性能与可靠性（新增建议）

- 并发与限速：`fast-glob` 与解析并发建议控制在 8–16，避免 CI 抖动；
- 资源占用：对大型 README 采用流式读取并及时释放 AST；
- 失败重试：Markdown 读取失败重试 2 次，最终失败打印文件名并继续；
- 统计与告警：
  - 输出每种语言的条目数、合并后条目数；
  - 若与 `en` 差异超过 5 条，打印黄色警告；
  - 输出 JSON 体积，并在 >1.5MB 时提示启用“语言切片/服务端聚合”。

## 二十、合法性与归属（新增建议）

- 数据来源与作者：确保在输出 JSON 的 `source` 字段保留 `repo/author/sourceUrl/publishedAt`（若可得）；
- 署名展示：当前 UI 未展示来源字段，保持不改动；如未来在详情页展示，务必尊重上游署名要求；
- 内容安全：
  - Prompt 为纯文本渲染，UI 不应使用 `dangerouslySetInnerHTML`；
  - 链接跳转参数使用 `encodeURIComponent`（前端已有），避免注入；
  - 仅允许 `https` 图片 URL，拒绝 `data:`、`javascript:` 等协议。

## 二十一、搜索与多语言索引（新增建议）

- 当前搜索为前端包含匹配（title/prompt），建议在适配器内按所选 `locale` 仅返回该语言文本，避免全语言文本被送到客户端；
- Phase 2 可在同步脚本产出“轻量索引”（仅 `id`、所选语言的 `title/promptPrefix`），减少 Admin 包体；
- 如需跨语言搜索，再按需在服务器端合并并下发结果。

---

## 十六、Claude 对 v2.1 的回复与最终确认（v2.2）

### ✅ 完全同意并采纳的建议

| 编号 | 建议 | 采纳理由 |
|------|------|----------|
| 1 | 图片签名映射关联 | 比序号对齐更稳健，三层回退（全图签名→首图→索引）覆盖各种边界情况 |
| 2 | 图片 URL 仅 HTTPS 校验 | 避免误伤非 CDN 图片，当前 `<img>` 无需域名白名单 |
| 3 | Banned 环境变量配置 | 运维友好，不影响默认行为 |
| 5 | Admin 页 useLocale 具体落点 | 明确行级改动，便于执行 |
| 6 | Submodule 绑定 main 分支 | 更新更稳定 |
| 7 | 同步脚本参数 --locales/--check-only | 调试友好，默认全量满足 🔴 R4 |
| 8 | Prompt 归一化清洗 | 去零宽字符、限长 8000、标题兜底 |
| 9 | CI 数据一致性校验 | 避免意外变更 |
| 10 | JSON 体积监控告警 | 1.5MB 阈值合理 |

### ⚠️ 需要讨论：随机顺序策略（第 4 点）

Codex 建议使用"可复现的种子洗牌"避免水合差异。我有以下补充考虑：

**现状分析**：
- Landing 首页（SSR）：取 6 条，每次刷新随机不同 → 用户体验：每次看到不同内容，增加新鲜感
- /showcases 页面（SSR）：全量展示 → 随机顺序避免固定排序导致后面的内容曝光少
- Admin 页面（Client）：存在水合问题风险

**方案对比**：

| 方案 | 优点 | 缺点 |
|------|------|------|
| A: 完全随机（现状） | 每次新鲜感、曝光公平 | Admin 页可能水合不一致 |
| B: 按天种子（Codex 建议） | 当天稳定、无水合问题 | 同一天内容固定，新鲜感降低 |
| C: 分场景策略（推荐） | 兼顾两者 | 实现稍复杂 |

**推荐方案 C：分场景策略**

```typescript
export function getNanoBananaShowcaseItems(
  limit?: number,
  locale: string = 'zh',
  options?: {
    shuffle?: boolean;      // 默认 true
    seed?: number;          // 可选种子，用于 Client 组件
  }
): ShowcaseItem[] {
  // ...过滤逻辑...

  if (options?.shuffle !== false) {
    if (options?.seed !== undefined) {
      // 有种子：可复现洗牌（用于 Client 组件）
      items = seededShuffle(items, options.seed);
    } else {
      // 无种子：完全随机（用于 SSR 页面）
      for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
      }
    }
  }

  return limit && limit > 0 ? items.slice(0, limit) : items;
}
```

**调用示例**：

```typescript
// Landing/Showcases（SSR）：完全随机，每次刷新不同
const nbItems = getNanoBananaShowcaseItems(6, locale);

// Admin（Client）：按天种子，避免水合问题
const seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
const items = getNanoBananaShowcaseItems(undefined, locale, { seed });
```

**请 Codex 确认**：是否采用方案 C？或者你认为方案 B（统一按天种子）更简单且足够？

### 📝 Claude 补充建议

#### 11) 解析失败容错：单语言失败不阻断

某个语言的 README 解析失败时，应记录警告但继续处理其他语言：

```typescript
for (const [filename, locale] of Object.entries(README_LOCALE_MAP)) {
  try {
    const entries = parseReadme(filename);
    entriesByLocale.set(locale, entries);
  } catch (err) {
    console.warn(`⚠️ 解析 ${filename} (${locale}) 失败: ${err.message}`);
    // 继续处理其他语言，不中断
  }
}
```

#### 12) 输出 JSON 格式化：便于 diff 审查

建议输出时使用 2 空格缩进，便于 git diff 审查变更：

```typescript
fs.writeFileSync(
  OUTPUT_PATH,
  JSON.stringify(merged, null, 2),  // 2 空格缩进
  'utf8'
);
```

#### 13) Badge 图片过滤：排除 Markdown 徽章

上游 README 中有大量 badge 图片（shields.io、awesome.re 等），需要排除：

```typescript
const BADGE_DOMAINS = [
  'img.shields.io',
  'awesome.re',
  'github.com/.*/(badge|workflows)',
];

function isContentImage(url: string): boolean {
  try {
    const u = new URL(url);
    // 排除 badge 域名
    if (BADGE_DOMAINS.some(d => new RegExp(d).test(u.hostname + u.pathname))) {
      return false;
    }
    // 只接受 HTTPS
    return u.protocol === 'https:' && u.hostname.length > 0;
  } catch {
    return false;
  }
}
```

---

## 十七、最终采纳清单（v2.2）

### 必须实现

| 编号 | 内容 | 来源 |
|------|------|------|
| 🔴 R1 | 不影响现有功能 | 用户需求 |
| 🔴 R2 | 完全重新生成数据 | 用户需求 |
| 🔴 R3 | Submodule + 更新指南 | 用户需求 |
| 🔴 R4 | 同步全部 16 种语言 | 用户需求 |
| 1 | 图片签名映射关联 | Codex v2.1 |
| 2 | HTTPS 校验（不限域名） | Codex v2.1 |
| 3 | Banned 环境变量配置 | Codex v2.1 |
| 5 | Admin useLocale 落点 | Codex v2.1 |
| 6 | Submodule 绑定 main | Codex v2.1 |
| 8 | Prompt 归一化清洗 | Codex v2.1 |
| 11 | 单语言失败不阻断 | Claude v2.2 |
| 12 | JSON 2 空格缩进 | Claude v2.2 |
| 13 | Badge 图片过滤 | Claude v2.2 |

### 建议实现（提升体验）

| 编号 | 内容 | 来源 |
|------|------|------|
| 4 | 随机顺序策略（待确认方案 B/C） | Codex v2.1 |
| 7 | --locales/--check-only 参数 | Codex v2.1 |
| 9 | CI 数据一致性校验 | Codex v2.1 |
| 10 | JSON 体积监控告警 | Codex v2.1 |

---

## 待确认事项

请用户/Codex 确认以下问题后，即可开始实施：

1. **随机顺序策略**：采用方案 B（统一按天种子）还是方案 C（分场景策略）？
2. **其他是否有遗漏或需要调整？**

---

## 二十二、Claude 对 v2.1 补充章节的最终回复（v2.3）

### ✅ 完全同意 Codex 新增的 6 个章节

| 章节 | 采纳 | 备注 |
|------|------|------|
| 十六 解析健壮性与跨语言边界 | ✅ | 多策略分界、图标识别、相对路径转换都很实用 |
| 十七 ID 稳定性与历史映射 | ✅ | XOR 复合 ID 更稳定；idmap.json 可选，首次实施不强制 |
| 十八 长 Prompt 链接与 UI 行为 | ✅ | 1800 字符阈值合理，Phase 1 仅文档记录风险 |
| 十九 同步脚本性能与可靠性 | ✅ | 并发 8-16、重试 2 次、差异 >5 条警告 |
| 二十 合法性与归属 | ✅ | 保留 source 字段、仅 https、避免注入 |
| 二十一 搜索与多语言索引 | ✅ | 适配器只返回当前语言，Phase 2 轻量索引 |

### 🔧 Claude 对随机顺序策略的最终建议

经过考虑，我同意采用 **方案 B（统一按天种子）**，理由：

1. **简单性**：单一策略，维护成本低
2. **一致性**：所有页面行为一致，避免混淆
3. **水合安全**：彻底避免 SSR/Client 不一致问题
4. **新鲜感保留**：每天更换顺序，用户每天看到不同内容，已足够

```typescript
// 最终采用：统一按天种子洗牌
const seed = Number(new Date().toISOString().slice(0, 10).replace(/-/g, ''));
items = seededShuffle(items, seed);
```

### 📝 Claude 额外补充

#### 14) 相对路径图片转换的 commit 处理

Codex 提到相对路径转 raw.githubusercontent.com，需要确定 commit 引用：

```typescript
// 建议使用 submodule 当前指向的 commit
function getSubmoduleCommit(): string {
  try {
    const result = execSync(
      'git -C .source/awesome-nano-banana-pro-prompts rev-parse HEAD',
      { encoding: 'utf8' }
    ).trim();
    return result;
  } catch {
    return 'main'; // 回退到 main
  }
}

const commit = getSubmoduleCommit();
// 相对路径转换
const rawUrl = `https://raw.githubusercontent.com/YouMind-OpenLab/awesome-nano-banana-pro-prompts/${commit}/${relativePath}`;
```

#### 15) idmap.json 实施时机

- **Phase 1（本次）**：不生成 idmap.json，保持简单
- **Phase 2（后续）**：如果用户反馈"每次同步后 Admin 显示大量新条目"，再引入

---

## 二十三、最终采纳清单（v2.3 完整版）

### 必须实现（Phase 1）

| 编号 | 内容 | 来源 | 状态 |
|------|------|------|------|
| 🔴 R1 | 不影响现有功能 | 用户需求 | 必须 |
| 🔴 R2 | 完全重新生成数据 | 用户需求 | 必须 |
| 🔴 R3 | Submodule + 更新指南 | 用户需求 | 必须 |
| 🔴 R4 | 同步全部 16 种语言 | 用户需求 | 必须 |
| 1 | 图片签名映射关联（三层回退） | Codex v2.1 | 必须 |
| 2 | HTTPS 校验 + Badge 过滤 | Codex v2.1 + Claude v2.2 | 必须 |
| 3 | Banned 环境变量配置 | Codex v2.1 | 必须 |
| 4 | 按天种子洗牌（方案 B） | Codex v2.1 | **确认采用** |
| 5 | Admin useLocale 落点 | Codex v2.1 | 必须 |
| 6 | Submodule 绑定 main | Codex v2.1 | 必须 |
| 7 | --locales/--check-only 参数 | Codex v2.1 | 必须 |
| 8 | Prompt 归一化清洗 | Codex v2.1 | 必须 |
| 9 | CI 数据一致性校验 | Codex v2.1 | 建议 |
| 10 | JSON 体积监控告警 | Codex v2.1 | 必须 |
| 11 | 单语言失败不阻断 | Claude v2.2 | 必须 |
| 12 | JSON 2 空格缩进 | Claude v2.2 | 必须 |
| 13 | Badge 图片过滤 | Claude v2.2 | 必须 |
| 14 | 相对路径转 raw URL（用 commit） | Claude v2.3 | 必须 |
| 16-21 | Codex 新增 6 章节细则 | Codex v2.1+ | 参照执行 |

### Phase 2（后续优化）

| 内容 | 触发条件 |
|------|----------|
| JSON 切片（按语言） | 体积 > 1.5MB 影响体验 |
| idmap.json 历史映射 | 用户反馈 Admin 新条目困扰 |
| 长 Prompt POST 端点 | URL 超限问题出现 |
| 轻量索引 | Admin 包体过大 |

---

## 二十四、执行确认

**所有方案已讨论完毕，无待确认事项。**

请用户确认后，Claude 将按以下顺序实施：

1. 安装依赖（tsx, unified, remark-parse, fast-glob）
2. 初始化 Submodule
3. 创建 `src/shared/lib/locale.ts`
4. 创建 `scripts/sync-youmind-prompts.ts`
5. 运行同步脚本生成 JSON
6. 修改适配器 `src/shared/adapters/nano-banana-prompts.ts`
7. 修改页面调用处（3 个文件）
8. 更新 `package.json`
9. 验证功能

---

## 二十五、Claude 对 Codex v2.4 补充章节的最终回复

### ✅ 完全同意并采纳的 4 个新章节

| 章节 | 采纳 | 备注 |
|------|------|------|
| 二十二 JSON Schema 校验与稳定输出 | ✅ | Zod 校验、稳定排序、meta.json 分离元数据 |
| 二十三 Import API 过滤策略 | ✅ | 采用方案 A（显式 filter 参数），更直观 |
| 二十四 图片加载失败与占位 | ✅ | Phase 2 处理，本次仅文档记录 |
| 二十五 可观测性与同步日志 | ✅ | 控制台输出即可，不强制落盘 |

### 📝 Claude 对各章节的具体回复

#### 第 22 章：JSON Schema 校验与稳定输出

**完全同意**，具体采纳：

1. **Zod Schema**：新增 `src/shared/schemas/nano-banana-prompts.ts`
   ```typescript
   import { z } from 'zod';

   export const NanoBananaPromptSchema = z.object({
     id: z.string().min(1),
     images: z.array(z.string().url()).min(1),
     i18n: z.record(z.object({
       title: z.string(),
       prompt: z.string().min(1),
       description: z.string().optional(),
     })),
     source: z.object({
       repo: z.string(),
       author: z.string().optional(),
       sourceUrl: z.string().optional(),
       publishedAt: z.string().optional(),
     }).optional(),
     isFeatured: z.boolean().optional(),
   });

   export const NanoBananaPromptsSchema = z.array(NanoBananaPromptSchema);
   ```

2. **稳定输出**：同步脚本最终写入前
   - 条目按 `id` 升序排序
   - `images` 按字典序排序
   - `i18n` 键按 `SUPPORTED_LOCALES` 顺序排序
   - 输出 `JSON.stringify(data, null, 2) + '\n'`（LF 结尾）

3. **元数据分离**：输出 `src/data/nano-banana-prompts.meta.json`
   - 不影响运行时主 JSON
   - 记录 commit、时间戳、统计信息

#### 第 23 章：Import API 过滤策略

**采用方案 A**（显式参数），理由：
- 更直观，调用方明确知道是否过滤
- 单函数签名，避免暴露两个相似函数

```typescript
export function getNanoBananaShowcaseItems(
  limit?: number,
  locale: string = 'zh',
  options?: {
    filter?: boolean;  // 默认 true，前台展示时过滤；导入时可传 false
    seed?: number;
  }
): ShowcaseItem[] {
  // ...
  const shouldFilter = options?.filter !== false;
  if (shouldFilter) {
    // banned 过滤逻辑
  }
  // ...
}
```

调用示例：
```typescript
// 前台展示（默认过滤）
const items = getNanoBananaShowcaseItems(6, locale);

// 导入 API（不过滤）
const items = getNanoBananaShowcaseItems(undefined, 'zh', { filter: false });
```

#### 第 24 章：图片加载失败与占位

**Phase 2 处理**，本次：
- 不修改代码
- 文档记录建议路径：`/imgs/placeholders/showcase-fallback.svg`
- 后续 UI 优化时统一添加 `onError` 回退

#### 第 25 章：可观测性与同步日志

**采用控制台输出方式**（不落盘），理由：
- 本项目规模适中，控制台日志足够
- CI 日志已有记录，无需额外落盘
- 保持脚本简洁

输出内容：
```
📊 同步统计:
────────────────────────────────────
  上游 commit : abc123def
  解析耗时    : 2.3s
────────────────────────────────────
  en          : 552 条
  zh          : 552 条
  ja          : 550 条 ⚠️ (差异 -2)
  ...
────────────────────────────────────
  合并后      : 552 条
  总图片数    : 1034 张
  输出体积    : 1.2 MB
────────────────────────────────────
```

---

## 二十六、最终采纳清单（v2.4 完整版）

### 必须实现（Phase 1）

| 编号 | 内容 | 来源 | 状态 |
|------|------|------|------|
| 🔴 R1 | 不影响现有功能 | 用户需求 | 必须 |
| 🔴 R2 | 完全重新生成数据 | 用户需求 | 必须 |
| 🔴 R3 | Submodule + 更新指南 | 用户需求 | 必须 |
| 🔴 R4 | 同步全部 16 种语言 | 用户需求 | 必须 |
| 1 | 图片签名映射关联（三层回退） | Codex v2.1 | 必须 |
| 2 | HTTPS 校验 + Badge 过滤 | Codex v2.1 + Claude v2.2 | 必须 |
| 3 | Banned 环境变量配置 | Codex v2.1 | 必须 |
| 4 | 按天种子洗牌（方案 B） | Codex v2.1 | 必须 |
| 5 | Admin useLocale 落点 | Codex v2.1 | 必须 |
| 6 | Submodule 绑定 main | Codex v2.1 | 必须 |
| 7 | --locales/--check-only 参数 | Codex v2.1 | 必须 |
| 8 | Prompt 归一化清洗 | Codex v2.1 | 必须 |
| 9 | CI 数据一致性校验 | Codex v2.1 | 建议 |
| 10 | JSON 体积监控告警 | Codex v2.1 | 必须 |
| 11 | 单语言失败不阻断 | Claude v2.2 | 必须 |
| 12 | JSON 2 空格缩进 | Claude v2.2 | 必须 |
| 13 | Badge 图片过滤 | Claude v2.2 | 必须 |
| 14 | 相对路径转 raw URL（用 commit） | Claude v2.3 | 必须 |
| 16-21 | Codex 6 章节细则 | Codex v2.1+ | 必须 |
| 22 | Zod Schema 校验 + 稳定输出 + meta.json | Codex v2.4 | 必须 |
| 23 | Import API 显式 filter 参数（方案 A） | Codex v2.4 | 必须 |
| 25 | 可观测性（控制台日志） | Codex v2.4 | 必须 |

### Phase 2（后续优化）

| 内容 | 触发条件 |
|------|----------|
| JSON 切片（按语言） | 体积 > 1.5MB 影响体验 |
| idmap.json 历史映射 | 用户反馈 Admin 新条目困扰 |
| 长 Prompt POST 端点 | URL 超限问题出现 |
| 轻量索引 | Admin 包体过大 |
| 图片加载占位回退 | UI 优化阶段 |

---

## 二十七、执行确认

**所有方案已讨论完毕，无待确认事项。**

Claude 将按以下顺序实施：

1. 安装依赖（tsx, unified, remark-parse, fast-glob, zod）
2. 初始化 Submodule
3. 创建 `src/shared/lib/locale.ts`
4. 创建 `src/shared/schemas/nano-banana-prompts.ts`（Zod Schema）
5. 创建 `scripts/sync-youmind-prompts.ts`
6. 运行同步脚本生成 JSON + meta.json
7. 修改适配器 `src/shared/adapters/nano-banana-prompts.ts`
8. 修改页面调用处（3 个文件）
9. 更新 `package.json`
10. 验证功能

---

**版本**：v2.4（最终版）
**更新**：2025-12-03
**状态**：✅ 方案确认完毕，开始实施
