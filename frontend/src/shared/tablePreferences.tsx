import type { MouseEvent as ReactMouseEvent, ThHTMLAttributes } from "react";

export interface TableColumnMeta<Key extends string> {
  key: Key;
  title: string;
  defaultWidth: number;
  minWidth: number;
  visibleByDefault: boolean;
  locked: boolean;
  resizable: boolean;
}

export interface TablePreference<Key extends string> {
  visibleColumnKeys: Key[];
  columnWidths: Partial<Record<Key, number>>;
}

export interface ResizableHeaderCellProps
  extends ThHTMLAttributes<HTMLTableHeaderCellElement> {
  width?: number;
  minWidth?: number;
  resizable?: boolean;
  onResizeWidth?: (nextWidth: number) => void;
}

function getEffectiveMinWidth<Key extends string>(meta: TableColumnMeta<Key>): number {
  if (meta.locked) {
    return meta.minWidth;
  }
  return Math.max(72, Math.min(meta.minWidth, Math.round(meta.defaultWidth * 0.6)));
}

export function ResizableHeaderCell(props: ResizableHeaderCellProps) {
  const {
    width,
    minWidth = 80,
    resizable,
    onResizeWidth,
    style,
    children,
    ...restProps
  } = props;

  const mergedStyle = {
    ...style,
    width,
    minWidth: width,
    maxWidth: width,
    position: "relative" as const,
  };

  const handleMouseDown = (event: ReactMouseEvent<HTMLSpanElement>) => {
    if (!resizable || !onResizeWidth || !width) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const startX = event.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const nextWidth = Math.max(
        minWidth,
        startWidth + moveEvent.clientX - startX,
      );
      onResizeWidth(nextWidth);
    };

    const handleMouseUp = () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

  return (
    <th {...restProps} style={mergedStyle}>
      <div style={{ position: "relative", width: "100%" }}>
        {children}
        {resizable && (
          <span
            onMouseDown={handleMouseDown}
            style={{
              position: "absolute",
              top: -12,
              right: -8,
              width: 16,
              height: "calc(100% + 24px)",
              cursor: "col-resize",
              zIndex: 2,
            }}
          />
        )}
      </div>
    </th>
  );
}

export function normalizeTableWidths<Key extends string>(
  metas: readonly TableColumnMeta<Key>[],
  visibleColumnKeys: Key[],
  columnWidths: Partial<Record<Key, number>>,
  maxPreferredWidth = 1180,
): Partial<Record<Key, number>> {
  const normalized: Partial<Record<Key, number>> = {};
  const visibleMetas = metas.filter((item) => visibleColumnKeys.includes(item.key));

  for (const meta of visibleMetas) {
    const width = columnWidths[meta.key] || meta.defaultWidth;
    normalized[meta.key] = Math.max(getEffectiveMinWidth(meta), Math.round(width));
  }

  const totalWidth = visibleMetas.reduce(
    (sum, meta) => sum + (normalized[meta.key] || meta.defaultWidth),
    0,
  );
  if (totalWidth <= maxPreferredWidth) {
    return normalized;
  }

  let overflow = totalWidth - maxPreferredWidth;
  const shrinkableMetas = visibleMetas.filter((item) => !item.locked);
  for (const meta of shrinkableMetas) {
    if (overflow <= 0) {
      break;
    }
    const currentWidth = normalized[meta.key] || meta.defaultWidth;
    const shrinkable = currentWidth - getEffectiveMinWidth(meta);
    if (shrinkable <= 0) {
      continue;
    }
    const delta = Math.min(shrinkable, overflow);
    normalized[meta.key] = currentWidth - delta;
    overflow -= delta;
  }

  return normalized;
}

export function getDefaultTablePreference<Key extends string>(
  metas: readonly TableColumnMeta<Key>[],
  showAllByDefault = true,
): TablePreference<Key> {
  const visibleColumnKeys = (
    showAllByDefault
      ? metas
      : metas.filter((item) => item.visibleByDefault || item.locked)
  ).map((item) => item.key);
  const columnWidths = metas.reduce<Partial<Record<Key, number>>>((acc, item) => {
    acc[item.key] = item.defaultWidth;
    return acc;
  }, {});
  return {
    visibleColumnKeys,
    columnWidths: normalizeTableWidths(metas, visibleColumnKeys, columnWidths),
  };
}

export function loadTablePreference<Key extends string>(
  storageKey: string,
  metas: readonly TableColumnMeta<Key>[],
  showAllByDefault = true,
): TablePreference<Key> {
  const defaults = getDefaultTablePreference(metas, showAllByDefault);
  if (typeof window === "undefined") {
    return defaults;
  }
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw) as Partial<TablePreference<Key>>;
    const validKeys = new Set<Key>(metas.map((item) => item.key));
    const lockedKeys = metas.filter((item) => item.locked).map((item) => item.key);
    const visibleColumnKeys = Array.isArray(parsed.visibleColumnKeys)
      ? parsed.visibleColumnKeys.filter((key): key is Key => validKeys.has(key as Key))
      : defaults.visibleColumnKeys;
    const finalVisibleKeys = Array.from(new Set([...lockedKeys, ...visibleColumnKeys]));
    const columnWidths = { ...defaults.columnWidths };
    if (parsed.columnWidths && typeof parsed.columnWidths === "object") {
      for (const item of metas) {
        const nextWidth = parsed.columnWidths[item.key];
        if (typeof nextWidth === "number" && Number.isFinite(nextWidth)) {
          columnWidths[item.key] = Math.max(
            getEffectiveMinWidth(item),
            Math.round(nextWidth),
          );
        }
      }
    }
    return {
      visibleColumnKeys:
        finalVisibleKeys.length > 0 ? finalVisibleKeys : defaults.visibleColumnKeys,
      columnWidths: normalizeTableWidths(
        metas,
        finalVisibleKeys.length > 0 ? finalVisibleKeys : defaults.visibleColumnKeys,
        columnWidths,
      ),
    };
  } catch {
    return defaults;
  }
}

export function getVisibleToggleableKeys<Key extends string>(
  metas: readonly TableColumnMeta<Key>[],
  visibleColumnKeys: Key[],
) {
  return visibleColumnKeys.filter((key) =>
    metas.some((item) => item.key === key && !item.locked),
  );
}
