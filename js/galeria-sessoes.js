document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar a sessão no servidor (cookie HttpOnly)
    let me = null;
    try {
        const meRes = await fetch('/api/me');
        if (meRes.ok) me = await meRes.json();
    } catch (e) {
        console.error('Erro ao verificar sessão:', e);
    }

    if (!me) {
        localStorage.clear();
        const redirectTarget = encodeURIComponent('galeria-sessoes');
        window.location.href = `login?redirect=${redirectTarget}`;
        return;
    }

    // O administrador pode ver as galerias de um cliente específico (via CRM)
    const urlParams = new URLSearchParams(window.location.search);
    const clienteIdParam = urlParams.get('clienteId');
    const souAdmin = me.role === 'admin';
    const queryAdmin = (souAdmin && clienteIdParam) ? `?clienteId=${encodeURIComponent(clienteIdParam)}` : '';

    let swiper = null;

    // 2. Função para Inicializar ou Re-inicializar o Swiper
    function initSwiper(totalSlides) {
        if (swiper) {
            swiper.destroy(true, true); // Destrói instância anterior se existir
        }

        // Ativa o loop APENAS se houver mais do que 1 foto carregada
        const enableLoop = totalSlides > 1;

        swiper = new Swiper('.swiper', {
            loop: enableLoop,
            grabCursor: true,
            pagination: { el: '.swiper-pagination', clickable: true },
            navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
            on: {
                slideChange: function () { updateDownloadLink(this); },
                slideChangeTransitionEnd: function () { ajustarGaleria(this); },
                imagesReady: function () { ajustarGaleria(this); },
                resize: function () { ajustarGaleria(this); },
                init: function () { updateDownloadLink(this); }
            }
        });

        // Atualiza as setas quando as imagens terminarem de carregar
        observarImagensSwiper(document.querySelector('.swiper'));
    }

    // 3. Função para Atualizar o Link do Botão de Download
    function updateDownloadLink(s) {
        if (!s || !s.slides || s.slides.length === 0) {
            ajustarGaleria(s);
            return;
        }
        const activeSlide = s.slides[s.activeIndex];
        if (!activeSlide) return;

        const img = activeSlide.querySelector('img');
        const container = s.el.closest('.container');
        const downloadBtn = container ? container.querySelector('.download-link') : null;

        if (img && downloadBtn) {
            const fotoOriginal = img.getAttribute('data-full') || img.src || '#';
            downloadBtn.href = fotoOriginal;
            if (fotoOriginal !== '#') {
                downloadBtn.setAttribute('download', fotoOriginal.split('/').pop());
            }
        }
    }

    // 4. Função para Carregar as Fotos de uma Sessão Específica no Swiper
    async function carregarFotosDaSessao(sessaoId) {
        const swiperWrapper = document.querySelector('.swiper-wrapper');
        if (!swiperWrapper) return;

        try {
            const response = await fetch(`/api/galeria/sessao/${sessaoId}`);
            if (!response.ok) throw new Error(`Status ${response.status} ao carregar fotos da sessão`);

            const fotos = await response.json();
            swiperWrapper.innerHTML = '';

            if (fotos && fotos.length > 0) {
                fotos.forEach(item => {
                    const urlExibicao = item.caminho_exibicao || item.caminho_foto;
                    const urlOriginal = item.caminho_foto;

                    const slideHtml = `
                        <div class="swiper-slide">
                            <img src="${urlExibicao}" data-full="${urlOriginal}" loading="lazy" alt="Fotografia de Sessão">
                        </div>
                    `;
                    swiperWrapper.insertAdjacentHTML('beforeend', slideHtml);
                });

                initSwiper(fotos.length);
            } else {
                swiperWrapper.innerHTML = `
                    <div class="swiper-slide">
                        <div style="color: #aaa; text-align: center; padding: 80px 20px;">
                            Esta sessão ainda não tem fotografias carregadas.
                        </div>
                    </div>`;
                initSwiper(0);
            }
        } catch (err) {
            console.error('Erro ao carregar fotos da sessão:', err);
            initSwiper(0);
        }
    }

    // 5. Procurar Sessões do Cliente e Preencher o Select
    const selectSessao = document.getElementById('sessaoSelect');

    try {
        const response = await fetch(`/api/minhas-sessoes${queryAdmin}`);
        if (!response.ok) throw new Error(`Status ${response.status} ao carregar sessões`);

        const sessoes = await response.json();

        if (selectSessao) {
            selectSessao.innerHTML = '';

            if (sessoes && sessoes.length > 0) {
                sessoes.forEach(sessao => {
                    const option = document.createElement('option');
                    option.value = sessao.id;

                    // Formatação da data para PT (DD/MM/AAAA)
                    let dataFormatada = sessao.data_sessao;
                    if (dataFormatada) {
                        const d = new Date(sessao.data_sessao);
                        if (!isNaN(d)) {
                            dataFormatada = d.toLocaleDateString('pt-PT');
                        }
                    }

                    option.textContent = sessao.titulo 
                        ? `${sessao.titulo} (${dataFormatada})` 
                        : `Sessão de ${dataFormatada}`;
                    
                    selectSessao.appendChild(option);
                });

                // Carrega automaticamente a primeira sessão (a mais recente)
                carregarFotosDaSessao(sessoes[0].id);

                // Escuta a mudança de sessão no dropdown
                selectSessao.addEventListener('change', (e) => {
                    if (e.target.value) {
                        carregarFotosDaSessao(e.target.value);
                    }
                });
            } else {
                selectSessao.innerHTML = '<option value="">Sem sessões disponíveis</option>';
                const swiperWrapper = document.querySelector('.swiper-wrapper');
                if (swiperWrapper) {
                    swiperWrapper.innerHTML = `
                        <div class="swiper-slide">
                            <div style="color: #aaa; text-align: center; padding: 80px 20px;">
                                Não existem sessões criadas para esta conta.
                            </div>
                        </div>`;
                }
                initSwiper(0);
            }
        }
    } catch (err) {
        console.error('Erro ao carregar a lista de sessões:', err);
        if (selectSessao) {
            selectSessao.innerHTML = '<option value="">Erro ao carregar sessões</option>';
        }
        initSwiper(0);
    }

    // 6. Lógica do Botão Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', event => {
            event.preventDefault();
            fetch('/api/logout', { method: 'POST' }).catch(() => {});
            localStorage.clear();
            window.location.href = 'login';
        });
    }
});