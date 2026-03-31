"use client";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";
import { Highlight, type PrismTheme } from "prism-react-renderer";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

export type CodeViewMode = "collapsed" | "expanded" | "full";

export function CodePreviewPanel({
  apiId,
  viewMode,
  onViewModeChange,
}: {
  apiId: string;
  viewMode: CodeViewMode;
  onViewModeChange: (mode: CodeViewMode) => void;
}) {
  const { control } = useFormContext<FormValues>();
  const values = useWatch({ control });
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const activeTheme = isDark ? darkTheme : lightTheme;
  const [activeLang, setActiveLang] = useState(0);
  const [copied, setCopied] = useState(false);
  const [justUpdated, setJustUpdated] = useState(false);
  const expanded = viewMode !== "collapsed";
  const isFull = viewMode === "full";

  const lang = LANGUAGES[activeLang];
  const code = lang.generate(values as Partial<FormValues>, apiId);

  // Detect code changes for update feedback
  const prevCodeRef = useRef(code);
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (prevCodeRef.current !== code) {
      prevCodeRef.current = code;
      setJustUpdated(true);
      const timer = setTimeout(() => setJustUpdated(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [code]);

  // Count configured fields — matches what actually appears in the generated code
  const fieldCount = useMemo(() => {
    let count = 0;
    const v = values as Partial<FormValues>;
    if (v.name) count++;
    if (v.prefix) count++;
    if (v.bytes && v.bytes !== 16) count++;
    if (v.externalId) count++;
    if (v.environment) count++;
    if (hasCredits(v)) {
      count++; // remaining
      const refill = v.limit!.data!.refill;
      if (refill?.interval && refill.interval !== "none") {
        count++; // refill.interval
        count++; // refill.amount
        if (refill.interval === "monthly" && refill.refillDay) count++; // refill.refillDay
      }
    }
    if (hasRatelimit(v)) {
      count += v.ratelimit!.data!.length; // each ratelimit rule
    }
    if (hasExpiration(v)) count++;
    if (hasMeta(v)) count++;
    return count;
  }, [values]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div className={cn(
      "bg-gray-2 dark:bg-gray-2 border rounded-xl overflow-hidden transform-gpu transition-all duration-300",
      isFull ? "flex-1 min-h-0 flex flex-col" : "shrink-0",
      justUpdated
        ? "border-grass-9/40 ring-1 ring-grass-9/20"
        : "border-grayA-4"
    )}>
      {/* Header: title + lang tabs + copy button */}
      <div className={cn("flex items-center justify-between px-4 py-2.5", isFull && "pr-12")}>
        <div className="flex items-center gap-2">
          {/* Live dot */}
          <span className="relative flex size-2 shrink-0">
            <span className={cn(
              "absolute inline-flex size-full rounded-full bg-grass-9",
              justUpdated ? "animate-ping" : "animate-pulse"
            )} />
            <span className="relative inline-flex rounded-full size-2 bg-grass-9" />
          </span>
          <span className="text-xs font-medium text-gray-11">Or, create via code</span>
          {/* Updated badge */}
          {justUpdated && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-grass-9/30 text-grass-11 dark:text-grass-9 bg-grass-9/10 animate-in fade-in zoom-in-95 duration-200">
              Updated
            </span>
          )}
          <span className="text-[10px] text-gray-8 hidden sm:inline">
            {fieldCount > 0
              ? `· Unkey SDK code · ${fieldCount} field${fieldCount !== 1 ? "s" : ""} configured`
              : "· Unkey SDK code"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {expanded && (
            <>
              <div className="flex items-center gap-1">
                {LANGUAGES.map((l, i) => (
                  <button
                    key={l.label}
                    type="button"
                    onClick={() => setActiveLang(i)}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                      activeLang === i
                        ? "text-gray-12 bg-gray-3"
                        : "text-gray-9 hover:text-gray-12"
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
                    ? "bg-grass-9/15 text-grass-11 dark:text-grass-9"
                    : "bg-gray-3 dark:bg-white/10 text-gray-11 hover:bg-gray-4 dark:hover:bg-white/15 hover:text-gray-12"
                )}
              >
                {copied ? (
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 7.5l2.5 2.5L11 4" />
                  </svg>
                ) : (
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="4.5" y="4.5" width="7" height="7" rx="1.5" />
                    <path d="M9.5 4.5V3a1.5 1.5 0 00-1.5-1.5H3A1.5 1.5 0 001.5 3v5A1.5 1.5 0 003 9.5h1.5" />
                  </svg>
                )}
                {copied ? "Copied!" : "Copy Code"}
              </button>
            </>
          )}
          {/* Expand/collapse toggle */}
          {expanded && (
            <button
              type="button"
              onClick={() => onViewModeChange(isFull ? "expanded" : "full")}
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-gray-9 hover:text-gray-12 hover:bg-gray-3 transition-colors"
              title={isFull ? "Minimize code" : "Expand code"}
            >
              {isFull ? (
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M9 1v4h4M5 13V9H1M9 5L13 1M5 9l-4 4" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M13 5V1h-4M1 9v4h4M13 1L9 5M1 13l4-4" />
                </svg>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => onViewModeChange(expanded ? "collapsed" : "expanded")}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-gray-9 hover:text-gray-12 hover:bg-gray-3 transition-colors"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className={cn("transition-transform duration-200", expanded && "rotate-180")}
            >
              <path d="M3 5l4 4 4-4" />
            </svg>
            {expanded ? "Hide" : "Show"}
          </button>
        </div>
      </div>

      {/* Code area */}
      {expanded && (
      <div className={cn(
        "bg-[#f8f8f8] dark:bg-[#0a0a0a] overflow-x-auto overflow-y-auto px-4 py-3 font-mono text-[11px] leading-5 border-t border-grayA-3",
        isFull ? "flex-1 min-h-0" : "max-h-[180px]"
      )}>
        <Highlight theme={activeTheme} code={code} language={lang.language}>
          {({ tokens, getLineProps, getTokenProps }) => (
            <pre>
              {tokens.map((line, i) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: static code lines
                <div key={i} {...getLineProps({ line })}>
                  <span className="select-none text-gray-6 dark:text-white/20 mr-3 inline-block w-5 text-right text-[10px]">
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
      )}
    </div>
  );
}
