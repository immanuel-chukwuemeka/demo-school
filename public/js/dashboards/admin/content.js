/* ==============================================================
 * ADMIN — Content: Announcements, Gallery, News.
 * ============================================================== */
import { colRef, queryData, doc, addDoc, updateDoc, deleteDoc } from "../../lib/db.js";
import { esc, toast, openModal, fmtDate } from "../../lib/ui.js";
import { viewTitle } from "./shell.js";

/* ---------------- ANNOUNCEMENTS ---------------- */
export async function announcements() {
  const host = document.getElementById("viewRoot");
  host.innerHTML = `${viewTitle("Announcements", "Shown in the announcement banner + student/staff dashboards.", `
      <button class="dbtn dbtn-navy" id="addAnn"><i class="fa-solid fa-plus"></i> New Announcement</button>`)}
    <div class="dash-card"><div class="dc-body">
      <div class="dtable-wrap"><table class="dtable"><thead><tr><th>Title</th><th>Date</th><th>Pinned</th><th>Status</th><th>Actions</th></tr></thead><tbody id="annRows"></tbody></table></div>
    </div></div>`;

  const render = async () => {
    const list = await queryData(colRef("announcements"));
    document.getElementById("annRows").innerHTML = list.map((a) => `
      <tr><td><b style="color:var(--color-primary-dark)">${esc(a.title)}</b><div style="color:var(--color-muted);font-size:.8rem">${esc((a.body || "").slice(0, 70))}…</div></td>
      <td style="color:var(--color-muted)">${fmtDate(a.date)}</td><td>${a.pinned ? '<span class="chip gold"><i class="fa-solid fa-thumbtack"></i> Pinned</span>' : '<span class="pill navy">No</span>'}</td>
      <td>${a.active === false ? '<span class="chip gray">Archived</span>' : '<span class="chip green">Active</span>'}</td>
      <td><div class="flex"><button class="dbtn dbtn-soft" data-edit="${esc(a.id)}"><i class="fa-solid fa-pen"></i></button>
      <button class="dbtn dbtn-danger" data-del="${esc(a.id)}"><i class="fa-solid fa-trash"></i></button></div></td></tr>`).join("") || '<tr><td colspan="5"><div class="empty-state"><p>No announcements.</p></div></td></tr>';
  };

  const open = (a) => {
    const m = openModal(`<div class="form-grid">
      <div class="form-field" style="grid-column:1/-1"><label>Title</label><input id="aTitle" required value="${esc(a?.title || "")}"></div>
      <div class="form-field" style="grid-column:1/-1"><label>Body</label><textarea id="aBody" rows="4">${esc(a?.body || "")}</textarea></div>
      <div class="form-field"><label>Pinned</label><select id="aPinned"><option ${a?.pinned ? "selected" : ""}>Yes</option><option ${!a?.pinned ? "selected" : ""}>No</option></select></div>
      <div class="form-field"><label>Active</label><select id="aActive"><option ${a?.active !== false ? "selected" : ""}>Yes</option><option ${a?.active === false ? "selected" : ""}>No</option></select></div>
    </div><button class="btn btn-gold btn-block mt-3" id="saveAnn">${a ? "Save" : "Add"}</button>`, a ? "Edit Announcement" : "New Announcement", "fa-bullhorn");
    document.getElementById("saveAnn").addEventListener("click", async () => {
      const title = document.getElementById("aTitle").value.trim();
      if (!title) { toast("Title required", "error"); return; }
      const body = { title, body: document.getElementById("aBody").value.trim(), pinned: document.getElementById("aPinned").value === "Yes", active: document.getElementById("aActive").value === "Yes", date: a?.date || new Date() };
      if (a) { await updateDoc(doc(colRef("announcements"), a.id), body); toast("Announcement updated.", "success"); }
      else { await addDoc(colRef("announcements"), body); toast("Announcement added.", "success", "Done"); }
      m.close(); render();
    });
  };

  document.getElementById("addAnn").addEventListener("click", () => open(null));
  document.getElementById("annRows").addEventListener("click", async (e) => {
    const eb = e.target.closest("[data-edit]"); const dbx = e.target.closest("[data-del]");
    const list = await queryData(colRef("announcements"));
    if (eb) open(list.find((x) => x.id === eb.dataset.edit));
    if (dbx) { await deleteDoc(doc(colRef("announcements"), dbx.dataset.del)); toast("Deleted.", "success"); render(); }
  });
  await render();
}

