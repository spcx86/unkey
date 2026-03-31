"use client";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Highlight, type PrismTheme } from "prism-react-renderer";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useFormContext, useWatch } from "react-hook-form";
import type { FormValues } from "../create-key.schema";

const darkTheme: PrismTheme = {
  plain: { color: "#F8F8F2", backgroundColor: "transparent" },
  styles: [
    { types: ["keyword", "builtin"], style: { color: "#9D72FF" } },
    { types: ["function"], style: { color: "#FB3186" } },
    { types: ["string"], style: { color: "#3CEEAE" } },
    { types: ["string-property", "property"], style: { color: "#9D72FF" } },
    { types: ["number"], style: { color: "#FB3186" } },
    { types: ["comment"], style: { color: "#4D4D4D" } },
    { types: ["operator", "punctuation"], style: { color: "#888" } },
  ],
};

const lightTheme: PrismTheme = {
  plain: { color: "#1a1a1a", backgroundColor: "transparent" },
  styles: [
    { types: ["keyword", "builtin"], style: { color: "#7c3aed" } },
    { types: ["function"], style: { color: "#db2777" } },
    { types: ["string"], style: { color: "#059669" } },
    { types: ["string-property", "property"], style: { color: "#7c3aed" } },
    { types: ["number"], style: { color: "#db2777" } },
    { types: ["comment"], style: { color: "#9ca3af" } },
    { types: ["operator", "punctuation"], style: { color: "#6b7280" } },
  ],
};

// ── Shared helpers ───────────────────────────────────────────────────

function commonFields(v: Partial<FormValues>) {
  const fields: { key: string; value: string }[] = [];
  if (v.name) fields.push({ key: "name", value: `"${v.name}"` });
  if (v.prefix) fields.push({ key: "prefix", value: `"${v.prefix}"` });
  if (v.bytes && v.bytes !== 16) fields.push({ key: "bytes", value: `${v.bytes}` });
  if (v.externalId) fields.push({ key: "externalId", value: `"${v.externalId}"` });
  if (v.environment) fields.push({ key: "environment", value: `"${v.environment}"` });
  return fields;
}

function hasCredits(v: Partial<FormValues>) {
  return v.limit?.enabled && v.limit.data;
}

function hasRatelimit(v: Partial<FormValues>) {
  return v.ratelimit?.enabled && v.ratelimit.data?.length;
}

function hasExpiration(v: Partial<FormValues>) {
  return v.expiration?.enabled && v.expiration.data instanceof Date && !Number.isNaN(v.expiration.data.getTime());
}

function hasMeta(v: Partial<FormValues>) {
  return v.metadata?.enabled && v.metadata.data;
}

// ── TypeScript generator ─────────────────────────────────────────────

function generateTS(v: Partial<FormValues>, apiId: string): string {
  const lines: string[] = [];
  lines.push('import { Unkey } from "@unkey/api";');
  lines.push("");
  lines.push("const unkey = new Unkey({ rootKey: process.env.UNKEY_ROOT_KEY });");
  lines.push("");
  lines.push("const { result } = await unkey.keys.create({");
  lines.push(`  apiId: "${apiId}",`);

  for (const f of commonFields(v)) {
    lines.push(`  ${f.key}: ${f.value},`);
  }

  if (hasCredits(v)) {
    lines.push(`  remaining: ${v.limit!.data!.remaining},`);
    const refill = v.limit!.data!.refill;
    if (refill?.interval && refill.interval !== "none") {
      lines.push("  refill: {");
      lines.push(`    interval: "${refill.interval}",`);
      lines.push(`    amount: ${refill.amount},`);
      if (refill.interval === "monthly" && refill.refillDay) {
        lines.push(`    refillDay: ${refill.refillDay},`);
      }
      lines.push("  },");
    }
  }

  if (hasExpiration(v)) {
    const d = v.expiration!.data as Date;
    lines.push(`  expires: ${d.getTime()}, // ${d.toISOString()}`);
  }

  if (hasRatelimit(v)) {
    lines.push("  ratelimit: [");
    for (const rl of v.ratelimit!.data!) {
      lines.push(`    { name: "${rl.name}", limit: ${rl.limit}, duration: ${rl.refillInterval}${rl.autoApply ? ", autoApply: true" : ""} },`);
    }
    lines.push("  ],");
  }

  if (hasMeta(v)) {
    try {
      const parsed = JSON.parse(v.metadata!.data!);
      lines.push(`  meta: ${JSON.stringify(parsed, null, 2).split("\n").join("\n  ")},`);
    } catch {
      lines.push("  meta: { /* invalid JSON */ },");
    }
  }

  lines.push("});");
  lines.push("");
  lines.push("console.log(result.key);");
  return lines.join("\n");
}

// ── Python generator ─────────────────────────────────────────────────

function generatePython(v: Partial<FormValues>, apiId: string): string {
  const lines: string[] = [];
  lines.push("from unkey import Unkey");
  lines.push("");
  lines.push('client = Unkey(bearer_auth="<YOUR_ROOT_KEY>")');
  lines.push("");
  lines.push("result = client.keys.create_key(");
  lines.push(`    api_id="${apiId}",`);

  for (const f of commonFields(v)) {
    const pyKey = f.key.replace(/([A-Z])/g, "_$1").toLowerCase();
    lines.push(`    ${pyKey}=${f.value},`);
  }

  if (hasCredits(v)) {
    lines.push(`    remaining=${v.limit!.data!.remaining},`);
  }

  if (hasExpiration(v)) {
    const d = v.expiration!.data as Date;
    lines.push(`    expires=${d.getTime()},`);
  }

  if (hasRatelimit(v)) {
    lines.push("    ratelimit=[");
    for (const rl of v.ratelimit!.data!) {
      lines.push(`        {"name": "${rl.name}", "limit": ${rl.limit}, "duration": ${rl.refillInterval}},`);
    }
    lines.push("    ],");
  }

  if (hasMeta(v)) {
    try {
      const parsed = JSON.parse(v.metadata!.data!);
      lines.push(`    meta=${JSON.stringify(parsed)},`);
    } catch {
      lines.push("    meta={},");
    }
  }

  lines.push(")");
  lines.push("");
  lines.push("print(result.key)");
  return lines.join("\n");
}

