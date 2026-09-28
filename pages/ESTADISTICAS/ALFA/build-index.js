// COMANDO 2: Excel/data.json a index de navegacion (sidebar izq + acordeon)
// Uso: copiar a la carpeta del sitio (junto a data.json, con imagenes ya
// recortadas en img/) y correr `node build-index.js`.
// Genera/actualiza: data.js, index.html, app.js, styles.css
// El nombre de marca se toma del nombre de la carpeta.

const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "data.json");
const SITE_NAME = path.basename(__dirname);
const BRAND = SITE_NAME.replace(/[_-]+/g, " ").trim();

function buildDataJs() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  const clean = data.map(({ nombre, precio, categoria, imagen }) => ({ nombre, precio, categoria, imagen }));
  fs.writeFileSync(path.join(__dirname, "data.js"), "window.PRODUCTS = " + JSON.stringify(clean) + ";\n", "utf-8");
  return clean.length;
}

function buildIndexHtml() {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${BRAND} Inventario - Catálogo de Productos</title>
<link rel="stylesheet" href="styles.css" />
</head>
<body>
  <div class="layout">
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <a href="../index.html" class="back-link">&#8249; Todos los sitios</a>
        <span class="brand">${BRAND}</span>
        <span class="brand-sub">Inventario</span>
      </div>

      <input
        type="search"
        id="searchInput"
        class="search-box"
        placeholder="Buscar producto..."
      />

      <nav class="category-nav" id="categoryNav" aria-label="Categorías de productos"></nav>
    </aside>

    <main class="content">
      <header class="content-header">
        <span class="product-count" id="productCount"></span>
      </header>

      <div class="accordion" id="accordion"></div>

      <p class="empty-state" id="emptyState" hidden>No se encontraron productos.</p>
    </main>
  </div>

  <script src="data.js"></script>
  <script src="app.js"></script>
</body>
</html>
`;
  fs.writeFileSync(path.join(__dirname, "index.html"), html, "utf-8");
}

function buildAppJs() {
  const js = `(function () {
  const products = window.PRODUCTS || [];

  const categoryNav = document.getElementById("categoryNav");
  const accordion = document.getElementById("accordion");
  const productCount = document.getElementById("productCount");
  const emptyState = document.getElementById("emptyState");
  const searchInput = document.getElementById("searchInput");

  const groups = new Map();
  for (const p of products) {
    const key = p.categoria || "SIN CATEGORIA";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const sortedCategories = Array.from(groups.keys()).sort(
    (a, b) => groups.get(b).length - groups.get(a).length
  );

  function setCount(text) {
    productCount.textContent = text;
  }
  setCount(\`\${products.length} productos en \${sortedCategories.length} categorías\`);

  function cardHtml(p) {
    return \`
      <article class="product-card">
        <div class="thumb"><img src="\${p.imagen}" alt="\${p.nombre}" loading="lazy" /></div>
        <div class="info">
          <span class="name">\${p.nombre}</span>
          <span class="price">\${p.precio}</span>
        </div>
      </article>
    \`;
  }

  function openSection(section) {
    const panel = section.querySelector(".acc-panel");
    section.classList.add("open");
    panel.style.maxHeight = panel.scrollHeight + "px";
  }

  function closeSection(section) {
    const panel = section.querySelector(".acc-panel");
    section.classList.remove("open");
    panel.style.maxHeight = null;
  }

  function buildSection(categoria, items) {
    const section = document.createElement("section");
    section.className = "acc-section";
    section.id = "cat-" + categoria.replace(/[^a-z0-9]+/gi, "-").toLowerCase();

    const header = document.createElement("button");
    header.className = "acc-header";
    header.innerHTML = \`
      <span class="acc-title">\${categoria}</span>
      <span class="acc-count">\${items.length}</span>
      <span class="acc-chevron">&#8250;</span>
    \`;

    const panel = document.createElement("div");
    panel.className = "acc-panel";
    const grid = document.createElement("div");
    grid.className = "product-grid";
    grid.innerHTML = items.map(cardHtml).join("");
    panel.appendChild(grid);

    header.addEventListener("click", () => {
      section.classList.contains("open") ? closeSection(section) : openSection(section);
    });

    section.appendChild(header);
    section.appendChild(panel);
    return section;
  }

  const sectionEls = new Map();
  for (const categoria of sortedCategories) {
    const el = buildSection(categoria, groups.get(categoria));
    accordion.appendChild(el);
    sectionEls.set(categoria, el);
  }

  let activeNavBtn = null;
  for (const categoria of sortedCategories) {
    const btn = document.createElement("button");
    btn.className = "nav-item";
    btn.innerHTML = \`<span>\${categoria}</span><span class="count">\${groups.get(categoria).length}</span>\`;
    btn.addEventListener("click", () => {
      if (activeNavBtn) activeNavBtn.classList.remove("active");
      btn.classList.add("active");
      activeNavBtn = btn;

      const section = sectionEls.get(categoria);
      openSection(section);
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    categoryNav.appendChild(btn);
  }

  if (sortedCategories.length) {
    openSection(sectionEls.get(sortedCategories[0]));
  }

  searchInput.addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    let visibleCategories = 0;
    let visibleProducts = 0;

    for (const categoria of sortedCategories) {
      const items = groups.get(categoria);
      const section = sectionEls.get(categoria);
      const grid = section.querySelector(".product-grid");

      if (!q) {
        grid.innerHTML = items.map(cardHtml).join("");
        section.hidden = false;
        visibleCategories++;
        visibleProducts += items.length;
        continue;
      }

      const filtered = items.filter((p) => p.nombre.toLowerCase().includes(q));
      if (filtered.length === 0) {
        section.hidden = true;
        continue;
      }
      section.hidden = false;
      grid.innerHTML = filtered.map(cardHtml).join("");
      openSection(section);
      visibleCategories++;
      visibleProducts += filtered.length;
    }

    emptyState.hidden = visibleProducts !== 0;
    setCount(
      q
        ? \`\${visibleProducts} productos en \${visibleCategories} categorías (filtrado)\`
        : \`\${products.length} productos en \${sortedCategories.length} categorías\`
    );
  });
})();
`;
  fs.writeFileSync(path.join(__dirname, "app.js"), js, "utf-8");
}

function buildStylesCss() {
  const src = path.join(__dirname, "..", "_site-kit", "styles.css");
  fs.copyFileSync(src, path.join(__dirname, "styles.css"));
}

function main() {
  const count = buildDataJs();
  buildIndexHtml();
  buildAppJs();
  buildStylesCss();
  console.log(`Index generado para "${BRAND}": ${count} productos (index.html, app.js, styles.css, data.js)`);
}

main();
