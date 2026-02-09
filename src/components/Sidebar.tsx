"use client";

type SidebarProps = {
  selectedPlaceholderId: string | null;
  placeholderIds: string[];
  onSelectPlaceholder: (id: string | null) => void;
  backgroundColor: string;
  onBackgroundColorChange: (value: string) => void;
  textEntries: Array<{ key: string; label: string; value: string }>;
  onTextChange: (key: string, value: string) => void;
  googleBusy: boolean;
  onGooglePick: () => void;
  onLocalPick: (file: File) => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

export function Sidebar(props: SidebarProps) {
  const {
    selectedPlaceholderId,
    placeholderIds,
    onSelectPlaceholder,
    backgroundColor,
    onBackgroundColorChange,
    textEntries,
    onTextChange,
    googleBusy,
    onGooglePick,
    onLocalPick,
    onUndo,
    onRedo,
    canUndo,
    canRedo,
  } = props;

  return (
    <aside className="sidebar">
      <h2 className="sidebar-title">Assets</h2>

      <div className="sidebar-section">
        <h3 className="sidebar-subtitle">Placeholder</h3>
        <select
          value={selectedPlaceholderId ?? ""}
          onChange={(event) => onSelectPlaceholder(event.target.value || null)}
        >
          <option value="">None selected</option>
          {placeholderIds.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-subtitle">Background</h3>
        <input
          type="color"
          value={backgroundColor}
          onChange={(event) => onBackgroundColorChange(event.target.value)}
        />
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-subtitle">Text</h3>
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

      <div className="sidebar-section">
        <label className="file-upload-label" htmlFor="local-image-upload">
          Upload from Computer
        </label>
        <input
          id="local-image-upload"
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/svg+xml"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (!file) {
              return;
            }
            onLocalPick(file);
            event.currentTarget.value = "";
          }}
        />
      </div>

      <div className="sidebar-section">
        <h3 className="sidebar-subtitle">Google Drive</h3>
        <button type="button" onClick={onGooglePick} disabled={googleBusy}>
          {googleBusy ? "Connecting to Google..." : "Choose from Google Drive"}
        </button>
        <p className="sidebar-helper">
          {selectedPlaceholderId
            ? `Selected placeholder: ${selectedPlaceholderId}`
            : "Select an image placeholder first"}
        </p>
      </div>

      <div className="sidebar-section history-actions">
        <button type="button" onClick={onUndo} disabled={!canUndo}>
          Undo
        </button>
        <button type="button" onClick={onRedo} disabled={!canRedo}>
          Redo
        </button>
      </div>
    </aside>
  );
}
