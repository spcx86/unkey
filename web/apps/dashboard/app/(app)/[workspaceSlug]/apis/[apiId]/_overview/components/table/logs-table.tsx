"use client";
import { createApiRequestColumns } from "@/components/api-requests-table/columns/create-api-request-columns";
import { useKeysOverviewLogsQuery } from "@/components/api-requests-table/hooks/use-keys-overview-query";
import { sortFields } from "@/components/api-requests-table/schema/keys-overview.schema";
import type { SortFields } from "@/components/api-requests-table/schema/keys-overview.schema";
import { getRowClassName } from "@/components/api-requests-table/utils/get-row-class";
import { useSort } from "@/components/logs/hooks/use-sort";
import { cn } from "@/lib/utils";
import type { RowSelectionState, SortingState } from "@tanstack/react-table";
import type { KeysOverviewLog } from "@unkey/clickhouse/src/keys/keys";
import { DataTable, type DataTableConfig, EmptyApiRequests } from "@unkey/ui";
import { useTheme } from "next-themes";
import { Highlight, type PrismTheme } from "prism-react-renderer";
import { useCallback, useMemo, useState } from "react";

const TABLE_CONFIG: DataTableConfig = {
  rowHeight: 26,
  rowSpacing: 4,
  headerHeight: 40,
  layout: "classic" as const,
  rowBorders: false,
  containerPadding: "px-2",
  tableLayout: "fixed",
  loadingRows: 10,
};

type Props = {
  log: KeysOverviewLog | null;
  setSelectedLog: (data: KeysOverviewLog | null) => void;
  apiId: string;
};

export const KeysOverviewLogsTable = ({ apiId, setSelectedLog, log: selectedLog }: Props) => {
  const { sorts, setSorts } = useSort<SortFields>();
  const { historicalLogs, isLoading, hasMore } = useKeysOverviewLogsQuery({ apiId });

  const handleNavigate = useCallback(() => setSelectedLog(null), [setSelectedLog]);

  const columns = useMemo(
    () => createApiRequestColumns({ apiId, onNavigate: handleNavigate }),
    [apiId, handleNavigate],
  );

  const rowSelection = useMemo<RowSelectionState>(
    () => (selectedLog ? { [selectedLog.request_id]: true } : {}),
    [selectedLog],
  );

  const sorting: SortingState = useMemo(
    () =>
      sorts.length > 0
        ? sorts.map((s) => ({ id: s.column, desc: s.direction === "desc" }))
        : [{ id: "time", desc: true }],
    [sorts],
  );

  const handleSortingChange = useCallback(
    (updater: SortingState | ((old: SortingState) => SortingState)) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      const validated = next.flatMap((s) => {
        const result = sortFields.safeParse(s.id);
        if (!result.success) {
          return [];
        }
        return [{ column: result.data, direction: s.desc ? ("desc" as const) : ("asc" as const) }];
      });
      setSorts(validated);
    },
    [sorting, setSorts],
  );

  const getRowClassNameMemoized = useCallback(
    (log: KeysOverviewLog) => getRowClassName(log, selectedLog),
    [selectedLog],
  );

  return (
    <DataTable
      data={historicalLogs}
      isLoading={isLoading}
      columns={columns}
      getRowId={(log) => log.request_id}
      onRowClick={setSelectedLog}
      selectedItem={selectedLog}
      rowClassName={getRowClassNameMemoized}
      sorting={sorting}
      onSortingChange={handleSortingChange}
      manualSorting={true}
      enableRowSelection={true}
      rowSelection={rowSelection}
      config={TABLE_CONFIG}
      loadMoreFooterProps={{
        hide: true,
        hasMore: hasMore ?? false,
      }}
      emptyState={<EmptyApiRequests />}
    />
  );
};

// ── Syntax highlighting theme (matches marketing site) ──────────────

