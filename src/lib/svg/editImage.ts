const XLINK_NS = "http://www.w3.org/1999/xlink";

function setImageHref(image: Element, dataUrl: string) {
  image.setAttribute("href", dataUrl);
  image.setAttributeNS(XLINK_NS, "xlink:href", dataUrl);
  image.setAttribute("preserveAspectRatio", "xMidYMid slice");
}

function escapeCssIdentifier(value: string): string {
  return value.replace(/([!"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, "\\$1");
}

function collectUrlPaintPatternIds(root: Element): Set<string> {
  const patternIds = new Set<string>();

  const elements = [root, ...Array.from(root.querySelectorAll("*"))];
  const extractFromValue = (value: string | null) => {
    if (!value) {
      return;
    }

    const regex = /url\(#([^\)]+)\)/g;
    let match = regex.exec(value);
    while (match) {
      patternIds.add(match[1]);
      match = regex.exec(value);
    }
  };

  for (const element of elements) {
    extractFromValue(element.getAttribute("fill"));
    extractFromValue(element.getAttribute("stroke"));
    extractFromValue(element.getAttribute("style"));
  }

  return patternIds;
}

function collectPatternImages(pattern: Element, doc: Document): Element[] {
  const images = Array.from(pattern.querySelectorAll("image"));
  if (images.length > 0) {
    return images;
  }

  const hrefValue =
    pattern.getAttribute("href") ??
    pattern.getAttribute("xlink:href") ??
    pattern.getAttributeNS(XLINK_NS, "href");

  if (!hrefValue?.startsWith("#")) {
    return [];
  }

  const referencedPattern = doc.querySelector(
    `pattern#${escapeCssIdentifier(hrefValue.slice(1))}`,
  );

  if (!referencedPattern) {
    return [];
  }

  return Array.from(referencedPattern.querySelectorAll("image"));
}

export function replaceImageInSvg(options: {
  svgString: string;
  placeholderId: string;
  dataUrl: string;
}): { svgString: string; replacements: number } {
  const { svgString, placeholderId, dataUrl } = options;
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(svgString, "image/svg+xml");

  const target = xmlDoc.getElementById(placeholderId);
  if (!target) {
    return { svgString, replacements: 0 };
  }

  let replacements = 0;

  const directImages: Element[] = [];
  if (target.tagName.toLowerCase() === "image") {
    directImages.push(target);
  }
  directImages.push(...Array.from(target.querySelectorAll("image")));

  const uniqueDirectImages = Array.from(new Set(directImages));
  for (const image of uniqueDirectImages) {
    setImageHref(image, dataUrl);
    replacements += 1;
  }

  const patternIds = collectUrlPaintPatternIds(target);
  for (const patternId of patternIds) {
    const pattern = xmlDoc.querySelector(`pattern#${escapeCssIdentifier(patternId)}`);
    if (!pattern) {
      continue;
    }

    const patternImages = collectPatternImages(pattern, xmlDoc);
    for (const image of patternImages) {
      setImageHref(image, dataUrl);
      replacements += 1;
    }
  }

  if (replacements === 0) {
    return { svgString, replacements: 0 };
  }

  return {
    svgString: new XMLSerializer().serializeToString(xmlDoc),
    replacements,
  };
}
