const XLINK_NS = "http://www.w3.org/1999/xlink";

function setImageHref(image: Element, dataUrl: string) {
  // Write both modern and legacy SVG forms for broad renderer compatibility.
  image.setAttribute("href", dataUrl);
  image.setAttribute("xlink:href", dataUrl);
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
  const collected = new Set<Element>();
  const visitedPatterns = new Set<string>();

  const resolveReferencedId = (element: Element): string | null => {
    const hrefValue =
      element.getAttribute("href") ??
      element.getAttribute("xlink:href") ??
      element.getAttributeNS(XLINK_NS, "href");

    if (!hrefValue?.startsWith("#")) {
      return null;
    }

    return hrefValue.slice(1);
  };

  const collectFromPattern = (currentPattern: Element) => {
    const patternId = currentPattern.getAttribute("id");
    if (patternId) {
      if (visitedPatterns.has(patternId)) {
        return;
      }
      visitedPatterns.add(patternId);
    }

    for (const image of Array.from(currentPattern.querySelectorAll("image"))) {
      collected.add(image);
    }

    const patternRefId = resolveReferencedId(currentPattern);
    if (patternRefId) {
      const referencedPattern = doc.querySelector(`pattern#${escapeCssIdentifier(patternRefId)}`);
      if (referencedPattern) {
        collectFromPattern(referencedPattern);
      }
    }

    for (const useElement of Array.from(currentPattern.querySelectorAll("use"))) {
      const useRefId = resolveReferencedId(useElement);
      if (!useRefId) {
        continue;
      }

      const referencedImage = doc.querySelector(`image#${escapeCssIdentifier(useRefId)}`);
      if (referencedImage) {
        collected.add(referencedImage);
      }

      const referencedPattern = doc.querySelector(`pattern#${escapeCssIdentifier(useRefId)}`);
      if (referencedPattern) {
        collectFromPattern(referencedPattern);
      }
    }
  };

  collectFromPattern(pattern);
  return Array.from(collected);
}

export function replaceImageInSvg(options: {
  svgString: string;
  placeholderId: string;
  dataUrl: string;
}): { svgString: string; replacements: number } {
  const { svgString, placeholderId, dataUrl } = options;
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(svgString, "image/svg+xml");
  xmlDoc.documentElement.setAttribute("xmlns:xlink", XLINK_NS);

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

export function extractFirstPlaceholderImageHref(options: {
  svgString: string;
  placeholderId: string;
}): string | null {
  const { svgString, placeholderId } = options;
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(svgString, "image/svg+xml");
  const target = xmlDoc.getElementById(placeholderId);
  if (!target) {
    return null;
  }

  const directImages: Element[] = [];
  if (target.tagName.toLowerCase() === "image") {
    directImages.push(target);
  }
  directImages.push(...Array.from(target.querySelectorAll("image")));

  const uniqueDirectImages = Array.from(new Set(directImages));
  for (const image of uniqueDirectImages) {
    const href =
      image.getAttribute("href") ??
      image.getAttribute("xlink:href") ??
      image.getAttributeNS(XLINK_NS, "href");
    if (href) {
      return href;
    }
  }

  const patternIds = collectUrlPaintPatternIds(target);
  for (const patternId of patternIds) {
    const pattern = xmlDoc.querySelector(`pattern#${escapeCssIdentifier(patternId)}`);
    if (!pattern) {
      continue;
    }
    const patternImages = collectPatternImages(pattern, xmlDoc);
    for (const image of patternImages) {
      const href =
        image.getAttribute("href") ??
        image.getAttribute("xlink:href") ??
        image.getAttributeNS(XLINK_NS, "href");
      if (href) {
        return href;
      }
    }
  }

  return null;
}
