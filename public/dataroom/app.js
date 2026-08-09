(() => {
  const FOLDER_MIME = "application/vnd.google-apps.folder";

  // Drive MIME type -> what a person calls the thing. Google-native files are
  // named as such because they behave differently from an uploaded file: the
  // worker exports them, rather than streaming the stored bytes.
  const TYPES = {
    [FOLDER_MIME]: { label: "Folder", icon: "\u{1F4C1}" }, // 📁
    "application/vnd.google-apps.document": {
      label: "Google Doc",
      icon: "\u{1F4C4}", // 📄
    },
    "application/vnd.google-apps.spreadsheet": {
      label: "Google Sheet",
      icon: "\u{1F4CA}", // 📊
    },
    "application/vnd.google-apps.presentation": {
      label: "Google Slides",
      icon: "\u{1F5BC}", // 🖼
    },
    "application/pdf": { label: "PDF", icon: "\u{1F4D5}" }, // 📕
    "application/msword": { label: "Document", icon: "\u{1F4C4}" },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
      label: "Document",
      icon: "\u{1F4C4}",
    },
    "application/vnd.ms-excel": { label: "Spreadsheet", icon: "\u{1F4CA}" },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
      label: "Spreadsheet",
      icon: "\u{1F4CA}",
    },
    "application/vnd.ms-powerpoint": {
      label: "Presentation",
      icon: "\u{1F5BC}",
    },
    "application/vnd.openxmlformats-officedocument.presentationml.presentation":
      {
        label: "Presentation",
        icon: "\u{1F5BC}",
      },
    "application/zip": { label: "Archive", icon: "\u{1F5DC}" }, // 🗜
    "application/x-zip-compressed": { label: "Archive", icon: "\u{1F5DC}" },
    "text/csv": { label: "CSV", icon: "\u{1F4CA}" },
    "text/plain": { label: "Text", icon: "\u{1F4C4}" },
  };

  // Anything not named above falls back to its family, then to the file
  // extension, then to a plain "File". Never the raw MIME string: a .docx
  // would render as "vnd.openxmlformats-officedocument.wordprocessingml
  // .document", which is what this replaced.
  const FAMILIES = [
    ["image/", { label: "Image", icon: "\u{1F5BC}" }],
    ["video/", { label: "Video", icon: "\u{1F3AC}" }], // 🎬
    ["audio/", { label: "Audio", icon: "\u{1F3B5}" }], // 🎵
    ["text/", { label: "Text", icon: "\u{1F4C4}" }],
  ];

  function extensionOf(name) {
    const dot = (name || "").lastIndexOf(".");
    if (dot <= 0 || dot === name.length - 1) return null;
    const ext = name.slice(dot + 1);
    return /^[a-z0-9]{1,5}$/i.test(ext) ? ext.toUpperCase() : null;
  }

  function describe(file) {
    const known = TYPES[file.mimeType];
    if (known) return known;
    for (const [prefix, family] of FAMILIES) {
      if ((file.mimeType || "").startsWith(prefix)) return family;
    }
    return { label: extensionOf(file.name) || "File", icon: "\u{1F4CE}" }; // 📎
  }

  function formatModified(iso) {
    if (!iso) return "-";
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const ROOT_NAME = "Fund 2 Data Room";

  // trail: [{id, name}], root first. null id = the drive-configured root.
  let trail = [{ id: null, name: ROOT_NAME }];

  // Folder names we have already seen, so returning to a path via Back does not
  // need to re-ask Drive what each ancestor is called.
  const nameById = new Map();

  const breadcrumbsEl = document.getElementById("breadcrumbs");
  const contentEl = document.getElementById("content");

  // ── URL state ──────────────────────────────────────────────────────────────
  // The hash holds the folder ids from the root down, so Back and Forward walk
  // the tree and a link to a subfolder opens there. It stays a fragment: the
  // worker never sees it, so no route or gate change is involved.

  function pathFromHash() {
    return location.hash
      .replace(/^#\/?/, "")
      .split("/")
      .filter(Boolean)
      .map(decodeURIComponent);
  }

  function hashForPath(ids) {
    return ids.length ? `#/${ids.map(encodeURIComponent).join("/")}` : "#/";
  }

  function currentPathIds() {
    return trail.slice(1).map((node) => node.id);
  }

  // Ask Drive what a folder is called. Only used for a cold load of a deep
  // link, where we have ids from the URL but have never seen their names.
  async function resolveName(id) {
    if (nameById.has(id)) return nameById.get(id);
    try {
      const resp = await fetch(
        `/dataroom/api/list?folder=${encodeURIComponent(id)}`,
      );
      if (!resp.ok) return null;
      const data = await resp.json();
      const name = data.folder && data.folder.name;
      if (name) nameById.set(id, name);
      return name || null;
    } catch {
      return null;
    }
  }

  // Only the ancestors need a lookup. load() names the folder we are opening
  // from its own response, so asking Drive for it here would fetch it twice.
  async function trailForPath(ids) {
    const nodes = [{ id: null, name: ROOT_NAME }];
    if (!ids.length) return nodes;
    const ancestors = ids.slice(0, -1);
    const names = await Promise.all(ancestors.map(resolveName));
    ancestors.forEach((id, i) => {
      nodes.push({ id, name: names[i] || "…" });
    });
    const last = ids[ids.length - 1];
    nodes.push({ id: last, name: nameById.get(last) || "…" });
    return nodes;
  }

  // ── rendering ──────────────────────────────────────────────────────────────

  function renderBreadcrumbs() {
    breadcrumbsEl.innerHTML = "";
    trail.forEach((node, i) => {
      if (i > 0) {
        const sep = document.createElement("span");
        sep.className = "sep";
        sep.textContent = "/";
        breadcrumbsEl.appendChild(sep);
      }
      if (i === trail.length - 1) {
        const span = document.createElement("span");
        span.className = "current";
        span.textContent = node.name;
        breadcrumbsEl.appendChild(span);
      } else {
        const btn = document.createElement("button");
        btn.textContent = node.name;
        btn.addEventListener("click", () => {
          navigateTo(currentPathIds().slice(0, i));
        });
        breadcrumbsEl.appendChild(btn);
      }
    });
  }

  function openFolder(file) {
    nameById.set(file.id, file.name);
    navigateTo(currentPathIds().concat(file.id));
  }

  function openFile(file) {
    window.open(
      `/dataroom/api/file?id=${encodeURIComponent(file.id)}`,
      "_blank",
    );
  }

  // Writing the hash is the only way to move: the hashchange handler below then
  // does the loading, so a click and a Back button take exactly the same path.
  function navigateTo(ids) {
    const next = hashForPath(ids);
    if (location.hash === next || (!location.hash && next === "#/")) {
      renderFromHash();
      return;
    }
    location.hash = next;
  }

  function renderFiles(files) {
    if (!files.length) {
      contentEl.innerHTML = '<div class="empty">This folder is empty.</div>';
      return;
    }

    const table = document.createElement("table");
    table.innerHTML = `
      <thead>
        <tr><th>Name</th><th>Type</th><th>Modified</th></tr>
      </thead>
      <tbody></tbody>
    `;
    const tbody = table.querySelector("tbody");

    files.forEach((file) => {
      const tr = document.createElement("tr");
      tr.className = "row";
      const isFolder = file.mimeType === FOLDER_MIME;
      const type = describe(file);

      tr.innerHTML = `
        <td class="name-cell"><span class="icon">${type.icon}</span><span>${escapeHtml(file.name)}</span></td>
        <td>${escapeHtml(type.label)}</td>
        <td class="modified">${formatModified(file.modifiedTime)}</td>
      `;
      tr.addEventListener("click", () =>
        isFolder ? openFolder(file) : openFile(file),
      );
      tbody.appendChild(tr);
    });

    contentEl.innerHTML = "";
    contentEl.appendChild(table);
  }

  function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }

  async function load(folderId) {
    contentEl.innerHTML = '<div class="loading">Loading…</div>';
    renderBreadcrumbs();
    try {
      const params = folderId ? `?folder=${encodeURIComponent(folderId)}` : "";
      const resp = await fetch(`/dataroom/api/list${params}`);
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      if (data.folder && data.folder.name) {
        trail[trail.length - 1].name = data.folder.name;
        if (folderId) nameById.set(folderId, data.folder.name);
      }
      data.files.forEach((f) => {
        if (f.mimeType === FOLDER_MIME) nameById.set(f.id, f.name);
      });
      renderBreadcrumbs();
      renderFiles(data.files);
    } catch (err) {
      contentEl.innerHTML = `<div class="error">Couldn't load this folder: ${escapeHtml(String(err.message || err))}</div>`;
    }
  }

  async function renderFromHash() {
    const ids = pathFromHash();
    trail = await trailForPath(ids);
    load(ids.length ? ids[ids.length - 1] : null);
  }

  window.addEventListener("hashchange", renderFromHash);
  renderFromHash();
})();
