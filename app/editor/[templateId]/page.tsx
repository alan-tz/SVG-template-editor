"use client";

import createDOMPurify from "dompurify";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from "react";

import { LayersSidebar } from "@/src/components/LayersSidebar";
import { Sidebar } from "@/src/components/Sidebar";
import { extractFirstPlaceholderImageHref, replaceImageInSvg } from "@/src/lib/svg/editImage";
import { blobToDataUrl } from "@/src/lib/utils/blobToDataUrl";

const DEFAULT_CANVAS_SIZE = 900;
const EMBEDDED_FONT_STYLE_ID = "svg-editor-font-face";

const EMBEDDED_FONT_STYLE = `<style id="${EMBEDDED_FONT_STYLE_ID}">
@font-face {
  font-family: "Wix Madefor Display";
  src:
    local("Wix Madefor Display"),
    local("Wix Madefor Display Regular"),
    url("/fonts/WixMadeforDisplay-Regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
}
@font-face {
  font-family: "Wix Madefor Display";
  src:
    local("Wix Madefor Display SemiBold"),
    local("Wix Madefor Display Medium"),
    url("/fonts/WixMadeforDisplay-SemiBold.woff2") format("woff2");
  font-weight: 500 700;
  font-style: normal;
}
@font-face {
  font-family: "Wix Madefor Text";
  src:
    local("Wix Madefor Text"),
    local("Wix Madefor Text Regular"),
    url("/fonts/WixMadeforText-Regular.woff2") format("woff2");
  font-weight: 400;
  font-style: normal;
}
svg text {
  font-synthesis: none;
}
</style>`;

function ensureEmbeddedFontStyles(svgString: string): string {
  if (svgString.includes(`id="${EMBEDDED_FONT_STYLE_ID}"`)) {
    return svgString;
  }

  if (svgString.includes("</defs>")) {
    return svgString.replace("</defs>", `${EMBEDDED_FONT_STYLE}</defs>`);
  }

  const svgOpenTag = svgString.match(/^<svg\b[^>]*>/i)?.[0];
  if (!svgOpenTag) {
    return svgString;
  }

  return svgString.replace(svgOpenTag, `${svgOpenTag}<defs>${EMBEDDED_FONT_STYLE}</defs>`);
}

const DEFAULT_SVG = `<svg width="${DEFAULT_CANVAS_SIZE}" height="${DEFAULT_CANVAS_SIZE}" viewBox="0 0 ${DEFAULT_CANVAS_SIZE} ${DEFAULT_CANVAS_SIZE}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="${DEFAULT_CANVAS_SIZE}" height="${DEFAULT_CANVAS_SIZE}" fill="#0A0A0A"/>
</svg>`;

type HistoryState = {
  past: string[];
  present: string;
  future: string[];
};

type TextEntry = {
  key: string;
  label: string;
  value: string;
};

type TemplateLibraryItem = {
  id: string;
  name: string;
  svg: string;
  builtin: boolean;
};

type BackgroundGradientStop = {
  key: string;
  label: string;
  color: string;
  offset: number;
};

type BackgroundControls = {
  kind: "solid" | "linear-gradient" | "radial-gradient";
  color: string;
  gradientId: string | null;
  angle: number | null;
  stops: BackgroundGradientStop[];
};

