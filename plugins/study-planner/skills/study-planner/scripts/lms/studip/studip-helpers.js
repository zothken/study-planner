/* Stud.IP import helpers for the study-planner skill.
 *
 * Paste this whole file into the browser tool's JavaScript runner while a Stud.IP tab is open
 * and the STUDENT is logged in (never type a password yourself). It defines window.SP.
 * Then call one helper per step and return small JSON, e.g.
 *     JSON.stringify(await SP.probe())
 *     JSON.stringify(await SP.courses("<node>", "<semesterId>"))
 * Every helper also keeps its full result in SP.last, so large results can be read in slices:
 *     JSON.stringify(SP.last).slice(0, 8000)
 *
 * Tested against Stud.IP 5.x/6.x as used in Osnabrück (2026). Route and field names differ between
 * instances and versions: when a helper throws or returns empty lists, look at the raw answer with
 * SP.raw("<jsonapi path>") or SP.page("<dispatch path>") and adapt — do not guess.
 */
window.SP = (() => {
  const BASE = ((window.STUDIP && window.STUDIP.ABSOLUTE_URI_STUDIP) || (location.origin + "/")).replace(/\/?$/, "/");
  const url = p => /^https?:/.test(p) ? p : BASE + String(p).replace(/^\//, "");
  const clean = s => String(s || "").replace(/\s+/g, " ").trim();
  const keep = v => (SP.last = v, v);

  async function api(path) {
    const p = String(path).replace(/^\/?(jsonapi\.php\/v1\/)?/, "");
    const r = await fetch(url("jsonapi.php/v1/" + p), { credentials: "include", headers: { Accept: "application/vnd.api+json" } });
    if (!r.ok) throw new Error("HTTP " + r.status + " for jsonapi " + p);
    return r.json();
  }
  /* follows JSON:API pagination */
  async function all(path) {
    let next = path.includes("page[") ? path : path + (path.includes("?") ? "&" : "?") + "page[limit]=100";
    let out = [], guard = 0;
    while (next && guard++ < 60) {
      const j = await api(next);
      out = out.concat(j.data || []);
      const n = j.links && j.links.next;
      next = n ? String(n).replace(/^.*?jsonapi\.php\/v1\//, "") : null;
    }
    return out;
  }
  async function page(path, ajax) {
    const r = await fetch(url(path), { credentials: "include", headers: ajax ? { "X-Requested-With": "XMLHttpRequest" } : {} });
    const d = new DOMParser().parseFromString(await r.text(), "text/html");
    d.querySelectorAll("style,script,noscript").forEach(x => x.remove());
    return d;
  }
  const node = id => /^Studip/.test(id) ? id : "StudipStudyArea_" + id;
  const loggedIn = () => !/login|anmelden|sign in/i.test(document.title) && !document.querySelector("input[type=password]");

  const DAY = { montag: 1, monday: 1, mo: 1, mon: 1, dienstag: 2, tuesday: 2, di: 2, tue: 2, mittwoch: 3, wednesday: 3, mi: 3, wed: 3,
    donnerstag: 4, thursday: 4, do: 4, thu: 4, freitag: 5, friday: 5, fr: 5, fri: 5, samstag: 6, saturday: 6, sa: 6, sat: 6, sonntag: 7, sunday: 7, so: 7, sun: 7 };
  const pad = t => t.replace(/^(\d):/, "0$1:");

  const SP = {
    last: null,

    /** Login state, the student's id, recent semesters, and the JSON:API routes this instance offers. */
    async probe() {
      const res = { loggedIn: loggedIn(), base: BASE, title: document.title };
      try { const me = await api("users/me"); res.me = { id: me.data.id, name: me.data.attributes["formatted-name"] || me.data.attributes.username }; }
      catch (e) { res.me = String(e); }
      try {
        const s = await all("semesters");
        res.semesters = s.map(x => ({ id: x.id, title: x.attributes.title, start: x.attributes.start, end: x.attributes.end })).slice(-14);
      } catch (e) { res.semesters = String(e); }
      try {
        const d = await api("discovery");
        res.routes = (d.data || []).map(x => x.id || (x.attributes && (x.attributes.path || x.attributes.route)) || "")
          .filter(r => /tree|study|module|course|semester|schedule|member|event/i.test(r)).slice(0, 150);
      } catch (e) { res.routes = String(e); }
      return keep(res);
    },

    /** Raw JSON:API answer, trimmed — use it to learn field names before adapting a helper. */
    async raw(path, max = 6000) { return JSON.stringify(await api(path)).slice(0, max); },
    /** Visible text of any Stud.IP page, trimmed. */
    async page(path, max = 6000) { const d = await page(path); return clean((d.querySelector("#content") || d.body).textContent).slice(0, max); },

    /** Children of a node in the course directory tree ("root" for the top). */
    async children(id = "root") {
      const list = await all("tree-node/" + node(id) + "/children");
      return keep(list.map(n => ({ id: n.id, name: clean(n.attributes.name || n.attributes.title), attrs: Object.keys(n.attributes) })));
    },
    /** Breadth-first search for tree nodes whose name matches a regex, e.g. /Cognitive Science/i. */
    async findNodes(re, maxDepth = 4) {
      const hits = [], queue = [["root", 0, ""]];
      while (queue.length) {
        const [id, depth, trail] = queue.shift();
        let kids = [];
        try { kids = await SP.children(id); } catch (e) { if (id === "root") throw e; continue; }
        for (const k of kids) {
          const t = trail ? trail + " > " + k.name : k.name;
          if (re.test(k.name)) hits.push({ id: k.id, path: t });
          if (depth + 1 < maxDepth && hits.length < 40) queue.push([k.id, depth + 1, t]);
        }
      }
      return keep(hits);
    },

    /** Courses under a tree node in one semester (id = Stud.IP course id, changes every term). */
    async courses(nodeId, semesterId) {
      const list = await all("tree-node/" + node(nodeId) + "/courses?filter[semester]=" + semesterId);
      return keep(list.map(c => ({ id: c.id, nr: c.attributes["course-number"] || "", title: clean(c.attributes.title),
        subtitle: clean(c.attributes.subtitle), type: c.attributes["course-type"] })));
    },

    /** Everything on a course's detail page: label/value fields, sections, the lecturers' frequency answer,
     *  weekly slots, and module assignment lines. Parse ECTS, prerequisites, language from `fields`/`sections`. */
    async details(courseId) {
      const d = await page("dispatch.php/course/details/?sem_id=" + courseId);
      const root = d.querySelector("#content") || d.querySelector("main") || d.body;
      const fields = {}, sections = {};
      root.querySelectorAll("tr").forEach(tr => {
        const c = [...tr.children]; if (c.length < 2) return;
        const k = clean(c[0].textContent).replace(/:$/, ""), v = c.slice(1).map(x => x.textContent).join(" ").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
        if (k && v && k.length < 70 && !(k in fields)) fields[k] = v.slice(0, 3000);
      });
      root.querySelectorAll("dt").forEach(dt => { const dd = dt.nextElementSibling; if (dd && dd.tagName === "DD") { const k = clean(dt.textContent).replace(/:$/, ""); if (!(k in fields)) fields[k] = clean(dd.textContent).slice(0, 3000); } });
      root.querySelectorAll("section, article, .contentbox").forEach(s => {
        const h = s.querySelector("header h1, header h2, h1, h2, h3, header"); if (!h) return;
        const k = clean(h.textContent); if (!k || k.length > 80 || k in sections) return;
        sections[k] = s.textContent.replace(h.textContent, "").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim().slice(0, 4000);
      });
      const text = root.textContent.replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
      const lines = text.split("\n").map(s => s.trim()).filter(Boolean);
      /* Frequency template question: the ANSWER is on the line below the question (or after the "?") */
      const qi = lines.findIndex(l => /offered again|offered regularly|regelmäßig angeboten|wieder angeboten/i.test(l));
      const turnus = qi < 0 ? null : { question: lines[qi], answer: (lines[qi].split("?").slice(1).join("?").trim() || lines[qi + 1] || "").slice(0, 400) };
      /* weekly slots: prefer the "times" section, count repeated day+time pairs */
      const timesKey = Object.keys(sections).concat(Object.keys(fields)).find(k => /räume und zeiten|rooms and times|zeiten|times|termine/i.test(k));
      const tsrc = timesKey ? (sections[timesKey] || fields[timesKey]) : text;
      const re = /\b(Montag|Dienstag|Mittwoch|Donnerstag|Freitag|Samstag|Sonntag|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mo|Di|Mi|Do|Fr|Sa|Mon|Tue|Wed|Thu|Fri|Sat)\.?,?\s*(?:\d{1,2}\.\d{1,2}\.(?:\d{2,4})?\s*)?(\d{1,2}:\d{2})\s*(?:-|–|bis|to)\s*(\d{1,2}:\d{2})/gi;
      const count = {}; let m;
      while ((m = re.exec(tsrc))) { const dnum = DAY[m[1].toLowerCase()]; if (!dnum) continue; const k = dnum + "|" + pad(m[2]) + "|" + pad(m[3]); count[k] = (count[k] || 0) + 1; }
      const slots = Object.entries(count).map(([k, n]) => { const [d, s, e] = k.split("|"); return { d: +d, s, e, seen: n }; });
      const weekly = /wöchentlich|weekly|14-tägig|biweekly|every week/i.test(tsrc);
      const modules = lines.filter(l => />/.test(l) && /modul|module|CS\d|[A-Z]{2,}-[A-Z]/i.test(l)).slice(0, 40);
      const ects = Object.entries(fields).find(([k]) => /ects|leistungspunkte|credit/i.test(k));
      return keep({ id: courseId, title: lines[0] || "", fields, sections, turnus, slots, weekly, timesSection: timesKey || null,
        ects: ects ? ects[1] : null, modules, text: text.slice(0, 7000) });
    },

    /** Module directory cross-check: courses linked to a module code in one semester. Catches courses that
     *  live in another faculty's tree (computer science, psychology, law …) but count for the programme. */
    async moduleCourses(code, semesterId) {
      const d = await page("dispatch.php/search/module?sterm=" + encodeURIComponent(code));
      const links = [...d.querySelectorAll('a[href*="module/details/"]')]
        .map(a => ({ text: clean(a.textContent), id: (a.getAttribute("href").match(/details\/([0-9a-f]{32}|\d+)/) || [])[1] })).filter(x => x.id);
      const hits = links.filter(l => l.text.indexOf(code) === 0);
      const out = [], seen = new Set();
      for (const l of (hits.length ? hits : links).slice(0, 10)) {
        const d2 = await page("dispatch.php/search/module/details/" + l.id + "/?sem_select=" + semesterId, true);
        const cs = [...d2.querySelectorAll('a[href*="course/details"], a[href*="sem_id="]')]
          .map(a => ({ text: clean(a.textContent), id: (a.getAttribute("href").match(/sem_id=([0-9a-f]{32})/) || [])[1] }))
          .filter(x => x.id && !seen.has(x.id) && seen.add(x.id));
        out.push({ module: l.text, moduleId: l.id, courses: cs });
      }
      return keep(out);
    },

    /** Courses the student is enrolled in (to pre-fill "taking" — only after asking them). */
    async myCourses(semesterTitleRe) {
      const me = (await api("users/me")).data.id;
      const list = await all("users/" + me + "/courses");
      const out = list.map(c => ({ id: c.id, nr: c.attributes["course-number"] || "", title: clean(c.attributes.title) }));
      if (!semesterTitleRe) return keep(out);
      /* semester filter via the course's start semester relationship, when present */
      const sem = await all("semesters"); const ok = new Set(sem.filter(s => semesterTitleRe.test(s.attributes.title)).map(s => s.id));
      return keep(list.filter(c => { const r = c.relationships && (c.relationships["start-semester"] || c.relationships.semester); const id = r && r.data && r.data.id; return !id || ok.has(id); })
        .map(c => ({ id: c.id, nr: c.attributes["course-number"] || "", title: clean(c.attributes.title) })));
    },

    /** Offering history: in which of these semesters does each title appear under the node(s)? */
    async history(nodeIds, semesters, titles) {
      const norm = s => clean(s).toLowerCase().replace(/\(part\s*[ivx0-9]+\)|\(teil\s*[ivx0-9]+\)/g, "").replace(/[^a-z0-9äöüß]+/g, " ").trim();
      const want = new Map(titles.map(t => [norm(t), t])), hist = {};
      for (const s of semesters) {
        const seen = new Set();
        for (const n of [].concat(nodeIds)) { try { (await SP.courses(n, s.id)).forEach(c => seen.add(norm(c.title))); } catch (e) {} }
        want.forEach((orig, k) => { if (seen.has(k)) (hist[orig] = hist[orig] || []).push(s.title); });
      }
      return keep(hist);
    },

    /** Pre-2025 course directory (server-rendered). The semester is SESSION STATE there: set it first,
     *  then load the node — putting the semester into the node URL returns nothing. semIndex e.g. 49. */
    async legacyCourses(nodeId, semIndex) {
      await fetch(url("dispatch.php/search/courses/index?search_sem_sem=" + semIndex), { credentials: "include" });
      const d = await page("dispatch.php/search/courses?start_item_id=" + nodeId);
      const out = [];
      d.querySelectorAll("td").forEach(td => {
        const a = td.querySelector('a[href*="course/details"]'); if (!a) return;
        let nr = ""; td.querySelectorAll("div").forEach(x => { const s = clean(x.textContent); if (!nr && /^\d+\.\d{2,6}$/.test(s)) nr = s; });
        out.push({ id: (a.href.match(/sem_id=([0-9a-f]+)/) || [])[1], nr, title: clean(a.textContent) });
      });
      return keep(out);
    }
  };
  return SP;
})();
"SP ready: " + Object.keys(window.SP).filter(k => typeof window.SP[k] === "function").join(", ");