const darkEditorTheme: PrismTheme = {
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

const lightEditorTheme: PrismTheme = {
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

// ── Language icons (from marketing site) ─────────────────────────────

const TSIcon = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g opacity={active ? 1 : 0.4}>
      <path d="M12.4559 14.424C12.4559 15.432 13.2239 16.08 14.4159 16.08C15.5839 16.08 16.3439 15.408 16.3439 14.4C16.3439 13.52 15.8319 12.888 14.9199 12.648L14.2079 12.448C13.7919 12.344 13.5679 12.064 13.5679 11.696C13.5679 11.232 13.8799 10.952 14.3999 10.952C14.9359 10.952 15.2559 11.24 15.2559 11.688H16.2559C16.2559 10.704 15.5359 10.08 14.4079 10.08C13.2879 10.08 12.5759 10.72 12.5759 11.712C12.5759 12.568 13.1039 13.2 14.0079 13.44L14.7119 13.632C15.1119 13.736 15.3439 14.04 15.3439 14.432C15.3439 14.904 14.9999 15.208 14.4239 15.208C13.8399 15.208 13.4559 14.896 13.4559 14.424H12.4559Z" fill="currentColor" />
      <path d="M9.09904 11.064V16H10.107V11.064H11.635V10.16H7.57104V11.064H9.09904Z" fill="currentColor" />
      <path fillRule="evenodd" clipRule="evenodd" d="M9.27779 4C8.45652 4 7.80955 3.99999 7.28889 4.04253C6.75771 4.08593 6.31414 4.17609 5.91103 4.38148C5.25247 4.71703 4.71703 5.25247 4.38148 5.91103C4.17609 6.31414 4.08593 6.75771 4.04253 7.28889C3.99999 7.80955 4 8.45652 4 9.27779V14.7222C4 15.5435 3.99999 16.1905 4.04253 16.7111C4.08593 17.2423 4.17609 17.6859 4.38148 18.089C4.71703 18.7475 5.25247 19.283 5.91103 19.6185C6.31414 19.8239 6.75771 19.9141 7.28889 19.9575C7.80953 20 8.45649 20 9.27773 20H14.7222C15.5435 20 16.1905 20 16.7111 19.9575C17.2423 19.9141 17.6859 19.8239 18.089 19.6185C18.7475 19.283 19.283 18.7475 19.6185 18.089C19.8239 17.6859 19.9141 17.2423 19.9575 16.7111C20 16.1905 20 15.5435 20 14.7223V9.27778C20 8.45654 20 7.80953 19.9575 7.28889C19.9141 6.75771 19.8239 6.31414 19.6185 5.91103C19.283 5.25247 18.7475 4.71703 18.089 4.38148C17.6859 4.17609 17.2423 4.08593 16.7111 4.04253C16.1905 3.99999 15.5435 4 14.7222 4H9.27779ZM6.36502 5.27248C6.60366 5.15089 6.90099 5.07756 7.37032 5.03921C7.84549 5.00039 8.45167 5 9.3 5H14.7C15.5483 5 16.1545 5.00039 16.6297 5.03921C17.099 5.07756 17.3963 5.15089 17.635 5.27248C18.1054 5.51217 18.4878 5.89462 18.7275 6.36502C18.8491 6.60366 18.9224 6.90099 18.9608 7.37032C18.9996 7.84549 19 8.45167 19 9.3V14.7C19 15.5483 18.9996 16.1545 18.9608 16.6297C18.9224 17.099 18.8491 17.3963 18.7275 17.635C18.4878 18.1054 18.1054 18.4878 17.635 18.7275C17.3963 18.8491 17.099 18.9224 16.6297 18.9608C16.1545 18.9996 15.5483 19 14.7 19H9.3C8.45167 19 7.84549 18.9996 7.37032 18.9608C6.90099 18.9224 6.60366 18.8491 6.36502 18.7275C5.89462 18.4878 5.51217 18.1054 5.27248 17.635C5.15089 17.3963 5.07756 17.099 5.03921 16.6297C5.00039 16.1545 5 15.5483 5 14.7V9.3C5 8.45167 5.00039 7.84549 5.03921 7.37032C5.07756 6.90099 5.15089 6.60366 5.27248 6.36502C5.51217 5.89462 5.89462 5.51217 6.36502 5.27248Z" fill="currentColor" />
    </g>
  </svg>
);

const PythonIcon = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path opacity={active ? 1 : 0.4} fillRule="evenodd" clipRule="evenodd" d="M8.92308 6.34188C8.92308 6.14145 9.10073 5.81724 9.69579 5.51187C10.2601 5.2223 11.0743 5.02564 12 5.02564C12.9257 5.02564 13.7399 5.2223 14.3042 5.51187C14.8993 5.81724 15.0769 6.14145 15.0769 6.34188L15.0768 8.41025V8.58119C15.0768 9.42328 15.0233 10.0118 14.9146 10.4281C14.8088 10.8329 14.6614 11.0364 14.4939 11.1606C14.313 11.2945 14.0407 11.3872 13.5869 11.4368C13.1321 11.4865 12.5656 11.4872 11.829 11.4872H11.803C11.1831 11.4872 10.623 11.4872 10.1514 11.5443C9.6692 11.6028 9.2122 11.7273 8.83772 12.0269C8.4557 12.3325 8.22386 12.7678 8.08632 13.3179C7.96911 13.7868 7.91331 14.3669 7.90039 15.0769H6.34188C6.14145 15.0769 5.81723 14.8993 5.51187 14.3042C5.22229 13.7399 5.02564 12.9257 5.02564 12C5.02564 11.0743 5.22229 10.2601 5.51187 9.6958C5.81723 9.10073 6.14145 8.92308 6.34188 8.92308H8.41026H12V7.89744H8.92308V6.34188ZM6.34188 16.1026H7.89741L7.89744 17.6582C7.89744 18.4489 8.52337 19.0393 9.22754 19.4006C9.96246 19.7777 10.9431 20 12 20C13.0569 20 14.0375 19.7777 14.7724 19.4006C15.4766 19.0393 16.1026 18.4489 16.1026 17.6582V16.1026H17.6581C18.4489 16.1026 19.0393 15.4766 19.4006 14.7724C19.7777 14.0375 20 13.0569 20 12C20 10.9431 19.7777 9.96246 19.4006 9.22754C19.0393 8.52338 18.4489 7.89744 17.6581 7.89744H16.1026V6.34189C16.1026 5.55103 15.4766 4.96071 14.7724 4.59937C14.0375 4.22223 13.0569 4 12 4C10.9431 4 9.96246 4.22223 9.22754 4.59937C8.52337 4.96071 7.89744 5.55103 7.89744 6.34188V7.89744H6.34188C5.55102 7.89744 4.96071 8.52338 4.59937 9.22754C4.22223 9.96246 4 10.9431 4 12C4 13.0569 4.22223 14.0375 4.59937 14.7724C4.96071 15.4766 5.55102 16.1026 6.34188 16.1026ZM12 16.1026H15.0769V17.6582C15.0769 17.8586 14.8993 18.1828 14.3042 18.4881C13.7399 18.7777 12.9257 18.9744 12 18.9744C11.0743 18.9744 10.2601 18.7777 9.69579 18.4881C9.10073 18.1828 8.92308 17.8586 8.92308 17.6582L8.92303 15.5897V15.4188C8.92303 14.5776 8.97644 13.9862 9.08133 13.5667C9.18418 13.1553 9.32627 12.9495 9.47843 12.8278C9.63814 12.7 9.87559 12.6109 10.2748 12.5625C10.678 12.5136 11.1772 12.5128 11.829 12.5128H11.8539C12.56 12.5128 13.1816 12.5128 13.6983 12.4564C14.222 12.3991 14.7082 12.2781 15.1043 11.9847C15.5136 11.6816 15.7615 11.2441 15.9069 10.6873C16.0301 10.2157 16.0865 9.63309 16.0995 8.92308H17.6581C17.8586 8.92308 18.1828 9.10073 18.4881 9.6958C18.7776 10.2601 18.9744 11.0743 18.9744 12C18.9744 12.9257 18.7776 13.7399 18.4881 14.3042C18.1828 14.8993 17.8586 15.0769 17.6581 15.0769H15.5898H12V16.1026ZM10.1806 7.33585C10.5353 7.33585 10.8229 7.04829 10.8229 6.69356C10.8229 6.33884 10.5353 6.05128 10.1806 6.05128C9.82592 6.05128 9.53836 6.33884 9.53836 6.69356C9.53836 7.04829 9.82592 7.33585 10.1806 7.33585ZM13.8227 17.9533C14.1781 17.9533 14.4661 17.6653 14.4661 17.3101C14.4661 16.9547 14.1781 16.6667 13.8227 16.6667C13.4674 16.6667 13.1794 16.9547 13.1794 17.3101C13.1794 17.6653 13.4674 17.9533 13.8227 17.9533Z" fill="currentColor" />
  </svg>
);