const TEMPLATE_STORAGE_KEY = "svg-editor-custom-templates-v1";
const MAX_TEMPLATE_STORAGE_BYTES = 4_500_000;
const MAX_EMBEDDED_IMAGE_LENGTH_FOR_TEMPLATE = 120_000;
const TEMPLATE_IMAGE_PLACEHOLDER_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc2MDAnIGhlaWdodD0nNjAwJyB2aWV3Qm94PScwIDAgNjAwIDYwMCc+PHJlY3Qgd2lkdGg9JzYwMCcgaGVpZ2h0PSc2MDAnIGZpbGw9JyNlNWU3ZWInLz48dGV4dCB4PSc1MCUnIHk9JzUwJScgZG9taW5hbnQtYmFzZWxpbmU9J21pZGRsZScgdGV4dC1hbmNob3I9J21pZGRsZScgZm9udC1mYW1pbHk9J0FyaWFsJyBmb250LXNpemU9JzI2JyBmaWxsPScjNjY3MDgwJz5JbWFnZSBwbGFjZWhvbGRlcjwvdGV4dD48L3N2Zz4=";
const EXPORT_PLACEHOLDER_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSczMDAnIGhlaWdodD0nMzAwJyB2aWV3Qm94PScwIDAgMzAwIDMwMCc+PHJlY3Qgd2lkdGg9JzMwMCcgaGVpZ2h0PSczMDAnIGZpbGw9JyNlNWU3ZWInLz48L3N2Zz4=";
const BUILTIN_TEMPLATES: TemplateLibraryItem[] = [
  {
    id: "builtin:square-shop",
    name: "Square Shop Card",
    builtin: true,
    svg: ensureEmbeddedFontStyles(`<svg width="${DEFAULT_CANVAS_SIZE}" height="${DEFAULT_CANVAS_SIZE}" viewBox="0 0 ${DEFAULT_CANVAS_SIZE} ${DEFAULT_CANVAS_SIZE}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFE1EC"/>
      <stop offset="100%" stop-color="#F4F7FB"/>
    </linearGradient>
    <pattern id="hero-pattern" patternUnits="objectBoundingBox" width="1" height="1">
      <image id="hero-image" href="data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSc5MDAnIGhlaWdodD0nOTAwJyB2aWV3Qm94PScwIDAgOTAwIDkwMCc+PHJlY3Qgd2lkdGg9JzkwMCcgaGVpZ2h0PSc5MDAnIGZpbGw9JyNlMGU2ZWInLz48dGV4dCB4PSc1MCUnIHk9JzUwJScgZG9taW5hbnQtYmFzZWxpbmU9J21pZGRsZScgdGV4dC1hbmNob3I9J21pZGRsZScgZm9udC1mYW1pbHk9J0FyaWFsJyBmb250LXNpemU9JzQyJyBmaWxsPScjNzA3Nzg0Jz5pbWc6aGVybzwvdGV4dD48L3N2Zz4=" width="900" height="900" preserveAspectRatio="xMidYMid slice"/>
    </pattern>
  </defs>
  <rect width="900" height="900" fill="url(#bg-grad)"/>
  <rect id="img:hero" x="70" y="95" width="560" height="560" rx="24" fill="url(#hero-pattern)"/>
  <rect x="70" y="650" width="560" height="150" rx="20" fill="white" fill-opacity="0.92"/>
  <text fill="#0F172A" font-family="Wix Madefor Display" font-size="54" font-weight="600"><tspan x="700" y="190">New Drop</tspan></text>
  <text fill="#334155" font-family="Wix Madefor Text" font-size="30"><tspan x="700" y="245">img:hero is editable</tspan></text>
  <text fill="#0F172A" font-family="Wix Madefor Display" font-size="46" font-weight="600"><tspan x="110" y="740">$150.00</tspan></text>
</svg>`),
  },
  {
    id: "builtin:gradient-poster",
    name: "Gradient Poster",
    builtin: true,
    svg: ensureEmbeddedFontStyles(`<svg width="${DEFAULT_CANVAS_SIZE}" height="${DEFAULT_CANVAS_SIZE}" viewBox="0 0 ${DEFAULT_CANVAS_SIZE} ${DEFAULT_CANVAS_SIZE}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="bg-radial" cx="50%" cy="30%" r="75%">
      <stop offset="0%" stop-color="#FDE68A"/>
      <stop offset="100%" stop-color="#C4B5FD"/>
    </radialGradient>
  </defs>
  <rect width="900" height="900" fill="url(#bg-radial)"/>
  <text fill="#111827" font-family="Wix Madefor Display" font-size="62" font-weight="600"><tspan x="96" y="180">Summer Sale</tspan></text>
  <text fill="#1F2937" font-family="Wix Madefor Text" font-size="36"><tspan x="96" y="240">Edit background gradient and text</tspan></text>
</svg>`),
  },
];

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
    ADD_TAGS: ["use", "pattern", "defs"],
    ADD_ATTR: [
      "xlink:href",
      "href",
      "patternUnits",
      "patternContentUnits",
      "preserveAspectRatio",
      "viewBox",
      "transform",
      "xml:space",
      "font-family",
      "font-size",
      "font-weight",
      "letter-spacing",
    ],
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
    return { width: DEFAULT_CANVAS_SIZE, height: DEFAULT_CANVAS_SIZE };
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, "image/svg+xml");
  const root = doc.documentElement;

  const width = Number(root.getAttribute("width")) || DEFAULT_CANVAS_SIZE;
  const height = Number(root.getAttribute("height")) || DEFAULT_CANVAS_SIZE;
  const viewBox = root.getAttribute("viewBox")?.split(/\s+/).map(Number);

  if (viewBox && viewBox.length === 4 && Number.isFinite(viewBox[2]) && Number.isFinite(viewBox[3])) {
    return { width: viewBox[2], height: viewBox[3] };
  }

  return { width, height };
}

function isEmbeddedOrInternalUrl(value: string): boolean {
  const href = value.trim().toLowerCase();
  return href.startsWith("data:") || href.startsWith("blob:") || href.startsWith("#");
}

