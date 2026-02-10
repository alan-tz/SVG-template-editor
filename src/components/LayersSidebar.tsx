"use client";

import { useEffect, useState } from "react";

type LayersSidebarProps = {
  backgroundKind: "solid" | "linear-gradient" | "radial-gradient";
  backgroundColor: string;
  onBackgroundColorChange: (value: string) => void;
  backgroundGradientAngle: number | null;
  onBackgroundGradientAngleChange: (value: number) => void;
  backgroundGradientStops: Array<{
    key: string;
    label: string;
    color: string;
    offset: number;
  }>;
  onBackgroundGradientStopColorChange: (key: string, color: string) => void;
  onBackgroundGradientStopOffsetChange: (key: string, offset: number) => void;
  textEntries: Array<{ key: string; label: string; value: string }>;
  onTextChange: (key: string, value: string) => void;
};

export function LayersSidebar(props: LayersSidebarProps) {
  const {
    backgroundKind,
    backgroundColor,
    onBackgroundColorChange,
    backgroundGradientAngle,
    onBackgroundGradientAngleChange,
    backgroundGradientStops,
    onBackgroundGradientStopColorChange,
    onBackgroundGradientStopOffsetChange,
    textEntries,
    onTextChange,
  } = props;

  const [hexDraft, setHexDraft] = useState(backgroundColor.toUpperCase());

  useEffect(() => {
    setHexDraft(backgroundColor.toUpperCase());
  }, [backgroundColor]);

  const commitHexColor = (value: string) => {
    const normalized = value.trim().startsWith("#") ? value.trim() : `#${value.trim()}`;
    if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(normalized)) {
      setHexDraft(backgroundColor.toUpperCase());
      return;
    }
    onBackgroundColorChange(normalized);
  };

  return (
    <aside className="layers-sidebar">
      <div className="layers-top-spacer" aria-hidden="true" />

      <div className="sidebar-scroll">
        <div className="sidebar-section">
          <h2 className="sidebar-title">Layers</h2>
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-subtitle">Background</h3>
          <p className="sidebar-helper">Mode: {backgroundKind}</p>
          <label className="color-picker-row" htmlFor="background-color-picker">
            <span className="color-swatch" style={{ backgroundColor }} />
            <input
              id="background-color-picker"
              type="color"
              value={backgroundColor}
              className="color-picker-native"
              onChange={(event) => onBackgroundColorChange(event.target.value)}
            />
            <input
              type="text"
              value={hexDraft}
              className="color-hex-input"
              onChange={(event) => setHexDraft(event.target.value.toUpperCase())}
              onBlur={(event) => commitHexColor(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  commitHexColor((event.target as HTMLInputElement).value);
                }
              }}
            />
          </label>
          {backgroundGradientStops.length > 0 && (
            <div className="gradient-editor">
              {backgroundKind === "linear-gradient" && backgroundGradientAngle !== null && (
                <label className="text-edit-row">
                  Angle ({Math.round(backgroundGradientAngle)}deg)
                  <input
                    type="range"
                    min={0}
                    max={360}
                    step={1}
                    value={backgroundGradientAngle}
                    onChange={(event) => onBackgroundGradientAngleChange(Number(event.target.value))}
                  />
                </label>
              )}
              {backgroundGradientStops.map((stop) => (
                <div key={stop.key} className="gradient-stop-row">
                  <label className="text-edit-row">
                    {stop.label}
                    <input
                      type="color"
                      value={stop.color}
                      onChange={(event) =>
                        onBackgroundGradientStopColorChange(stop.key, event.target.value)
                      }
                    />
                  </label>
                  <label className="text-edit-row">
                    Offset ({Math.round(stop.offset)}%)
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={stop.offset}
                      onChange={(event) =>
                        onBackgroundGradientStopOffsetChange(stop.key, Number(event.target.value))
                      }
                    />
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="sidebar-section">
          <h3 className="sidebar-subtitle">Texts</h3>
          {textEntries.length === 0 ? (
            <p className="sidebar-helper">No editable text found in SVG.</p>
          ) : (
            textEntries.map((entry) => (
              <label key={entry.key} className="text-edit-row">
                {entry.label}
                <input
                  type="text"
                  value={entry.value}
                  onChange={(event) => onTextChange(entry.key, event.target.value)}
                />
              </label>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
