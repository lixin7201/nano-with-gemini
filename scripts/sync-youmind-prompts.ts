import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { execSync } from 'child_process';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import glob from 'fast-glob';
import { parseArgs } from 'util';

// --- Types ---

interface NanoBananaPrompt {
  id: string;
  images: string[];
  i18n: {
    [locale: string]: {
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

interface ParsedEntry {
  title: string;
  prompt: string;
  description?: string;
  images: string[];
  author?: string;
  sourceUrl?: string;
  publishedAt?: string;
  isFeatured?: boolean;
}

interface I18nContent {
  title: string;
  prompt: string;
  description?: string;
}

// --- Configuration ---

const REPO_ROOT = path.resolve(__dirname, '..');
const SUBMODULE_DIR = path.join(REPO_ROOT, '.source/awesome-nano-banana-pro-prompts');
const OUTPUT_FILE = path.join(REPO_ROOT, 'src/data/nano-banana-prompts.json');

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

// --- Helpers ---

function imageSignature(images: string[]) {
  return createHash('sha1').update(JSON.stringify([...new Set(images)].sort())).digest('hex').slice(0, 12);
}

function generateId(images: string[], prompt: string): string {
  const sortedImages = [...images].sort();
  const promptPrefix = prompt.slice(0, 200);
  // v2.1: ID 组成建议：sha1(sort(images)) XOR sha1(promptPrefix) -> 简化为复合哈希
  const content = JSON.stringify(sortedImages) + '||' + promptPrefix;
  return createHash('sha1').update(content).digest('hex').slice(0, 12);
}

function isValidRemoteUrl(u: string) {
  try {
    const url = new URL(u);
    return url.protocol === 'https:' && url.hostname && u.length <= 2048;
  } catch {
    return false;
  }
}

function cleanPrompt(prompt: string): string {
  // v2.1: 去除零宽字符与控制字符
  let cleaned = prompt.replace(/[\u200B-\u200D\uFEFF]/g, '');
  // v2.1: 限长 8000
  if (cleaned.length > 8000) {
    cleaned = cleaned.slice(0, 8000) + '...';
  }
  return cleaned;
}

function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const ret: any = {};
  keys.forEach(key => {
    ret[key] = obj[key];
  });
  return ret;
}

function pickI18n(entry: ParsedEntry): I18nContent {
  return {
    title: entry.title || cleanPrompt(entry.prompt).slice(0, 24) + '...',
    prompt: cleanPrompt(entry.prompt),
    description: entry.description,
  };
}

function pickSource(entry: ParsedEntry) {
  return {
    repo: 'YouMind-OpenLab/awesome-nano-banana-pro-prompts',
    author: entry.author,
    sourceUrl: entry.sourceUrl,
    publishedAt: entry.publishedAt,
  };
}

// --- Parser ---

function parseReadme(filename: string): ParsedEntry[] {
  const filePath = path.join(SUBMODULE_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  File not found: ${filename}`);
    return [];
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const tree = unified().use(remarkParse).parse(content);
  
  const entries: ParsedEntry[] = [];
  let currentEntry: Partial<ParsedEntry> | null = null;

  // 简单的状态机解析
  // 假设结构是：
  // ### No. X: Title
  // #### 📖 Description
  // ...
  // #### 📝 Prompt
  // ```
  // ...
  // ```
  // ![img](url)
  // - **Author:** ...

  visit(tree, (node: any) => {
    if (node.type === 'heading' && node.depth === 3) {
      // New entry start
      if (currentEntry && currentEntry.prompt && currentEntry.images && currentEntry.images.length > 0) {
        entries.push(currentEntry as ParsedEntry);
      }
      
      const titleText = node.children.map((c: any) => c.value).join('');
      // Match "No. X: Title"
      const match = titleText.match(/No\.\s*\d+:\s*(.+)/);
      const title = match ? match[1].trim() : titleText;

      currentEntry = {
        title,
        images: [],
        prompt: '',
      };
    } else if (currentEntry) {
        // Extract images
        if (node.type === 'image') {
            if (isValidRemoteUrl(node.url) && !node.url.includes('img.shields.io') && !node.url.includes('badge')) {
                currentEntry.images = currentEntry.images || [];
                currentEntry.images.push(node.url);
            }
        }
        
        // Extract HTML images
        if (node.type === 'html') {
            const imgMatch = node.value.match(/<img[^>]+src="([^"]+)"/);
            if (imgMatch && imgMatch[1]) {
                const url = imgMatch[1];
                if (isValidRemoteUrl(url) && !url.includes('img.shields.io') && !url.includes('badge')) {
                    currentEntry.images = currentEntry.images || [];
                    currentEntry.images.push(url);
                }
            }
        }
        
        // Extract prompt code block
        if (node.type === 'code') {
            // If we haven't found a prompt yet, or this looks like the main prompt
            if (!currentEntry.prompt) {
                currentEntry.prompt = node.value;
            }
        }

        // Extract Description (simplified)
        // This is tricky with AST traversal without context, but let's try to capture text under "Description" heading
        // For now, we might skip complex description parsing if not strictly required or use a simpler regex approach for the whole file if AST is too complex for this structure.
        // Let's stick to a simpler regex-based approach for specific fields if AST is hard to track context.
        // Actually, let's use the AST for structure but maybe refine how we capture data.
        
        // Let's try to capture metadata from list items
        if (node.type === 'listItem') {
            const text = node.children.map((p: any) => p.children?.map((c: any) => c.value).join('')).join('');
            if (text.includes('Author:')) {
                const match = text.match(/Author:\*\*?\s*\[?([^\]]+)\]?/);
                if (match) currentEntry.author = match[1];
            }
            if (text.includes('Source:')) {
                 const match = text.match(/\((https?:\/\/[^)]+)\)/);
                 if (match) currentEntry.sourceUrl = match[1];
            }
             if (text.includes('Published:')) {
                 const match = text.match(/Published:\*\*?\s*(.+)/);
                 if (match) currentEntry.publishedAt = match[1];
            }
        }
    }
  });

