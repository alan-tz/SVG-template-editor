"use client";

import createDOMPurify from "dompurify";
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";

import { Sidebar } from "@/src/components/Sidebar";
import { downloadDriveFile } from "@/src/lib/google/driveDownload";
import { useGooglePicker } from "@/src/lib/google/useGooglePicker";
import { replaceImageInSvg } from "@/src/lib/svg/editImage";
import { blobToDataUrl } from "@/src/lib/utils/blobToDataUrl";

const DEFAULT_SVG = `<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="#F4F7FB"/>
  <g id="img:hero">
    <rect x="64" y="80" width="460" height="470" rx="28" fill="url(#patternHero)"/>
  </g>
  <defs>
    <pattern id="patternHero" patternUnits="objectBoundingBox" width="1" height="1">
      <image href="https://dummyimage.com/920x940/d9dde7/8c94a9.png&text=img:hero" width="920" height="940" preserveAspectRatio="xMidYMid slice"/>
    </pattern>
  </defs>
  <text x="580" y="190" font-size="58" font-family="Arial, sans-serif" fill="#101828">SVG Template Editor</text>
  <text x="580" y="260" font-size="28" font-family="Arial, sans-serif" fill="#475467">Select the img:hero placeholder, then upload local files or choose from Google Drive.</text>
</svg>`;

type HistoryState = {
  past: string[];
  present: string;
  future: string[];
};

let domPurifyInstance: ReturnType<typeof createDOMPurify> | null = null;

function sanitizeSvg(svgString: string): string {
  if (typeof window === "undefined") {
    return svgString;
  }

  if (!domPurifyInstance) {
    domPurifyInstance = createDOMPurify(window);
  }

  return domPurifyInstance.sanitize(svgString, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_DATA_URI_TAGS: ["image"],
  });
}