const GoIcon = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path opacity={active ? 1 : 0.4} fillRule="evenodd" clipRule="evenodd" d="M10.5578 10.1111C10.247 10.1919 9.93194 10.2741 9.56747 10.3666L9.54556 10.3725C9.36723 10.4197 9.34879 10.4244 9.18283 10.2364C8.98432 10.015 8.83829 9.87162 8.55983 9.74107C7.72484 9.33718 6.91624 9.4544 6.16041 9.93662C5.25909 10.51 4.7951 11.3572 4.80843 12.4128C4.82176 13.4553 5.55064 14.3155 6.59802 14.4589C7.49935 14.5761 8.25489 14.2633 8.85165 13.5986C8.94014 13.4922 9.0212 13.3789 9.11142 13.253C9.14261 13.2089 9.17516 13.1636 9.20956 13.1164H6.65106C6.37256 13.1164 6.30619 12.9469 6.39922 12.7255C6.57136 12.3216 6.88987 11.6439 7.07534 11.305C7.11506 11.2269 7.20778 11.0966 7.40665 11.0966H11.6727C11.8642 10.4997 12.1753 9.93579 12.5899 9.40218C13.5576 8.15134 14.7241 7.49939 16.3015 7.22606C17.6538 6.99134 18.9263 7.12161 20.0795 7.89051C21.127 8.5944 21.7763 9.54551 21.9486 10.7966C22.174 12.5561 21.657 13.9897 20.4244 15.2147C19.5494 16.0878 18.4757 16.635 17.2428 16.8828C17.0074 16.9256 16.7723 16.9458 16.5409 16.9658C16.4203 16.9761 16.3004 16.9867 16.1825 17C14.9759 16.9739 13.8759 16.635 12.9478 15.8533C12.2952 15.2986 11.8454 14.6169 11.6222 13.8233C11.4654 14.1342 11.2789 14.4299 11.0652 14.7064C10.1109 15.9444 8.86465 16.7133 7.28748 16.9219C5.98826 17.0914 4.78177 16.8436 3.72135 16.0617C2.74034 15.3319 2.18361 14.3675 2.03782 13.1686C1.86539 11.748 2.28967 10.4711 3.16462 9.35023C4.10593 8.13829 5.35184 7.36939 6.87625 7.09578C8.12247 6.87411 9.31537 7.01745 10.3893 7.73411C11.0919 8.19023 11.5956 8.81579 11.927 9.57163C12.0065 9.68913 11.9535 9.75413 11.7944 9.7933C11.3815 9.89679 10.9694 10.0029 10.5578 10.1111ZM19.328 11.5958C19.3307 11.6394 19.3336 11.6855 19.3373 11.735C19.271 12.8558 18.7009 13.69 17.6538 14.2242C16.9512 14.5761 16.2221 14.615 15.493 14.3022C14.5386 13.8855 14.0349 12.8558 14.2734 11.8394C14.5649 10.6144 15.3605 9.84524 16.5933 9.57163C17.8526 9.28496 19.0588 10.0147 19.2976 11.305C19.3164 11.3972 19.3217 11.4897 19.328 11.5958Z" fill="currentColor" />
  </svg>
);