/* ---------------- GALLERY ---------------- */
export async function gallery() {
  const host = document.getElementById("viewRoot");
  host.innerHTML = `${viewTitle("Gallery", "Add school photo highlights. Local images live in /assets/images/gallery/.", `
      <button class="dbtn dbtn-navy" id="addImg"><i class="fa-solid fa-images"></i> Add Image</button>`)}
    <div class="dash-card"><div class="dc-body">
      <div class="grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px" id="galGrid"></div>
    </div></div>`;

  const render = async () => {
    const list = await queryData(colRef("gallery"));
    document.getElementById("galGrid").innerHTML = list.map((g) => `
      <div class="card card-hover overflow-hidden">
        <img src="${esc(g.image)}" alt="${esc(g.title)}" style="width:100%;height:140px;object-fit:cover" onerror="this.src='assets/images/logo/logo.svg'">
        <div style="padding:10px"><b style="color:var(--color-primary-dark)">${esc(g.title)}</b>
        <div class="flex">
          <button class="dbtn dbtn-soft" data-edit="${esc(g.id)}" title="Edit"><i class="fa-solid fa-pen"></i></button>
          ${g.featured ? '<span class="chip gold">Featured</span>' : '<button class="dbtn dbtn-soft" data-feat="' + esc(g.id) + '"><i class="fa-solid fa-star"></i></button>'}
          <button class="dbtn dbtn-danger" data-del="${esc(g.id)}"><i class="fa-solid fa-trash"></i></button>
        </div></div>
      </div>`).join("") || '<div class="empty-state"><p>No gallery images yet.</p></div>';
  };

  const open = (g) => {
    const m = openModal(`<div class="form-grid">
      <div class="form-field"><label>Title</label><input id="gTitle" required value="${esc(g?.title || "")}"></div>
      <div class="form-field"><label>Featured</label><select id="gFeat"><option ${g?.featured ? "selected" : ""}>Yes</option><option ${!g?.featured ? "selected" : ""}>No</option></select></div>
      <div class="form-field" style="grid-column:1/-1"><label>Image path or upload</label><div class="flex"><input id="gImage" value="${esc(g?.image || "assets/images/gallery/")}" style="flex:1"> <label class="dbtn dbtn-soft" style="cursor:pointer"><i class="fa-solid fa-upload"></i> <input type="file" id="gFile" accept="image/*" style="display:none"></label></div></div>
    </div><button class="btn btn-gold btn-block mt-3" id="saveG">${g ? "Save" : "Add"}</button>`, g ? "Edit Gallery Image" : "Add Gallery Image", "fa-images");
    document.getElementById("gFile")?.addEventListener("change", (e) => {
      const f = e.target.files[0]; if (!f) return;
      const r = new FileReader(); r.onload = () => (document.getElementById("gImage").value = r.result); r.readAsDataURL(f);
    });
    document.getElementById("saveG").addEventListener("click", async () => {
      const title = document.getElementById("gTitle").value.trim();
      if (!title) { toast("Title required", "error"); return; }
      const body = { title, image: document.getElementById("gImage").value.trim(), featured: document.getElementById("gFeat").value === "Yes" };
      if (g) { await updateDoc(doc(colRef("gallery"), g.id), body); toast("Updated.", "success"); }
      else { await addDoc(colRef("gallery"), body); toast("Added to gallery.", "success", "Done"); }
      m.close(); render();
    });
  };

  document.getElementById("addImg").addEventListener("click", () => open(null));
  document.getElementById("galGrid").addEventListener("click", async (e) => {
    const list = await queryData(colRef("gallery"));
    const eb = e.target.closest("[data-edit]"); const dbx = e.target.closest("[data-del]"); const fx = e.target.closest("[data-feat]");
    if (eb) open(list.find((x) => x.id === eb.dataset.edit));
    if (dbx) { await deleteDoc(doc(colRef("gallery"), dbx.dataset.del)); toast("Removed.", "success"); render(); }
    if (fx) { await updateDoc(doc(colRef("gallery"), fx.dataset.feat), { featured: true }); toast("Marked featured.", "success"); render(); }
  });
  await render();
}