function stripUnsafeCssUrls(cssText: string): string {
  const withoutFontFace = cssText.replace(/@font-face\s*{[^}]*}/gi, "");
  const withoutImports = withoutFontFace.replace(/@import\s+[^;]+;/gi, "");
  return withoutImports.replace(/url\((['"]?)([^'")]+)\1\)/gi, (full, quote, urlValue) => {
    return isEmbeddedOrInternalUrl(urlValue) ? full : "none";
  });
}

function hasExternalResourceReference(svgString: string): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(svgString, "image/svg+xml");
  const styleUrlRegex = /url\((['"]?)([^'")]+)\1\)/gi;

  const nodes = Array.from(xmlDoc.querySelectorAll("*"));
  for (const node of nodes) {
    const hrefValue =
      node.getAttribute("href") ??
      node.getAttribute("xlink:href") ??
      node.getAttributeNS("http://www.w3.org/1999/xlink", "href");
    if (hrefValue && !isEmbeddedOrInternalUrl(hrefValue)) {
      return true;
    }

    const srcValue = node.getAttribute("src");
    if (srcValue && !isEmbeddedOrInternalUrl(srcValue)) {
      return true;
    }

    for (const attrName of ["fill", "stroke", "filter", "clip-path", "mask", "style"]) {
      const attrValue = node.getAttribute(attrName);
      if (!attrValue) {
        continue;
      }
      let match = styleUrlRegex.exec(attrValue);
      while (match) {
        if (!isEmbeddedOrInternalUrl(match[2])) {
          return true;
        }
        match = styleUrlRegex.exec(attrValue);
      }
      styleUrlRegex.lastIndex = 0;
    }
  }

  for (const styleNode of Array.from(xmlDoc.querySelectorAll("style"))) {
    const cssText = styleNode.textContent ?? "";
    let match = styleUrlRegex.exec(cssText);
    while (match) {
      if (!isEmbeddedOrInternalUrl(match[2])) {
        return true;
      }
      match = styleUrlRegex.exec(cssText);
    }
    styleUrlRegex.lastIndex = 0;
  }

  return false;
}

function makeRasterSafeSvg(svgString: string): string {
  if (typeof window === "undefined") {
    return svgString;
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(svgString, "image/svg+xml");

  const styleNodes = Array.from(xmlDoc.querySelectorAll("style"));
  for (const styleNode of styleNodes) {
    const cssText = styleNode.textContent ?? "";
    const nextCss = stripUnsafeCssUrls(cssText);
    styleNode.textContent = nextCss;
  }

  // HTML in SVG can trigger external fetches and taint the canvas.
  for (const foreignObject of Array.from(xmlDoc.querySelectorAll("foreignObject"))) {
    foreignObject.remove();
  }

  const hrefNodes = Array.from(xmlDoc.querySelectorAll("[href],[xlink\\:href]"));
  for (const node of hrefNodes) {
    const hrefValue =
      node.getAttribute("href") ??
      node.getAttribute("xlink:href") ??
      node.getAttributeNS("http://www.w3.org/1999/xlink", "href");
    if (!hrefValue) {
      continue;
    }
    if (!isEmbeddedOrInternalUrl(hrefValue)) {
      if (node.tagName.toLowerCase() === "image") {
        node.setAttribute("href", EXPORT_PLACEHOLDER_DATA_URL);
        node.setAttribute("xlink:href", EXPORT_PLACEHOLDER_DATA_URL);
        node.setAttributeNS(
          "http://www.w3.org/1999/xlink",
          "xlink:href",
          EXPORT_PLACEHOLDER_DATA_URL,
        );
      } else {
        node.removeAttribute("href");
        node.removeAttribute("xlink:href");
        node.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", "");
      }
    }
  }

  const nodes = Array.from(xmlDoc.querySelectorAll("*"));
  for (const node of nodes) {
    for (const attrName of ["fill", "stroke", "filter", "clip-path", "mask", "style"]) {
      const attrValue = node.getAttribute(attrName);
      if (!attrValue) {
        continue;
      }
      const nextValue = attrValue.replace(/url\((['"]?)([^'")]+)\1\)/gi, (full, quote, urlValue) =>
        isEmbeddedOrInternalUrl(urlValue) ? full : "none",
      );
      node.setAttribute(attrName, nextValue);
    }
  }

  return new XMLSerializer().serializeToString(xmlDoc);
}

function extractBackgroundColor(svgString: string): string {
  const match = svgString.match(/<rect\b[^>]*\sfill=(["'])(#[0-9a-fA-F]{3,8})\1/i);
  return match?.[2] ?? "#f4f7fb";
}

function getUtf8Bytes(value: string): number {
  return new TextEncoder().encode(value).length;
}

function stripLargeEmbeddedImagesForTemplate(svgString: string): {
  svg: string;
  strippedCount: number;
} {
  let strippedCount = 0;
  const svg = svgString.replace(
    /(<image\b[^>]*?(?:href|xlink:href)=["'])(data:image\/[^"']+)(["'][^>]*>)/gi,
    (full, prefix, dataUrl, suffix) => {
      if (dataUrl.length <= MAX_EMBEDDED_IMAGE_LENGTH_FOR_TEMPLATE) {
        return full;
      }
      strippedCount += 1;
      return `${prefix}${TEMPLATE_IMAGE_PLACEHOLDER_DATA_URL}${suffix}`;
    },
  );

  return { svg, strippedCount };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function escapeCssIdentifier(value: string): string {
  return value.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");
}

function parseOffsetValue(offsetRaw: string | null): number {
  if (!offsetRaw) {
    return 0;
  }
  const trimmed = offsetRaw.trim();
  if (trimmed.endsWith("%")) {
    return clamp(Number(trimmed.slice(0, -1)) || 0, 0, 100);
  }
  const numeric = Number(trimmed);
  if (!Number.isFinite(numeric)) {
    return 0;
  }
  if (numeric <= 1) {
    return clamp(numeric * 100, 0, 100);
  }
  return clamp(numeric, 0, 100);
}

function parseCoordinate(rawValue: string | null, fallback: number): number {
  if (!rawValue) {
    return fallback;
  }
  const value = rawValue.trim();
  if (value.endsWith("%")) {
    return (Number(value.slice(0, -1)) || 0) / 100;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return parsed;
}

function extractStopColor(stop: Element): string {
  const attrColor = stop.getAttribute("stop-color");
  if (attrColor && /^#[0-9a-fA-F]{3,8}$/.test(attrColor.trim())) {
    return attrColor.trim();
  }

  const style = stop.getAttribute("style");
  if (style) {
    const match = style.match(/stop-color:\s*(#[0-9a-fA-F]{3,8})/i);
    if (match) {
      return match[1];
    }
  }

  return "#000000";
}

function findBackgroundRect(xmlDoc: Document): Element | null {
  const root = xmlDoc.documentElement;
  const rootWidth = root.getAttribute("width");
  const rootHeight = root.getAttribute("height");
  const rects = Array.from(xmlDoc.querySelectorAll("rect"));
  return (
    rects.find(
      (rect) =>
        (!rootWidth || rect.getAttribute("width") === rootWidth) &&
        (!rootHeight || rect.getAttribute("height") === rootHeight) &&
        (!rect.getAttribute("x") || rect.getAttribute("x") === "0") &&
        (!rect.getAttribute("y") || rect.getAttribute("y") === "0"),
    ) ?? rects[0] ?? null
  );
}

function extractBackgroundControls(svgString: string): BackgroundControls {
  if (typeof window === "undefined") {
    return {
      kind: "solid",
      color: extractBackgroundColor(svgString),
      gradientId: null,
      angle: null,
      stops: [],
    };
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(svgString, "image/svg+xml");
  const backgroundRect = findBackgroundRect(xmlDoc);
  if (!backgroundRect) {
    return {
      kind: "solid",
      color: "#f4f7fb",
      gradientId: null,
      angle: null,
      stops: [],
    };
  }

  const fill = (backgroundRect.getAttribute("fill") ?? "").trim();
  const gradientMatch = fill.match(/^url\(#([^)]+)\)$/);
  if (!gradientMatch) {
    return {
      kind: "solid",
      color: /^#[0-9a-fA-F]{3,8}$/.test(fill) ? fill : "#f4f7fb",
      gradientId: null,
      angle: null,
      stops: [],
    };
  }

  const gradientId = gradientMatch[1];
  const escapedGradientId = escapeCssIdentifier(gradientId);
  const gradient =
    xmlDoc.querySelector(`linearGradient#${escapedGradientId}`) ??
    xmlDoc.querySelector(`radialGradient#${escapedGradientId}`);
  if (!gradient) {
    return {
      kind: "solid",
      color: "#f4f7fb",
      gradientId: null,
      angle: null,
      stops: [],
    };
  }

  const kind = gradient.tagName.toLowerCase() === "radialgradient" ? "radial-gradient" : "linear-gradient";
  const stops = Array.from(gradient.querySelectorAll("stop")).map((stop, index) => ({
    key: `bg-stop:${index}`,
    label: `Stop ${index + 1}`,
    color: extractStopColor(stop),
    offset: parseOffsetValue(stop.getAttribute("offset")),
  }));

  let angle: number | null = null;
  if (kind === "linear-gradient") {
    const x1 = parseCoordinate(gradient.getAttribute("x1"), 0);
    const y1 = parseCoordinate(gradient.getAttribute("y1"), 0);
    const x2 = parseCoordinate(gradient.getAttribute("x2"), 1);
    const y2 = parseCoordinate(gradient.getAttribute("y2"), 0);
    angle = (Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI;
    if (!Number.isFinite(angle)) {
      angle = 0;
    }
    angle = (angle + 360) % 360;
  }

  return {
    kind,
    color: stops[0]?.color ?? "#f4f7fb",
    gradientId,
    angle,
    stops,
  };
}

function extractTextEntries(svgString: string): TextEntry[] {
  const entries: TextEntry[] = [];
  const regex = /<text\b[^>]*>([\s\S]*?)<\/text>/gi;
  let match = regex.exec(svgString);
  let index = 0;

  while (match) {
    const value = match[1]
      .replace(/<[^>]+>/g, " ")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&apos;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();

    entries.push({
      key: `text:${index}`,
      label: `Text ${index + 1}`,
      value,
    });
    index += 1;
    match = regex.exec(svgString);
  }

  return entries;
}

function updateTextInSvg(svgString: string, key: string, nextText: string): string {
  if (typeof window === "undefined") {
    return svgString;
  }

  const match = key.match(/^text:(\d+)$/);
  if (!match) {
    return svgString;
  }

  const targetIndex = Number(match[1]);
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(svgString, "image/svg+xml");
  const textNodes = Array.from(xmlDoc.querySelectorAll("text"));
  const target = textNodes[targetIndex];
  if (!target) {
    return svgString;
  }

  const tspans = Array.from(target.querySelectorAll("tspan"));
  if (tspans.length > 0) {
    // Preserve the original tspan positioning attributes (x/y/dx/dy) and only update text.
    tspans[0].textContent = nextText;
    tspans.slice(1).forEach((node) => node.remove());
  } else {
    target.textContent = nextText;
  }

  return new XMLSerializer().serializeToString(xmlDoc);
}

function updateBackgroundColorInSvg(svgString: string, color: string): string {
  if (typeof window === "undefined") {
    return svgString;
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(svgString, "image/svg+xml");
  const targetRect = findBackgroundRect(xmlDoc);

  if (!targetRect) {
    return svgString;
  }

  targetRect.setAttribute("fill", color);
  return new XMLSerializer().serializeToString(xmlDoc);
}

function updateBackgroundGradientStopInSvg(
  svgString: string,
  gradientId: string,
  stopIndex: number,
  next: { color?: string; offset?: number },
): string {
  if (typeof window === "undefined") {
    return svgString;
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(svgString, "image/svg+xml");
  const escapedGradientId = escapeCssIdentifier(gradientId);
  const gradient =
    xmlDoc.querySelector(`linearGradient#${escapedGradientId}`) ??
    xmlDoc.querySelector(`radialGradient#${escapedGradientId}`);
  if (!gradient) {
    return svgString;
  }

  const stops = Array.from(gradient.querySelectorAll("stop"));
  const stop = stops[stopIndex];
  if (!stop) {
    return svgString;
  }

  if (next.color) {
    stop.setAttribute("stop-color", next.color);
  }
  if (typeof next.offset === "number") {
    stop.setAttribute("offset", `${clamp(next.offset, 0, 100)}%`);
  }

  return new XMLSerializer().serializeToString(xmlDoc);
}

function updateBackgroundLinearAngleInSvg(
  svgString: string,
  gradientId: string,
  nextAngle: number,
): string {
  if (typeof window === "undefined") {
    return svgString;
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(svgString, "image/svg+xml");
  const escapedGradientId = escapeCssIdentifier(gradientId);
  const gradient = xmlDoc.querySelector(`linearGradient#${escapedGradientId}`);
  if (!gradient) {
    return svgString;
  }

  const normalized = ((nextAngle % 360) + 360) % 360;
  const radians = (normalized * Math.PI) / 180;
  const x1 = 50 - 50 * Math.cos(radians);
  const y1 = 50 - 50 * Math.sin(radians);
  const x2 = 50 + 50 * Math.cos(radians);
  const y2 = 50 + 50 * Math.sin(radians);

  gradient.setAttribute("x1", `${x1.toFixed(2)}%`);
  gradient.setAttribute("y1", `${y1.toFixed(2)}%`);
  gradient.setAttribute("x2", `${x2.toFixed(2)}%`);
  gradient.setAttribute("y2", `${y2.toFixed(2)}%`);

  return new XMLSerializer().serializeToString(xmlDoc);
}

export default function EditorPage() {
  const [history, setHistory] = useState<HistoryState>({
    past: [],
    present: ensureEmbeddedFontStyles(DEFAULT_SVG),
    future: [],
  });
  const [customTemplates, setCustomTemplates] = useState<TemplateLibraryItem[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedPlaceholderId, setSelectedPlaceholderId] = useState<string | null>(null);
  const [originalPlaceholderImages, setOriginalPlaceholderImages] = useState<Record<string, string>>(
    {},
  );
  const [status, setStatus] = useState<string | null>(null);
  const quickUploadInputRef = useRef<HTMLInputElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [selectedExportFormat, setSelectedExportFormat] = useState<"svg" | "png">("svg");

  const sanitizedSvg = useMemo(() => sanitizeSvg(history.present), [history.present]);
  const canvasDimensions = useMemo(() => parseSvgDimensions(history.present), [history.present]);
  const placeholderIds = useMemo(() => extractPlaceholderIds(history.present), [history.present]);
  const textEntries = useMemo(() => extractTextEntries(history.present), [history.present]);
  const backgroundControls = useMemo(
    () => extractBackgroundControls(history.present),
    [history.present],
  );
  const templateEntries = useMemo(
    () => [...BUILTIN_TEMPLATES, ...customTemplates],
    [customTemplates],
  );

  useEffect(() => {
    const raw = window.localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!raw) {
      return;
    }
    try {
      const parsed = JSON.parse(raw) as Array<{ id: string; name: string; svg: string }>;
      const restored = parsed
        .filter((entry) => Boolean(entry?.id && entry?.name && entry?.svg))
        .map((entry) => ({
          id: entry.id,
          name: entry.name,
          svg: ensureEmbeddedFontStyles(entry.svg),
          builtin: false,
        }));
      setCustomTemplates(restored);
    } catch {
      setCustomTemplates([]);
    }
  }, []);

  useEffect(() => {
    const payload = customTemplates.map(({ id, name, svg }) => ({ id, name, svg }));
    try {
      window.localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      const isQuotaError =
        error instanceof DOMException &&
        (error.name === "QuotaExceededError" || error.code === 22);

      if (isQuotaError) {
        setStatus("Template storage is full. Delete some custom templates or save smaller ones.");
        return;
      }

      setStatus("Failed to persist template library.");
    }
  }, [customTemplates]);

  useEffect(() => {
    if (!status) {
      return;
    }

    const timer = window.setTimeout(() => setStatus(null), 3200);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!exportMenuRef.current) {
        return;
      }
      const target = event.target as Node | null;
      if (target && !exportMenuRef.current.contains(target)) {
        setExportMenuOpen(false);
      }
    };

    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, []);

  const commitSvg = useCallback(
    (nextSvg: string) => {
      const nextSvgWithFonts = ensureEmbeddedFontStyles(nextSvg);

      setHistory((prev) => {
        if (prev.present === nextSvgWithFonts) {
          return prev;
        }
        return {
          past: [...prev.past, prev.present],
          present: nextSvgWithFonts,
          future: [],
        };
      });

      setSelectedPlaceholderId((current) =>
        current && extractPlaceholderIds(nextSvgWithFonts).includes(current) ? current : null,
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

      setOriginalPlaceholderImages((prev) => {
        if (prev[selectedPlaceholderId]) {
          return prev;
        }
        const originalHref = extractFirstPlaceholderImageHref({
          svgString: history.present,
          placeholderId: selectedPlaceholderId,
        });
        if (!originalHref) {
          return prev;
        }
        return {
          ...prev,
          [selectedPlaceholderId]: originalHref,
        };
      });

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

  const restoreSelectedPlaceholderImage = useCallback(() => {
    if (!selectedPlaceholderId) {
      setStatus("Select an image placeholder first.");
      return;
    }

    const originalHref = originalPlaceholderImages[selectedPlaceholderId];
    if (!originalHref) {
      setStatus("No original image snapshot stored for this placeholder yet.");
      return;
    }

    const updated = replaceImageInSvg({
      svgString: history.present,
      placeholderId: selectedPlaceholderId,
      dataUrl: originalHref,
    });

    if (updated.replacements === 0) {
      setStatus("Could not restore original image for this placeholder.");
      return;
    }

    commitSvg(updated.svgString);
    setStatus("Original image restored.");
  }, [commitSvg, history.present, originalPlaceholderImages, selectedPlaceholderId]);

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
    quickUploadInputRef.current?.click();
  }, []);

  const onTextChange = useCallback(
    (key: string, value: string) => {
      const updated = updateTextInSvg(history.present, key, value);
      commitSvg(updated);
    },
    [commitSvg, history.present],
  );

  const onBackgroundColorChange = useCallback(
    (value: string) => {
      const updated = updateBackgroundColorInSvg(history.present, value);
      commitSvg(updated);
      setStatus("Background updated.");
    },
    [commitSvg, history.present],
  );

  const onBackgroundGradientStopColorChange = useCallback(
    (key: string, color: string) => {
      const match = key.match(/^bg-stop:(\d+)$/);
      if (!match || !backgroundControls.gradientId) {
        return;
      }
      const updated = updateBackgroundGradientStopInSvg(
        history.present,
        backgroundControls.gradientId,
        Number(match[1]),
        { color },
      );
      commitSvg(updated);
      setStatus("Gradient stop updated.");
    },
    [backgroundControls.gradientId, commitSvg, history.present],
  );

  const onBackgroundGradientStopOffsetChange = useCallback(
    (key: string, offset: number) => {
      const match = key.match(/^bg-stop:(\d+)$/);
      if (!match || !backgroundControls.gradientId) {
        return;
      }
      const updated = updateBackgroundGradientStopInSvg(
        history.present,
        backgroundControls.gradientId,
        Number(match[1]),
        { offset },
      );
      commitSvg(updated);
      setStatus("Gradient stop updated.");
    },
    [backgroundControls.gradientId, commitSvg, history.present],
  );

  const onBackgroundGradientAngleChange = useCallback(
    (angle: number) => {
      if (!backgroundControls.gradientId || backgroundControls.kind !== "linear-gradient") {
        return;
      }
      const updated = updateBackgroundLinearAngleInSvg(
        history.present,
        backgroundControls.gradientId,
        angle,
      );
      commitSvg(updated);
      setStatus("Gradient angle updated.");
    },
    [backgroundControls.gradientId, backgroundControls.kind, commitSvg, history.present],
  );

  const onApplyTemplate = useCallback(() => {
    if (!selectedTemplateId) {
      return;
    }
    const template = templateEntries.find((item) => item.id === selectedTemplateId);
    if (!template) {
      return;
    }
    commitSvg(template.svg);
    setSelectedPlaceholderId(null);
    setStatus(`Loaded template: ${template.name}`);
  }, [commitSvg, selectedTemplateId, templateEntries]);

  const onSaveCurrentTemplate = useCallback(() => {
    const name = window.prompt("Template name");
    if (!name?.trim()) {
      return;
    }

    const compact = stripLargeEmbeddedImagesForTemplate(history.present);
    const preparedSvg = compact.svg;
    const id = `custom:${Date.now()}`;
    const nextItem: TemplateLibraryItem = {
      id,
      name: name.trim(),
      svg: preparedSvg,
      builtin: false,
    };

    const nextTemplates = [...customTemplates, nextItem];
    const nextPayload = JSON.stringify(
      nextTemplates.map(({ id: templateId, name: templateName, svg }) => ({
        id: templateId,
        name: templateName,
        svg,
      })),
    );

    if (getUtf8Bytes(nextPayload) > MAX_TEMPLATE_STORAGE_BYTES) {
      setStatus("Template too large for browser storage. Reduce embedded image size.");
      return;
    }

    setCustomTemplates(nextTemplates);
    setSelectedTemplateId(id);
    setStatus(
      compact.strippedCount > 0
        ? `Saved template: ${nextItem.name} (large embedded images replaced with placeholders)`
        : `Saved template: ${nextItem.name}`,
    );
  }, [customTemplates, history.present]);

  const onDeleteSelectedTemplate = useCallback(() => {
    if (!selectedTemplateId || selectedTemplateId.startsWith("builtin:")) {
      return;
    }
    setCustomTemplates((prev) => prev.filter((item) => item.id !== selectedTemplateId));
    setSelectedTemplateId(null);
    setStatus("Custom template deleted.");
  }, [selectedTemplateId]);

  const onResetComponent = useCallback(() => {
    commitSvg(DEFAULT_SVG);
    setSelectedPlaceholderId(null);
    setStatus("Component reset.");
  }, [commitSvg]);

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
      const rasterSafeSvg = makeRasterSafeSvg(history.present);
      if (hasExternalResourceReference(rasterSafeSvg)) {
        setStatus("PNG/JPG export blocked: SVG still has external references after sanitizing.");
        return;
      }
      const { width, height } = parseSvgDimensions(rasterSafeSvg);
      const blob = new Blob([rasterSafeSvg], { type: "image/svg+xml" });
      const svgUrl = URL.createObjectURL(blob);

      try {
        const image = new Image();
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
        let dataUrl: string;
        try {
          dataUrl = canvas.toDataURL(type, 0.92);
        } catch {
          throw new Error(
            "Export failed due to browser canvas security (tainted canvas). Remove external SVG refs and try again.",
          );
        }
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = type === "image/png" ? "template.png" : "template.jpg";
        link.click();
        setStatus(type === "image/png" ? "PNG exported." : "JPG exported.");
      } catch (error) {
        setStatus(error instanceof Error ? error.message : "Raster export failed.");
      } finally {
        URL.revokeObjectURL(svgUrl);
      }
    },
    [history.present],
  );

  const shareCurrentPage = useCallback(async () => {
    const shareUrl = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Framekit",
          text: "Check this template in Framekit",
          url: shareUrl,
        });
        setStatus("Link shared.");
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setStatus("Link copied to clipboard.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Failed to share link.");
    }
  }, []);

  return (
    <main className="editor-layout">
      <input
        ref={quickUploadInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/svg+xml"
        style={{ display: "none" }}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (!file) {
            return;
          }
          void onLocalPick(file);
          event.currentTarget.value = "";
        }}
      />

      <Sidebar
        templateEntries={templateEntries.map(({ id, name, builtin }) => ({ id, name, builtin }))}
        selectedTemplateId={selectedTemplateId}
        onSelectTemplate={setSelectedTemplateId}
        onApplyTemplate={onApplyTemplate}
        onSaveCurrentTemplate={onSaveCurrentTemplate}
        onDeleteSelectedTemplate={onDeleteSelectedTemplate}
        selectedPlaceholderId={selectedPlaceholderId}
        placeholderIds={placeholderIds}
        onSelectPlaceholder={setSelectedPlaceholderId}
        canRestorePlaceholderImage={Boolean(
          selectedPlaceholderId && originalPlaceholderImages[selectedPlaceholderId],
        )}
        onRestorePlaceholderImage={restoreSelectedPlaceholderImage}
        onLocalPick={onLocalPick}
        onResetComponent={onResetComponent}
      />

      <section className="canvas-panel">
        <header className="toolbar">
          <div className="toolbar-actions">
            <button
              type="button"
              className="icon-only-button"
              onClick={undo}
              disabled={history.past.length === 0}
              title="Undo"
              aria-label="Undo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
                <path d="M224,128a96,96,0,0,1-94.71,96H128A95.38,95.38,0,0,1,62.1,197.8a8,8,0,0,1,11-11.63A80,80,0,1,0,71.43,71.39a3.07,3.07,0,0,1-.26.25L44.59,96H72a8,8,0,0,1,0,16H24a8,8,0,0,1-8-8V56a8,8,0,0,1,16,0V85.8L60.25,60A96,96,0,0,1,224,128Z" />
              </svg>
            </button>
            <button
              type="button"
              className="icon-only-button"
              onClick={redo}
              disabled={history.future.length === 0}
              title="Redo"
              aria-label="Redo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
                <path d="M240,56v48a8,8,0,0,1-8,8H184a8,8,0,0,1,0-16H211.4L184.81,71.64l-.25-.24a80,80,0,1,0-1.67,114.78,8,8,0,0,1,11,11.63A95.44,95.44,0,0,1,128,224h-1.32A96,96,0,1,1,195.75,60L224,85.8V56a8,8,0,1,1,16,0Z" />
              </svg>
            </button>
            <div className="export-menu" ref={exportMenuRef}>
              <button
                type="button"
                className="export-menu-trigger"
                onClick={() => setExportMenuOpen((prev) => !prev)}
                aria-expanded={exportMenuOpen}
                aria-haspopup="menu"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
                  <path d="M216,112v96a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V112A16,16,0,0,1,56,96H80a8,8,0,0,1,0,16H56v96H200V112H176a8,8,0,0,1,0-16h24A16,16,0,0,1,216,112ZM93.66,69.66,120,43.31V136a8,8,0,0,0,16,0V43.31l26.34,26.35a8,8,0,0,0,11.32-11.32l-40-40a8,8,0,0,0-11.32,0l-40,40A8,8,0,0,0,93.66,69.66Z" />
                </svg>
                Export
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
                  <path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80a8,8,0,0,1,11.32-11.32L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
                </svg>
              </button>

              {exportMenuOpen && (
                <div className="export-menu-list" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setSelectedExportFormat("svg");
                      setExportMenuOpen(false);
                      exportSvg();
                    }}
                  >
                    SVG
                    {selectedExportFormat === "svg" ? <span>✓</span> : null}
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setSelectedExportFormat("png");
                      setExportMenuOpen(false);
                      void exportRaster("image/png");
                    }}
                  >
                    PNG
                    {selectedExportFormat === "png" ? <span>✓</span> : null}
                  </button>
                </div>
              )}
            </div>
            <button type="button" onClick={() => void shareCurrentPage()}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
                <path d="M229.66,109.66l-48,48a8,8,0,0,1-11.32-11.32L204.69,112H165a88,88,0,0,0-85.23,66,8,8,0,0,1-15.5-4A103.94,103.94,0,0,1,165,96h39.71L170.34,61.66a8,8,0,0,1,11.32-11.32l48,48A8,8,0,0,1,229.66,109.66ZM192,208H40V88a8,8,0,0,0-16,0V216a8,8,0,0,0,8,8H192a8,8,0,0,0,0-16Z" />
              </svg>
              Share
            </button>
          </div>
        </header>

        <div className="canvas-shell" onClick={onCanvasClick}>
          <div
            className="svg-canvas"
            style={{ width: `${canvasDimensions.width}px`, height: `${canvasDimensions.height}px` }}
            dangerouslySetInnerHTML={{ __html: sanitizedSvg }}
          />
        </div>
      </section>

      <LayersSidebar
        backgroundKind={backgroundControls.kind}
        backgroundColor={backgroundControls.color}
        onBackgroundColorChange={onBackgroundColorChange}
        backgroundGradientAngle={backgroundControls.angle}
        onBackgroundGradientAngleChange={onBackgroundGradientAngleChange}
        backgroundGradientStops={backgroundControls.stops}
        onBackgroundGradientStopColorChange={onBackgroundGradientStopColorChange}
        onBackgroundGradientStopOffsetChange={onBackgroundGradientStopOffsetChange}
        textEntries={textEntries}
        onTextChange={onTextChange}
      />

      {status && <div className="status-toast">{status}</div>}
    </main>
  );
}
