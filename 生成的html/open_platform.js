document.addEventListener('DOMContentLoaded', () => {
  const page = document.body.dataset.page;

  // ---------- 轻量“登录态”模拟（原型用） ----------
  const ROLE_KEY = 'tgo_role';
  const params = new URLSearchParams(window.location.search);
  const normalizeRole = (role) => {
    if (role === 'admin' || role === 'dev' || role === 'guest') return role;
    return 'guest';
  };

  const setRole = (role) => {
    localStorage.setItem(ROLE_KEY, normalizeRole(role));
  };

  const getRole = () => {
    return normalizeRole(localStorage.getItem(ROLE_KEY) || 'guest');
  };

  if (params.get('logout') === '1') {
    localStorage.removeItem(ROLE_KEY);
  }
  if (params.get('role')) {
    setRole(params.get('role'));
  }

  const role = getRole();

  // 管理中心入口：仅管理员可见（含超级管理员）
  document.querySelectorAll('[data-admin-only]').forEach((el) => {
    el.style.display = role === 'admin' || role === 'super' ? '' : 'none';
  });

  // 仅超级管理员可见模块
  document.querySelectorAll('[data-super-admin-only]').forEach((el) => {
    el.style.display = role === 'super' ? '' : 'none';
  });

  // 账号模块：未登录显示“登录”，已登录显示头像
  const loginBtn = document.querySelector('[data-account-login]');
  const avatar = document.querySelector('[data-account-avatar]');

  const refreshAccountUI = () => {
    const loggedIn = role !== 'guest';
    if (loginBtn) loginBtn.style.display = loggedIn ? 'none' : '';
    if (avatar) avatar.style.display = loggedIn ? 'inline-flex' : 'none';
  };

  refreshAccountUI();

  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      const next = window.prompt('选择身份：dev（开发者） / admin（管理员） / guest（退出）', role);
      if (!next) return;
      const nextRole = (next || '').trim().toLowerCase();
      if (nextRole === 'guest') {
        localStorage.removeItem(ROLE_KEY);
      } else {
        setRole(nextRole);
      }
      window.location.reload();
    });
  }

  // ---------- 顶部导航高亮 ----------
  if (page) {
    const link = document.querySelector(`.nav a[data-page="${page}"]`);
    if (link) link.classList.add('active');
  }

  // ---------- FAQ 折叠 ----------
  document.querySelectorAll('.faq-item button').forEach((btn) => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      if (item) item.classList.toggle('open');
    });
  });

  // ---------- API 文档：左侧分类 -> 右侧“文档页”切换 + API 搜索 ----------
  if (page === 'api') {
    const nav = document.querySelector('[data-api-nav]');
    const docPages = Array.from(document.querySelectorAll('.api-doc[data-api-doc]'));
    const filterInput = document.querySelector('[data-api-filter]');

    const apiSearchInput = document.querySelector('[data-api-search]');
    const apiSearchResults = document.querySelector('[data-api-search-results]');
    const apiSearchClearBtn = document.querySelector('[data-api-search-clear]');

    const setActiveLink = (docId) => {
      if (!nav) return;
      nav.querySelectorAll('a[data-api-link]').forEach((a) => {
        const href = a.getAttribute('href');
        a.classList.toggle('active', href === `#${docId}`);
      });
    };

    const showDoc = (docId) => {
      docPages.forEach((el) => {
        el.classList.toggle('is-active', el.id === docId);
      });
      setActiveLink(docId);
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {
        window.scrollTo(0, 0);
      }
    };

    const resolveDocIdFromHash = () => {
      const raw = window.location.hash || '#api-all';
      const hash = decodeURIComponent(raw);
      const target = document.querySelector(hash);
      if (!target) return 'api-all';

      const wrapper = target.closest('.api-doc[data-api-doc]');
      if (wrapper && wrapper.id) return wrapper.id;
      if (target.id && target.id.startsWith('api-')) return target.id;
      return 'api-all';
    };

    const onHashChange = () => {
      const docId = resolveDocIdFromHash();
      showDoc(docId);
    };

    // 侧边栏搜索过滤（仅过滤分类，不影响当前展示）
    if (filterInput && nav) {
      filterInput.addEventListener('input', () => {
        const keyword = (filterInput.value || '').trim().toLowerCase();
        nav.querySelectorAll('a[data-api-link]').forEach((a) => {
          if (a.getAttribute('href') === '#api-all') {
            a.style.display = '';
            return;
          }
          const text = (a.textContent || '').trim().toLowerCase();
          a.style.display = !keyword || text.includes(keyword) ? '' : 'none';
        });

        // 组标题：若组内无可见链接则隐藏
        nav.querySelectorAll('.sidebar-group').forEach((group) => {
          const links = Array.from(group.querySelectorAll('a[data-api-link]'));
          const anyVisible = links.some((a) => a.style.display !== 'none');
          group.style.display = anyVisible ? '' : 'none';
        });
      });
    }

    // API 搜索：从左侧链接里做快速跳转（名称/路径/关键词）
    const collectApiIndex = () => {
      if (!nav) return [];
      const links = Array.from(nav.querySelectorAll('a[data-api-link]'));
      return links
        .map((a) => {
          const href = a.getAttribute('href') || '';
          const text = (a.textContent || '').trim().replace(/^·\s*/, '');
          return { href, text, rawText: (a.textContent || '').trim() };
        })
        .filter((it) => it.href && it.href.startsWith('#') && it.href !== '#api-all' && it.text);
    };

    const apiIndex = collectApiIndex();

    const renderApiSearch = (keyword) => {
      if (!apiSearchResults) return;
      const q = (keyword || '').trim().toLowerCase();

      if (!q) {
        apiSearchResults.innerHTML = '';
        return;
      }

      const matches = apiIndex
        .filter((it) => it.text.toLowerCase().includes(q) || it.href.toLowerCase().includes(q))
        .slice(0, 12);

      if (!matches.length) {
        apiSearchResults.innerHTML = '<div class="search-empty">无匹配结果，可尝试更短关键词（如：支付 / token / 回调）。</div>';
        return;
      }

      const html = matches
        .map((it) => {
          const safeText = it.rawText.replace(/</g, '&lt;').replace(/>/g, '&gt;');
          return `<a class="search-result-item" href="${it.href}">${safeText}<span class="muted">${it.href}</span></a>`;
        })
        .join('');

      apiSearchResults.innerHTML = html;
    };

    if (apiSearchInput) {
      apiSearchInput.addEventListener('input', () => {
        renderApiSearch(apiSearchInput.value);
      });

      apiSearchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          apiSearchInput.value = '';
          renderApiSearch('');
        }
      });
    }

    if (apiSearchClearBtn) {
      apiSearchClearBtn.addEventListener('click', () => {
        if (apiSearchInput) apiSearchInput.value = '';
        renderApiSearch('');
        try {
          apiSearchInput?.focus();
        } catch {
          // ignore
        }
      });
    }

    if (apiSearchResults) {
      apiSearchResults.addEventListener('click', () => {
        // 点击结果后收起列表（hashchange 会负责展示正确的 doc）
        if (apiSearchInput) apiSearchInput.value = '';
        renderApiSearch('');
      });
    }

    window.addEventListener('hashchange', onHashChange);

    // 初次进入：确保有默认 hash
    if (!window.location.hash) {
      window.location.hash = '#api-all';
    } else {
      onHashChange();
    }
  }

  // ---------- 控制台：密钥显示/隐藏 & 开通权限弹窗 ----------
  if (page === 'console') {
    document.querySelectorAll('[data-toggle-secret]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const card = btn.closest('[data-app-card]') || document;
        const mask = card.querySelector('[data-secret-mask]');
        if (!mask) return;

        const masked = (mask.textContent || '').includes('*');
        if (masked) {
          mask.textContent = btn.dataset.secret || '';
          btn.textContent = '隐藏';
        } else {
          mask.textContent = '************';
          btn.textContent = '显示';
        }
      });
    });

    const permissionModal = document.querySelector('#permission-modal');
    const openPermissionButtons = document.querySelectorAll('[data-open-permission]');
    const permissionCloseButtons = permissionModal ? permissionModal.querySelectorAll('[data-modal-close]') : [];

    const toggleModal = (target, open) => {
      if (!target) return;
      target.classList.toggle('is-open', open);
      target.setAttribute('aria-hidden', open ? 'false' : 'true');
    };

    openPermissionButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        toggleModal(permissionModal, true);
      });
    });

    permissionCloseButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        toggleModal(permissionModal, false);
      });
    });

    if (permissionModal) {
      permissionModal.addEventListener('click', (e) => {
        if (e.target === permissionModal) toggleModal(permissionModal, false);
      });
    }

    const appCreateModal = document.querySelector('#app-create-modal');
    const appCreateBtn = document.querySelector('[data-open-app-create]');
    const appCreateCloseButtons = appCreateModal ? appCreateModal.querySelectorAll('[data-modal-close]') : [];

    if (appCreateBtn) {
      appCreateBtn.addEventListener('click', () => {
        toggleModal(appCreateModal, true);
      });
    }

    appCreateCloseButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        toggleModal(appCreateModal, false);
      });
    });

    if (appCreateModal) {
      appCreateModal.addEventListener('click', (e) => {
        if (e.target === appCreateModal) toggleModal(appCreateModal, false);
      });
    }
  }

  // ---------- 管理中心：管理员权限校验（原型） ----------
  if (page === 'admin') {
    const denied = document.querySelector('[data-admin-denied]');
    const content = document.querySelector('[data-admin-content]');

    if (role !== 'admin' && role !== 'super') {
      if (denied) denied.style.display = '';
      if (content) content.style.display = 'none';
    } else {
      if (denied) denied.style.display = 'none';
      if (content) content.style.display = '';
    }
  }
});
