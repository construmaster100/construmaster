(function () {
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
  setCount(`${products.length} productos en ${sortedCategories.length} categorías`);

  function cardHtml(p) {
    return `
      <article class="product-card">
        <div class="thumb"><img src="${p.imagen}" alt="${p.nombre}" loading="lazy" /></div>
        <div class="info">
          <span class="name">${p.nombre}</span>
          <span class="price">${p.precio}</span>
        </div>
      </article>
    `;
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
    header.innerHTML = `
      <span class="acc-title">${categoria}</span>
      <span class="acc-count">${items.length}</span>
      <span class="acc-chevron">&#8250;</span>
    `;

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
    btn.innerHTML = `<span>${categoria}</span><span class="count">${groups.get(categoria).length}</span>`;
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
        ? `${visibleProducts} productos en ${visibleCategories} categorías (filtrado)`
        : `${products.length} productos en ${sortedCategories.length} categorías`
    );
  });
})();