/* ---------------- NEWS ---------------- */
export async function news() {
  const host = document.getElementById("viewRoot");
  host.innerHTML = `${viewTitle("News & Blog", "Publish campus news and school blog articles.", `
      <button class="dbtn dbtn-navy" id="addNews"><i class="fa-solid fa-plus"></i> New Article</button>`)}
    <div class="dash-card"><div class="dc-body">
      <div class="dtable-wrap"><table class="dtable"><thead><tr><th>Title</th><th>Type</th><th>Date</th><th>Category</th><th>Actions</th></tr></thead><tbody id="newsRows"></tbody></table></div>
    </div></div>`;

  const render = async () => {
    const [n, b] = await Promise.all([queryData(colRef("news")), queryData(colRef("blogPosts"))]);
    const list = n.map((x) => ({ ...x, type: "news" })).concat(b.map((x) => ({ ...x, type: "blog" })));
    document.getElementById("newsRows").innerHTML = list.map((a) => `
      <tr><td><b style="color:var(--color-primary-dark)">${esc(a.title)}</b></td>
      <td><span class="chip ${a.type === "blog" ? "gold" : "navy"}">${a.type}</span></td>
      <td style="color:var(--color-muted)">${fmtDate(a.date || a.publishedAt)}</td>
      <td>${esc(a.category || "School News")}</td>
      <td><div class="flex"><button class="dbtn dbtn-soft" data-edit="${esc(a.type)}:${esc(a.id)}"><i class="fa-solid fa-pen"></i></button>
      <button class="dbtn dbtn-danger" data-del="${esc(a.type)}:${esc(a.id)}"><i class="fa-solid fa-trash"></i></button></div></td></tr>`).join("") || '<tr><td colspan="5"><div class="empty-state"><p>No articles.</p></div></td></tr>';
  };

  const open = (a, type) => {
    const m = openModal(`<div class="form-grid">
      <div class="form-field" style="grid-column:1/-1"><label>Title</label><input id="nTitle" required value="${esc(a?.title || "")}"></div>
      <div class="form-field"><label>Type</label><select id="nType"><option ${type === "blog" ? "selected" : ""}>blog</option><option ${type === "news" ? "selected" : ""}>news</option></select></div>
      <div class="form-field"><label>Category</label><input id="nCat" value="${esc(a?.category || "School News")}"></div>
      <div class="form-field"><label>Cover image path</label><input id="nImg" value="${esc(a?.image || "")}"></div>
      <div class="form-field" style="grid-column:1/-1"><label>Excerpt</label><input id="nExc" value="${esc(a?.excerpt || "")}"></div>
      <div class="form-field" style="grid-column:1/-1"><label>Body (Markdown-ish, use ## for headings)</label><textarea id="nBody" rows="6">${esc(a?.body || "")}</textarea></div>
    </div><button class="btn btn-gold btn-block mt-3" id="saveN">${a ? "Save" : "Publish"}</button>`, a ? "Edit Article" : "New Article", "fa-newspaper");
    document.getElementById("saveN").addEventListener("click", async () => {
      const title = document.getElementById("nTitle").value.trim();
      if (!title) { toast("Title required", "error"); return; }
      const t = document.getElementById("nType").value;
      const coll = t === "blog" ? "blogPosts" : "news";
      const body = { title, category: document.getElementById("nCat").value.trim() || "School News", image: document.getElementById("nImg").value.trim(), excerpt: document.getElementById("nExc").value.trim(), body: document.getElementById("nBody").value.trim() };
      if (a) { await updateDoc(doc(colRef(coll), a.id), body); toast("Article updated.", "success"); }
      else { await addDoc(colRef(coll), { ...body, date: new Date(), publishedAt: new Date(), author: "Greenwood Academy" }); toast("Article published.", "success", "Live"); }
      m.close(); render();
    });
  };

  document.getElementById("addNews").addEventListener("click", () => open(null, "news"));
  document.getElementById("newsRows").addEventListener("click", async (e) => {
    const [n, b] = await Promise.all([queryData(colRef("news")), queryData(colRef("blogPosts"))]);
    const map = n.map((x) => ({ ...x, type: "news" })).concat(b.map((x) => ({ ...x, type: "blog" })));
    const eb = e.target.closest("[data-edit]"); const dbx = e.target.closest("[data-del]");
    const parts = (key) => key.split(":");
    if (eb) { const [t, id] = parts(eb.dataset.edit); open(map.find((x) => x.type === t && x.id === id), t); }
    if (dbx) { const [t, id] = parts(dbx.dataset.del); await deleteDoc(doc(colRef(t === "blog" ? "blogPosts" : "news"), id)); toast("Deleted.", "success"); render(); }
  });
  await render();
}