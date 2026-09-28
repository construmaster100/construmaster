(function () {
  const products = window.PRODUCTS || [];

  const categoryNav = document.getElementById("categoryNav");
  const productGrid = document.getElementById("productGrid");
  const categoryTitle = document.getElementById("categoryTitle");
  const productCount = document.getElementById("productCount");
  const emptyState = document.getElementById("emptyState");
  const searchInput = document.getElementById("searchInput");

  const ALL = "__ALL__";
  let state = {
    category: ALL,
    query: "",
  };

  // ---- Construir lista de categorías a partir del inventario ----
  const categories = Array.from(new Set(products.map((p) => p.categoria))).sort();

  function countFor(cat) {
    return products.filter((p) => p.categoria === cat).length;
  }

  function renderSidebar() {
    categoryNav.innerHTML = "";

    const allBtn = document.createElement("button");
    allBtn.className = "nav-item all-item" + (state.category === ALL ? " active" : "");
    allBtn.innerHTML = `<span>Todos los productos</span><span class="count">${products.length}</span>`;
    allBtn.addEventListener("click", () => selectCategory(ALL));
    categoryNav.appendChild(allBtn);

    categories.forEach((cat) => {
      const btn = document.createElement("button");
      btn.className = "nav-item" + (state.category === cat ? " active" : "");
      btn.innerHTML = `<span>${cat}</span><span class="count">${countFor(cat)}</span>`;
      btn.addEventListener("click", () => selectCategory(cat));
      categoryNav.appendChild(btn);
    });
  }

  function selectCategory(cat) {
    state.category = cat;
    renderSidebar();
    renderProducts();
  }

  function getFiltered() {
    const q = state.query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesCategory = state.category === ALL || p.categoria === state.category;
      const matchesQuery = !q || p.nombre.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }

  function renderProducts() {
    const filtered = getFiltered();

    categoryTitle.textContent = state.category === ALL ? "Todos los productos" : state.category;
    productCount.textContent = `${filtered.length} producto${filtered.length === 1 ? "" : "s"}`;

    productGrid.innerHTML = "";
    emptyState.hidden = filtered.length !== 0;

    filtered.forEach((p) => {
      const card = document.createElement("article");
      card.className = "product-card";
      card.innerHTML = `
        <div class="thumb"><img src="${p.imagen}" alt="${p.nombre}" loading="lazy" /></div>
        <div class="info">
          <span class="category-tag">${p.categoria}</span>
          <span class="name">${p.nombre}</span>
          <span class="price">${p.precio}</span>
        </div>
      `;
      productGrid.appendChild(card);
    });
  }

  searchInput.addEventListener("input", (e) => {
    state.query = e.target.value;
    renderProducts();
  });

  renderSidebar();
  renderProducts();
})();
