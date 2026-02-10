"use client";

type SidebarProps = {
  templateEntries: Array<{ id: string; name: string; builtin: boolean }>;
  selectedTemplateId: string | null;
  onSelectTemplate: (id: string | null) => void;
  onApplyTemplate: () => void;
  onSaveCurrentTemplate: () => void;
  onDeleteSelectedTemplate: () => void;
  selectedPlaceholderId: string | null;
  placeholderIds: string[];
  onSelectPlaceholder: (id: string | null) => void;
  canRestorePlaceholderImage: boolean;
  onRestorePlaceholderImage: () => void;
  onLocalPick: (file: File) => void;
  onResetComponent: () => void;
};

export function Sidebar(props: SidebarProps) {
  const {
    templateEntries,
    selectedTemplateId,
    onSelectTemplate,
    onApplyTemplate,
    onSaveCurrentTemplate,
    onDeleteSelectedTemplate,
    selectedPlaceholderId,
    placeholderIds,
    onSelectPlaceholder,
    canRestorePlaceholderImage,
    onRestorePlaceholderImage,
    onLocalPick,
    onResetComponent,
  } = props;

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo-icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none">
            <rect
              x="5.75"
              y="7.75"
              width="11.5"
              height="11.5"
              rx="2"
              stroke="#ffffff"
              strokeWidth="0.9"
              opacity="0.65"
            />
            <rect
              x="7.75"
              y="5.75"
              width="11.5"
              height="11.5"
              rx="2"
              fill="#ffffff"
              stroke="#ffffff"
              strokeWidth="0.9"
            />
          </svg>
        </span>
        <h2 className="sidebar-title">Framekit</h2>
      </div>

      <div className="sidebar-scroll">
        <div className="sidebar-section">
          <h3 className="sidebar-subtitle">Template Library</h3>
          <select
            value={selectedTemplateId ?? ""}
            onChange={(event) => onSelectTemplate(event.target.value || null)}
          >
            <option value="">Choose template</option>
            {templateEntries.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
                {template.builtin ? " (Built-in)" : ""}
              </option>
            ))}
          </select>
          <div className="template-toggle-group">
            <button
              type="button"
              className="template-toggle-button"
              onClick={onApplyTemplate}
              disabled={!selectedTemplateId}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
                <path d="M240,136v64a16,16,0,0,1-16,16H32a16,16,0,0,1-16-16V136a16,16,0,0,1,16-16H80a8,8,0,0,1,0,16H32v64H224V136H176a8,8,0,0,1,0-16h48A16,16,0,0,1,240,136ZM85.66,77.66,120,43.31V128a8,8,0,0,0,16,0V43.31l34.34,34.35a8,8,0,0,0,11.32-11.32l-48-48a8,8,0,0,0-11.32,0l-48,48A8,8,0,0,0,85.66,77.66ZM200,168a12,12,0,1,0-12,12A12,12,0,0,0,200,168Z" />
              </svg>
              Load
            </button>
            <button type="button" className="template-toggle-button" onClick={onSaveCurrentTemplate}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 256 256" aria-hidden="true">
                <path d="M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Z" />
              </svg>
              Save
            </button>
          </div>
          <button
            type="button"
            onClick={onDeleteSelectedTemplate}
            disabled={
              !selectedTemplateId ||
              templateEntries.find((item) => item.id === selectedTemplateId)?.builtin === true
            }
          >
            Delete selected template
          </button>
        </div>

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
          <button
            type="button"
            onClick={onRestorePlaceholderImage}
            disabled={!canRestorePlaceholderImage}
          >
            Restore original image
          </button>
        </div>

        <div className="sidebar-section">
          <label className="file-upload-label" htmlFor="local-image-upload">
            Upload from Component
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
        <button type="button" onClick={onResetComponent}>
          Reset component
        </button>
        </div>
      </div>
    </aside>
  );
}