  // Push last entry
  if (currentEntry) {
    const entry = currentEntry as ParsedEntry;
    if (entry.prompt && entry.images && entry.images.length > 0) {
      entries.push(entry);
    }
  }

  return entries;
}


// --- Main ---

async function main() {
  const { values } = parseArgs({
    args: process.argv.slice(2),
    options: {
      locales: { type: 'string' },
      'check-only': { type: 'boolean' },
    },
  });

  const targetLocales = values.locales
    ? values.locales.split(',').map(s => s.trim())
    : Object.values(README_LOCALE_MAP); // Default to all

  console.log(`🚀 Starting sync for locales: ${targetLocales.join(', ')}`);

  // 1. Parse all requested locales
  const entriesByLocale: Map<string, ParsedEntry[]> = new Map();
  const sigMaps: Record<string, Map<string, ParsedEntry>> = {};

  for (const [filename, locale] of Object.entries(README_LOCALE_MAP)) {
    if (!targetLocales.includes(locale)) continue;
    
    console.log(`Parsing ${locale} (${filename})...`);
    const entries = parseReadme(filename);
    entriesByLocale.set(locale, entries);
    
    // Build signature map
    sigMaps[locale] = new Map(entries.map(e => [imageSignature(e.images), e]));
  }

  // 2. Merge logic (v2.2): union-of-signatures across locales
  // Build union set of all signatures from all target locales
  const allSigs = new Set<string>();
  for (const locale of targetLocales) {
    const m = sigMaps[locale];
    if (!m) continue;
    for (const k of m.keys()) allSigs.add(k);
  }

  // Priority locales to pick baseline when 'en' is missing
  const baselinePriority = ['en', 'zh', 'ja', 'ko', 'de', 'fr', 'es', 'es-419', 'pt-BR', 'pt', 'it', 'th', 'vi', 'hi', 'tr'];

  const merged: NanoBananaPrompt[] = [];

  for (const sig of allSigs) {
    // Pick baseline entry by priority
    let baseline: { entry: ParsedEntry; locale: string } | null = null;
    for (const loc of baselinePriority) {
      if (!targetLocales.includes(loc)) continue;
      const ent = sigMaps[loc]?.get(sig);
      if (ent) { baseline = { entry: ent, locale: loc }; break; }
    }
    if (!baseline) {
      for (const loc of targetLocales) {
        const ent = sigMaps[loc]?.get(sig);
        if (ent) { baseline = { entry: ent, locale: loc }; break; }
      }
    }
    if (!baseline) continue;

    const { entry: baseEntry } = baseline;
    const i18n: Record<string, I18nContent> = {};
    const allImages = new Set(baseEntry.images);

    // Collect i18n contents by exact signature match only（避免索引回退错配）
    for (const loc of targetLocales) {
      const ent = sigMaps[loc]?.get(sig);
      if (ent) {
        i18n[loc] = pickI18n(ent);
        ent.images.forEach(img => allImages.add(img));
      }
    }

    merged.push({
      id: generateId(Array.from(allImages), baseEntry.prompt),
      images: Array.from(allImages),
      i18n,
      source: pickSource(baseEntry),
      isFeatured: baseEntry.isFeatured,
    });
  }

  // 3. Stats & Output
  console.log('\n📊 Sync Stats:');
  console.log('─'.repeat(40));
  for (const [locale, entries] of entriesByLocale) {
    console.log(`  ${locale.padEnd(8)} : ${entries.length} entries`);
  }
  console.log('─'.repeat(40));
  console.log(`  Merged   : ${merged.length} entries`);

  if (values['check-only']) {
      console.log('✅ Check passed. No files written.');
      return;
  }

  // 4. Stable sort for deterministic diffs
  const LOCALE_ORDER = ['en', 'zh', 'zh-TW', 'ja', 'ko', 'de', 'fr', 'es', 'es-419', 'pt-BR', 'pt', 'it', 'th', 'vi', 'hi', 'tr'];
  const stable = merged
    .map(item => ({
      ...item,
      images: Array.from(new Set(item.images)).sort(),
      i18n: Object.fromEntries(
        Object.entries(item.i18n).sort(([a], [b]) => LOCALE_ORDER.indexOf(a) - LOCALE_ORDER.indexOf(b))
      ),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const jsonContent = JSON.stringify(stable, null, 2) + '\n';
  const bytes = Buffer.byteLength(jsonContent, 'utf8');
  console.log(`📦 Output size: ${(bytes/1024).toFixed(1)} KB`);

  if (bytes > 1.5 * 1024 * 1024) {
    console.warn('⚠️  Warning: JSON size exceeds 1.5MB. Consider splitting.');
  }

  fs.writeFileSync(OUTPUT_FILE, jsonContent);
  console.log(`✅ Written to ${OUTPUT_FILE}`);

  // 5. Generate meta.json (v2.4)
  const META_FILE = OUTPUT_FILE.replace('.json', '.meta.json');
  let upstreamCommit = 'unknown';
  try {
    upstreamCommit = execSync('git -C .source/awesome-nano-banana-pro-prompts rev-parse HEAD', {
      encoding: 'utf8',
      cwd: REPO_ROOT,
    }).trim();
  } catch {
    console.warn('⚠️  Could not get upstream commit hash');
  }

  const totalImages = stable.reduce((sum, item) => sum + item.images.length, 0);
  const meta = {
    schemaVersion: 1,
    upstream: {
      repo: 'YouMind-OpenLab/awesome-nano-banana-pro-prompts',
      commit: upstreamCommit,
      syncedAt: new Date().toISOString(),
    },
    stats: {
      items: stable.length,
      images: totalImages,
    },
  };

  fs.writeFileSync(META_FILE, JSON.stringify(meta, null, 2) + '\n');
  console.log(`✅ Written to ${META_FILE}`);
}

main().catch(console.error);