function extractPlaceholderIds(svgString: string): string[] {
  const ids = new Set<string>();
  const regex = /\sid=(["'])(img:[^"'<>]+)\1/g;
  let match = regex.exec(svgString);

  while (match) {
    ids.add(match[2]);
    match = regex.exec(svgString);
  }

  return Array.from(ids);
}

function parseSvgDimensions(svgString: string): { width: number; height: number } {
  if (typeof window === "undefined") {
    return { width: 1200, height: 630 };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const root = doc.documentElement;

  const width = Number(root.getAttribute("width")) || 1200;
  const height = Number(root.getAttribute("height")) || 630;
  const viewBox = root.getAttribute("viewBox")?.split(/\s+/).map(Number);

  if (viewBox && viewBox.length === 4 && Number.isFinite(viewBox[2]) && Number.isFinite(viewBox[3])) {
    return { width: viewBox[2], height: viewBox[3] };
  }

  return { width, height };
}

export default function EditorPage() {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: DEFAULT_SVG,
    future: [],
  });
  const [selectedPlaceholderId, setSelectedPlaceholderId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const { chooseFile, isBusy: googleBusy } = useGooglePicker();

  const sanitizedSvg = useMemo(() => sanitizeSvg(history.present), [history.present]);
  const placeholderIds = useMemo(() => extractPlaceholderIds(history.present), [history.present]);

  useEffect(() => {
    if (!status) {
      return;
    }

    const timer = window.setTimeout(() => setStatus(null), 3200);
    return () => window.clearTimeout(timer);
  }, [status]);

  const commitSvg = useCallback(
    (nextSvg: string) => {
      setHistory((prev) => {
        if (prev.present === nextSvg) {
          return prev;
        }
        return {
          past: [...prev.past, prev.present],
          present: nextSvg,
          future: [],
        };
      });

      setSelectedPlaceholderId((current) =>
        current && extractPlaceholderIds(nextSvg).includes(current) ? current : null,
      );
    },
    [],
  );

  const replaceSelectedImage = useCallback(
    async (blob: Blob) => {
      if (!selectedPlaceholderId) {
        setStatus("Select an image placeholder first.");
        return;
      }

      const dataUrl = await blobToDataUrl(blob);
      const updated = replaceImageInSvg({
        svgString: history.present,
        placeholderId: selectedPlaceholderId,
        dataUrl,
      });

      if (updated.replacements === 0) {
        setStatus("No replaceable image found in this placeholder.");
        return;
      }

      commitSvg(updated.svgString);
      setStatus("Image replaced.");
    },
    [commitSvg, history.present, selectedPlaceholderId],
  );

  const importSvgBlob = useCallback(
    async (blob: Blob) => {
      const svgText = await blob.text();
      commitSvg(svgText);
      setSelectedPlaceholderId(null);
      setStatus("SVG imported as current canvas.");
    },
    [commitSvg],
  );

  const onLocalPick = useCallback(
    async (file: File) => {
      try {
        if (selectedPlaceholderId) {
          await replaceSelectedImage(file);
          return;
        }

        if (file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg")) {
          await importSvgBlob(file);
          return;
        }

        setStatus("Select an image placeholder first.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Failed to process local file.");
      }
    },
    [importSvgBlob, replaceSelectedImage, selectedPlaceholderId],
  );

  const onGooglePick = useCallback(async () => {
    try {
      setStatus("Connecting to Google...");
      const selection = await chooseFile();
      if (!selection) {
        setStatus("Picker cancelled.");
        return;
      }

      setStatus("Downloading...");
      const blob = await downloadDriveFile(selection.fileId, selection.accessToken);

      if (selectedPlaceholderId) {
        await replaceSelectedImage(blob);
        return;
      }

      if (
        selection.mimeType === "image/svg+xml" ||
        selection.name.toLowerCase().endsWith(".svg")
      ) {
        await importSvgBlob(blob);
        return;
      }

      setStatus("Select an image placeholder first.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Google Drive operation failed.");
    }
  }, [chooseFile, importSvgBlob, replaceSelectedImage, selectedPlaceholderId]);

  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) {
        return prev;
      }
      const previous = prev.past[prev.past.length - 1];
      return {
        past: prev.past.slice(0, -1),
        present: previous,
        future: [prev.present, ...prev.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) {
        return prev;
      }
      const [next, ...remainingFuture] = prev.future;
      return {
        past: [...prev.past, prev.present],
        present: next,
        future: remainingFuture,
      };
    });
  }, []);

  const onCanvasClick = useCallback((event: MouseEvent<HTMLDivElement>) => {
    const target = event.target as Element | null;
    const placeholder = target?.closest("[id^='img:']");
    if (!placeholder) {
      return;
    }

    const id = placeholder.getAttribute("id");
    if (!id) {
      return;
    }

    setSelectedPlaceholderId(id);
    setStatus(`Selected ${id}`);
  }, []);

  const exportSvg = useCallback(() => {
    const blob = new Blob([history.present], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template.svg";
    link.click();
    URL.revokeObjectURL(url);
  }, [history.present]);

  const exportRaster = useCallback(
    async (type: "image/png" | "image/jpeg") => {
      const { width, height } = parseSvgDimensions(history.present);
      const blob = new Blob([history.present], { type: "image/svg+xml" });
      const svgUrl = URL.createObjectURL(blob);

      try {
        const image = new Image();
        image.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          image.onload = () => resolve();
          image.onerror = () => reject(new Error("Failed to render SVG for export."));
          image.src = svgUrl;
        });

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          throw new Error("Failed to create canvas context.");
        }

        ctx.drawImage(image, 0, 0, width, height);
        const dataUrl = canvas.toDataURL(type, 0.92);
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = type === "image/png" ? "template.png" : "template.jpg";
        link.click();
      } finally {
        URL.revokeObjectURL(svgUrl);
      }
    },
    [history.present],
  );

  return (
    <main className="editor-layout">
      <Sidebar
        selectedPlaceholderId={selectedPlaceholderId}
        googleBusy={googleBusy}
        onGooglePick={onGooglePick}
        onLocalPick={onLocalPick}
        onUndo={undo}
        onRedo={redo}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
      />

      <section className="canvas-panel">
        <header className="toolbar">
          <div className="toolbar-actions">
            <button type="button" onClick={exportSvg}>
              Export SVG
            </button>
            <button type="button" onClick={() => void exportRaster("image/png")}>
              Export PNG
            </button>
            <button type="button" onClick={() => void exportRaster("image/jpeg")}>
              Export JPG
            </button>
          </div>
          <div className="placeholder-list">
            Placeholders: {placeholderIds.length > 0 ? placeholderIds.join(", ") : "none"}
          </div>
        </header>

        <div className="canvas-shell" onClick={onCanvasClick}>
          <div className="svg-canvas" dangerouslySetInnerHTML={{ __html: sanitizedSvg }} />
        </div>
      </section>

      {status && <div className="status-toast">{status}</div>}
    </main>
  );
}
