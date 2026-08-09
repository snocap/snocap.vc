(() => {
  const FOLDER_MIME = "application/vnd.google-apps.folder";

  const ICONS = {
    [FOLDER_MIME]: "\u{1F4C1}", // 📁
    "application/vnd.google-apps.document": "\u{1F4C4}", // 📄
    "application/vnd.google-apps.spreadsheet": "\u{1F4CA}", // 📊
    "application/vnd.google-apps.presentation": "\u{1F5BC}", // 🖼
    "application/pdf": "\u{1F4D5}", // 📕
  };

  function iconFor(mimeType) {
    return ICONS[mimeType] || "\u{1F4CE}"; // 📎 fallback
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

  // trail: [{id, name}], root first. null id = the drive-configured root.
  let trail = [{ id: null, name: "Fund 2 Data Room" }];

  const breadcrumbsEl = document.getElementById("breadcrumbs");
  const contentEl = document.getElementById("content");

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
          trail = trail.slice(0, i + 1);
          load(node.id);
        });
        breadcrumbsEl.appendChild(btn);
      }
    });
  }

  function openFolder(file) {
    trail.push({ id: file.id, name: file.name });
    load(file.id);
  }

  function openFile(file) {
    window.open(
      `/dealroom/api/file?id=${encodeURIComponent(file.id)}`,
      "_blank",
    );
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

      tr.innerHTML = `
        <td class="name-cell"><span class="icon">${iconFor(file.mimeType)}</span><span>${escapeHtml(file.name)}</span></td>
        <td>${isFolder ? "Folder" : friendlyType(file.mimeType)}</td>
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

  function friendlyType(mimeType) {
    if (mimeType === "application/vnd.google-apps.document") return "Doc";
    if (mimeType === "application/vnd.google-apps.spreadsheet") return "Sheet";
    if (mimeType === "application/vnd.google-apps.presentation")
      return "Slides";
    if (mimeType === "application/pdf") return "PDF";
    return mimeType.split("/").pop();
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
      const resp = await fetch(`/dealroom/api/list${params}`);
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${resp.status}`);
      }
      const data = await resp.json();
      if (trail.length === 1) trail[0].name = data.folder.name;
      renderBreadcrumbs();
      renderFiles(data.files);
    } catch (err) {
      contentEl.innerHTML = `<div class="error">Couldn't load this folder: ${escapeHtml(String(err.message || err))}</div>`;
    }
  }

  load(null);
})();
