"use client";

type SidebarProps = {
  selectedPlaceholderId: string | null;
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