const CurlIcon = ({ active }: { active: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g opacity={active ? 1 : 0.4}>
      <path d="M18.8202 6.91608C18.6492 6.91608 18.4852 6.84502 18.3643 6.71854C18.2435 6.59205 18.1755 6.4205 18.1755 6.24163C18.1755 6.06275 18.2435 5.8912 18.3643 5.76471C18.4852 5.63823 18.6492 5.56717 18.8202 5.56717C18.9911 5.56717 19.1551 5.63823 19.276 5.76471C19.3969 5.8912 19.4648 6.06275 19.4648 6.24163C19.4648 6.4205 19.3969 6.59205 19.276 6.71854C19.1551 6.84502 18.9911 6.91608 18.8202 6.91608ZM12.4177 18.4394C12.2467 18.4394 12.0827 18.3683 11.9618 18.2418C11.841 18.1154 11.773 17.9438 11.773 17.7649C11.773 17.5861 11.841 17.4145 11.9618 17.288C12.0827 17.1615 12.2467 17.0905 12.4177 17.0905C12.5886 17.0905 12.7526 17.1615 12.8735 17.288C12.9944 17.4145 13.0623 17.5861 13.0623 17.7649C13.0623 17.9438 12.9944 18.1154 12.8735 18.2418C12.7526 18.3683 12.5886 18.4394 12.4177 18.4394ZM18.8202 5.0072C18.5074 5.00772 18.2076 5.13794 17.9864 5.36933C17.7653 5.60071 17.6408 5.91439 17.6403 6.24163C17.6403 6.38685 17.6753 6.52292 17.7197 6.65245L12.1832 16.5796C11.648 16.6973 11.2378 17.1703 11.2378 17.7649C11.2383 18.0922 11.3628 18.4058 11.5839 18.6372C11.8051 18.8686 12.1049 18.9988 12.4177 18.9994C12.7304 18.9988 13.0302 18.8686 13.2514 18.6372C13.4725 18.4058 13.597 18.0922 13.5975 17.7649C13.5975 17.6341 13.5625 17.5033 13.5225 17.3724L19.0871 7.41195C19.6061 7.28111 20 6.82319 20 6.23443C19.9995 5.9072 19.875 5.59352 19.6539 5.36213C19.4327 5.13074 19.1329 5.00052 18.8202 5" fill="currentColor" />
      <path d="M13.9977 6.91607C13.8267 6.91607 13.6627 6.84501 13.5418 6.71853C13.4209 6.59204 13.353 6.42049 13.353 6.24162C13.353 6.06274 13.4209 5.89119 13.5418 5.7647C13.6627 5.63822 13.8267 5.56716 13.9977 5.56716C14.1686 5.56716 14.3326 5.63822 14.4535 5.7647C14.5744 5.89119 14.6423 6.06274 14.6423 6.24162C14.6423 6.42049 14.5744 6.59204 14.4535 6.71853C14.3326 6.84501 14.1686 6.91607 13.9977 6.91607ZM7.5889 18.44C7.41794 18.44 7.25397 18.369 7.13308 18.2425C7.01219 18.116 6.94427 17.9444 6.94427 17.7656C6.94427 17.5867 7.01219 17.4151 7.13308 17.2887C7.25397 17.1622 7.41794 17.0911 7.5889 17.0911C7.75987 17.0911 7.92383 17.1622 8.04472 17.2887C8.16561 17.4151 8.23353 17.5867 8.23353 17.7656C8.23353 17.9444 8.16561 18.116 8.04472 18.2425C7.92383 18.369 7.75987 18.44 7.5889 18.44ZM13.9977 5.00719C13.3455 5.00719 12.8178 5.55997 12.8178 6.24162C12.8178 6.38684 12.8528 6.52291 12.8972 6.65244L7.35444 16.5796C6.81923 16.6973 6.40907 17.1703 6.40907 17.7649C6.4094 18.0923 6.53379 18.4061 6.75496 18.6376C6.97613 18.8692 7.27603 18.9995 7.5889 19C7.90166 18.9995 8.20147 18.8693 8.42262 18.6379C8.64378 18.4065 8.76824 18.0928 8.76874 17.7656C8.76874 17.6347 8.73372 17.5039 8.69371 17.3731L14.2584 7.41259C14.7773 7.28175 15.1712 6.82383 15.1712 6.23507C15.1691 5.90898 15.0439 5.59697 14.8229 5.367C14.602 5.13702 14.3031 5.0077 13.9914 5.00719M5.17358 8.98065C5.34455 8.98065 5.50851 9.05171 5.6294 9.17819C5.75029 9.30468 5.81821 9.47623 5.81821 9.6551C5.81821 9.83398 5.75029 10.0055 5.6294 10.132C5.50851 10.2585 5.34455 10.3296 5.17358 10.3296C5.00262 10.3296 4.83865 10.2585 4.71776 10.132C4.59687 10.0055 4.52896 9.83398 4.52896 9.6551C4.52896 9.47623 4.59687 9.30468 4.71776 9.17819C4.83865 9.05171 5.00262 8.98065 5.17358 8.98065ZM5.17358 10.8895C5.48634 10.889 5.78615 10.7588 6.00731 10.5274C6.22846 10.296 6.35292 9.98234 6.35342 9.6551C6.35342 9.52427 6.31778 9.39343 6.27839 9.2626C6.12208 8.77197 5.69379 8.41348 5.17296 8.41348C5.0898 8.41348 5.01665 8.44619 4.93787 8.4632C4.40391 8.58095 4 9.05326 4 9.64856C4.0005 9.97579 4.12496 10.2895 4.34611 10.5209C4.56727 10.7523 4.86708 10.8825 5.17984 10.883M4.52896 13.9694C4.52896 13.7905 4.59687 13.619 4.71776 13.4925C4.83865 13.366 5.00262 13.2949 5.17358 13.2949C5.34455 13.2949 5.50851 13.366 5.6294 13.4925C5.75029 13.619 5.81821 13.7905 5.81821 13.9694C5.81821 14.1483 5.75029 14.3198 5.6294 14.4463C5.50851 14.5728 5.34455 14.6438 5.17358 14.6438C5.00262 14.6438 4.83865 14.5728 4.71776 14.4463C4.59687 14.3198 4.52896 14.1483 4.52896 13.9694ZM6.35342 13.9694C6.35342 13.8386 6.31778 13.7077 6.27839 13.5769C6.12208 13.0863 5.69441 12.7278 5.17296 12.7278C5.0898 12.7278 5.01665 12.7605 4.93787 12.7768C4.40391 12.8946 4 13.3675 4 13.9628C4.0005 14.2901 4.12496 14.6038 4.34611 14.8351C4.56727 15.0665 4.86708 15.1968 5.17984 15.1973C5.4926 15.1968 5.7924 15.0665 6.01356 14.8351C6.23471 14.6038 6.35918 14.2901 6.35967 13.9628" fill="currentColor" />
    </g>
  </svg>
);

// ── Code snippets ────────────────────────────────────────────────────

const CODE_TABS = [
  {
    label: "TypeScript",
    language: "typescript",
    icon: TSIcon,
    frameworks: [
      {
        name: "TS Create Key",
        code: (apiId: string) => `import { Unkey } from "@unkey/api";

const unkey = new Unkey({ rootKey: process.env.UNKEY_ROOT_KEY });

const { result } = await unkey.keys.create({
  apiId: "${apiId}",
  // prefix: "sk_live",
  // name: "my-api-key",
  // externalId: "user_123",
  // ratelimit: [
  //   { name: "requests", limit: 10, duration: 60_000 }
  // ],
  // remaining: 1000,
  // expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
  // meta: { team: "backend" },
});

console.log(result.key);`,
      },
      {
        name: "TS Verify Key",
        code: (_apiId: string) => `import { Unkey } from "@unkey/api";

const unkey = new Unkey({ rootKey: process.env.UNKEY_ROOT_KEY });

const { result } = await unkey.keys.verify({
  key: "sk_live_...",
});

if (!result.valid) {
  // reject unauthorized request
}

// handle authorized request`,
      },
      {
        name: "Next.js Create",
        code: (apiId: string) => `import { Unkey } from "@unkey/api";

const unkey = new Unkey({ rootKey: process.env.UNKEY_ROOT_KEY });

// In your API route or server action
export async function createKeyForUser(userId: string) {
  const { result } = await unkey.keys.create({
    apiId: "${apiId}",
    externalId: userId,
    // prefix: "sk_live",
    // name: "user-api-key",
    // ratelimit: [
    //   { name: "requests", limit: 10, duration: 60_000 }
    // ],
    // remaining: 1000,
    // expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });

  return result.key;
}`,
      },
      {
        name: "Next.js Verify",
        code: (_apiId: string) => `import { withUnkey } from "@unkey/nextjs";

export const POST = withUnkey(async (req) => {
  // req.unkey contains the verification response
  if (!req.unkey.valid) {
    return new Response("Unauthorized", { status: 403 });
  }

  return new Response("Your API key is valid!");
});`,
      },
      {
        name: "Hono Create",
        code: (apiId: string) => `import { Unkey } from "@unkey/api";

const unkey = new Unkey({ rootKey: process.env.UNKEY_ROOT_KEY });

app.post("/keys", async (c) => {
  const { result } = await unkey.keys.create({
    apiId: "${apiId}",
    // prefix: "sk_live",
    // name: "my-api-key",
    // ratelimit: [
    //   { name: "requests", limit: 10, duration: 60_000 }
    // ],
    // remaining: 1000,
    // expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
  });

  return c.json({ key: result.key });
});`,
      },
      {
        name: "Hono Verify",
        code: (_apiId: string) => `import { Hono } from "hono";
import { type UnkeyContext, unkey } from "@unkey/hono";

const app = new Hono<{ Variables: { unkey: UnkeyContext } }>();
app.use("*", unkey());

app.get("/protected", (c) => {
  const key = c.get("unkey");
  return c.text("Authorized!");
});`,
      },
    ],
  },
  {
    label: "Python",
    language: "python",
    icon: PythonIcon,
    frameworks: [
      {
        name: "Create Key",
        code: (apiId: string) => `from unkey import Unkey

client = Unkey(bearer_auth="<YOUR_ROOT_KEY>")

result = client.keys.create_key(
  api_id="${apiId}",
  # prefix="sk_live",
  # name="my-api-key",
  # external_id="user_123",
  # ratelimit=[
  #   {"name": "requests", "limit": 10, "duration": 60000}
  # ],
  # remaining=1000,
  # expires=int(time.time() * 1000) + 30 * 24 * 60 * 60 * 1000,
  # meta={"team": "backend"},
)

print(result.key)`,
      },
      {
        name: "Verify Key",
        code: (_apiId: string) => `from unkey import Unkey

client = Unkey(bearer_auth="<YOUR_ROOT_KEY>")

result = client.keys.verify_key(
  key="sk_live_...",
)

if result.valid:
    print("Authorized")
else:
    print("Denied:", result.code)`,
      },
    ],
  },
  {
    label: "Golang",
    language: "go",
    icon: GoIcon,
    frameworks: [
      {
        name: "Create Key",
        code: (apiId: string) => `import unkey "github.com/unkeyed/unkey-go"

client := unkey.New(
  unkey.WithSecurity("<YOUR_ROOT_KEY>"),
)

result, err := client.Keys.CreateKey(ctx, &operations.CreateKeyRequestBody{
  APIID:  "${apiId}",
  // Prefix:     unkey.String("sk_live"),
  // Name:       unkey.String("my-api-key"),
  // ExternalID: unkey.String("user_123"),
  // Remaining:  unkey.Int64(1000),
  // Ratelimits: []operations.Ratelimit{
  //   {Name: "requests", Limit: 10, Duration: 60000},
  // },
})

fmt.Println(result.Key)`,
      },
      {
        name: "Verify Key",
        code: (_apiId: string) => `import unkey "github.com/unkeyed/unkey-go"

client := unkey.New(
  unkey.WithSecurity("<YOUR_ROOT_KEY>"),
)

result, err := client.Keys.VerifyKey(ctx, &operations.VerifyKeyRequestBody{
  Key: "sk_live_...",
})

if result.Valid {
  fmt.Println("Authorized")
}`,
      },
    ],
  },
  {
    label: "curl",
    language: "bash",
    icon: CurlIcon,
    frameworks: [
      {
        name: "Create Key",
        code: (apiId: string) => `curl -X POST https://api.unkey.com/v2/keys.createKey \\
  -H "Authorization: Bearer <YOUR_ROOT_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "apiId": "${apiId}"
    # "prefix": "sk_live",
    # "name": "my-api-key",
    # "externalId": "user_123",
    # "ratelimit": [{"name": "requests", "limit": 10, "duration": 60000}],
    # "remaining": 1000
  }'`,
      },
      {
        name: "Verify Key",
        code: (_apiId: string) => `curl -X POST https://api.unkey.com/v2/keys.verifyKey \\
  -H "Authorization: Bearer <YOUR_ROOT_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"key": "sk_live_..."}'`,
      },
    ],
  },
];

// ── No-keys empty state component ────────────────────────────────────

export function NoKeysEmptyState({ apiId }: { apiId: string }) {
  const [activeTab, setActiveTab] = useState(0);
  const [activeFramework, setActiveFramework] = useState(0);
  const [copied, setCopied] = useState(false);
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const activeTheme = isDark ? darkEditorTheme : lightEditorTheme;
  const tab = CODE_TABS[activeTab];
  const frameworks = tab.frameworks;
  const framework = frameworks[activeFramework];

  const handleTabChange = (i: number) => {
    setActiveTab(i);
    setActiveFramework(0);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(framework.code(apiId));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full max-w-[720px] flex flex-col items-start gap-4 py-8">
      <div>
        <h3 className="text-accent-12 font-semibold text-[15px]">
          Start issuing API keys to your users
        </h3>
        <p className="text-accent-11 text-sm mt-1">
          Use the Unkey SDK or API to create and manage keys programmatically.
        </p>
      </div>
      <div className="w-full overflow-hidden">
        {/* Language tabs — outside the bordered container */}
        <div className="flex items-end gap-0">
          {CODE_TABS.map((t, i) => {
            const Icon = t.icon;
            return (
              <button
                key={t.label}
                onClick={() => handleTabChange(i)}
                className={cn(
                  "inline-flex items-center gap-1.5 justify-center whitespace-nowrap rounded-t-lg px-3 py-1.5 text-xs font-light transition-all border border-b-0",
                  activeTab === i
                    ? "text-gray-12 dark:text-white bg-[#f8f8f8] dark:bg-[#0a0a0a] border-gray-3 dark:border-[#2a2a2a] font-medium"
                    : "text-gray-11 hover:text-gray-12 dark:text-gray-11 dark:hover:text-white bg-transparent border-transparent"
                )}
              >
                <Icon active={activeTab === i} />
                {t.label}
              </button>
            );
          })}
        </div>
        {/* Code block with optional framework sidebar */}
        <div className="-mt-px bg-[#f8f8f8] dark:bg-[#0a0a0a] flex overflow-hidden rounded-b-lg rounded-tr-lg border border-gray-3 dark:border-[#2a2a2a] relative">
          {/* Copy button */}
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              "absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all",
              !copied && "bg-gray-3 dark:bg-white/10 text-gray-11 hover:bg-gray-4 dark:hover:bg-white/15 hover:text-gray-12"
            )}
            style={copied ? { background: "hsla(185, 50%, 55%, 0.15)", color: "hsl(185, 50%, 55%)" } : undefined}
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
          {/* Framework sidebar — only show when there are multiple */}
          {frameworks.length > 1 && (
            <div className="flex flex-col py-2 min-w-[100px]">
              {frameworks.map((fw, i) => (
                <button
                  key={fw.name}
                  onClick={() => setActiveFramework(i)}
                  className={cn(
                    "text-left px-3 py-1.5 text-xs transition-colors",
                    activeFramework === i
                      ? "text-gray-12 bg-black/5 dark:text-white dark:bg-white/5"
                      : "text-gray-8 hover:text-gray-11 dark:text-white/30 dark:hover:text-white/60"
                  )}
                >
                  {fw.name}
                </button>
              ))}
            </div>
          )}
          {/* Code */}
          <div className="flex-1 p-4 font-mono text-xs overflow-x-auto overflow-y-auto max-h-[240px]">
            <Highlight theme={activeTheme} code={framework.code(apiId)} language={tab.language}>
              {({ tokens, getLineProps, getTokenProps }) => (
                <pre className="leading-6">
                  {tokens.map((line, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: static code lines
                    <div key={i} {...getLineProps({ line })}>
                      <span className="select-none text-gray-6 dark:text-white/20 mr-4 inline-block w-4 text-right text-[10px]">{i + 1}</span>
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
        </div>
      </div>
      <a
        href="https://www.unkey.com/docs/onboarding/onboarding-api"
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-accent-9 hover:text-accent-11 transition-colors underline underline-offset-2"
      >
        Read the quickstart guide
      </a>
    </div>
  );
}