// ── Go generator ─────────────────────────────────────────────────────

function generateGo(v: Partial<FormValues>, apiId: string): string {
  const lines: string[] = [];
  lines.push('import unkey "github.com/unkeyed/unkey-go"');
  lines.push("");
  lines.push("client := unkey.New(");
  lines.push('    unkey.WithSecurity("<YOUR_ROOT_KEY>"),');
  lines.push(")");
  lines.push("");
  lines.push("result, err := client.Keys.CreateKey(ctx, &operations.CreateKeyRequestBody{");
  lines.push(`    APIID:  "${apiId}",`);

  if (v.name) lines.push(`    Name:   unkey.String("${v.name}"),`);
  if (v.prefix) lines.push(`    Prefix: unkey.String("${v.prefix}"),`);
  if (v.externalId) lines.push(`    ExternalID: unkey.String("${v.externalId}"),`);

  if (hasCredits(v)) {
    lines.push(`    Remaining: unkey.Int64(${v.limit!.data!.remaining}),`);
  }

  if (hasExpiration(v)) {
    const d = v.expiration!.data as Date;
    lines.push(`    Expires: unkey.Int64(${d.getTime()}),`);
  }

  if (hasRatelimit(v)) {
    lines.push("    Ratelimits: []operations.Ratelimit{");
    for (const rl of v.ratelimit!.data!) {
      lines.push(`        {Name: "${rl.name}", Limit: ${rl.limit}, Duration: ${rl.refillInterval}},`);
    }
    lines.push("    },");
  }

  lines.push("})");
  lines.push("");
  lines.push("fmt.Println(result.Key)");
  return lines.join("\n");
}

// ── Language config ──────────────────────────────────────────────────

const LANGUAGES = [
  { label: "TypeScript", language: "typescript", generate: generateTS },
  { label: "Python", language: "python", generate: generatePython },
  { label: "Go", language: "go", generate: generateGo },
] as const;

// ── Component ────────────────────────────────────────────────────────

export function CodePreviewPanel({ apiId }: { apiId: string }) {
  const { control } = useFormContext<FormValues>();
  const values = useWatch({ control });
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const activeTheme = isDark ? darkTheme : lightTheme;
  const [activeLang, setActiveLang] = useState(0);
  const [copied, setCopied] = useState(false);

  const lang = LANGUAGES[activeLang];
  const code = lang.generate(values as Partial<FormValues>, apiId);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const panelRef = useRef<HTMLDivElement>(null);

  // Track pointer coordinates globally so handleOpenChange can check if click was on the panel
  useEffect(() => {
    const handler = (e: PointerEvent) => {
      (window as any).__lastPointerX = e.clientX;
      (window as any).__lastPointerY = e.clientY;
    };
    window.addEventListener("pointerdown", handler, true);
    return () => window.removeEventListener("pointerdown", handler, true);
  }, []);

  return createPortal(
    <div
      ref={panelRef}
      data-code-preview-panel=""
      style={{ pointerEvents: "auto" }}
      className={cn(
        "fixed top-0 right-0 h-full w-[420px] z-[9999] flex flex-col",
        "border-l border-grayA-4 shadow-2xl",
        "bg-[#f8f8f8] dark:bg-[#0a0a0a]",
        "animate-in slide-in-from-right duration-200"
      )}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-grayA-4">
        <div className="text-sm font-medium text-gray-12 dark:text-white">API Equivalent</div>
        <div className="text-xs text-gray-9 dark:text-gray-8 mt-0.5">
          Updates live as you fill the form
        </div>
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-1">
            {LANGUAGES.map((l, i) => (
              <button
                key={l.label}
                type="button"
                onClick={() => setActiveLang(i)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                  activeLang === i
                    ? "text-gray-12 dark:text-white bg-gray-3 dark:bg-white/10"
                    : "text-gray-9 hover:text-gray-12 dark:hover:text-white"
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
              copied
                ? "bg-green-500/15 text-green-600 dark:text-green-400"
                : "bg-gray-3 dark:bg-white/10 text-gray-11 dark:text-gray-10 hover:bg-gray-4 dark:hover:bg-white/15 hover:text-gray-12 dark:hover:text-white"
            )}
          >
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 7.5l2.5 2.5L11 4" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <rect x="4.5" y="4.5" width="7" height="7" rx="1.5" />
                <path d="M9.5 4.5V3a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 3v5A1.5 1.5 0 003 9.5h1.5" />
              </svg>
            )}
            {copied ? "Copied!" : "Copy Code"}
          </button>
        </div>
      </div>

      {/* Code */}
      <div className="flex-1 overflow-y-auto overflow-x-auto p-5 font-mono text-xs leading-6">
        <Highlight theme={activeTheme} code={code} language={lang.language}>
          {({ tokens, getLineProps, getTokenProps }) => (
            <pre>
              {tokens.map((line, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static code lines
                <div key={i} {...getLineProps({ line })}>
                  <span className="select-none text-gray-6 dark:text-white/20 mr-4 inline-block w-5 text-right text-[11px]">
                    {i + 1}
                  </span>
                  {line.map((token, key) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static tokens
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
      </div>
    </div>,
    document.body
  );
}
