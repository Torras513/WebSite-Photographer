// ============================================================
// Script partilhado das galerias públicas do site.
// Cada página define a sua origem através de:
//   <body data-galeria="galeria-carros">
// As galerias são carregadas da API por página (slug da categoria).
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
    const pagina = document.body.getAttribute('data-galeria');
    carregarGaleriasPublicas(pagina);
});

async function carregarGaleriasPublicas(pagina) {
    const container = document.getElementById('galerias-publicas-container');
    if (!container || !pagina) return;

    try {
        const response = await fetch(`/api/public/galerias/pagina/${encodeURIComponent(pagina)}`);
        if (!response.ok) throw new Error('Erro ao carregar galerias públicas.');

        const eventos = await response.json();
        if (!eventos || eventos.length === 0) {
            container.innerHTML = `<p style="text-align: center; color: #888; margin-top: 40px;">Nenhuma galeria disponível de momento.</p>`;
            return;
        }

        container.innerHTML = eventos.map(evento => {
            // Suporte defensivo às variações de nomes de colunas da BD (data / data_evento)
            const dataEventoRaw = evento.data_evento || evento.data;
            const dataFormatada = dataEventoRaw
                ? new Date(dataEventoRaw).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' })
                : 'Data N/D';

            const fotos = evento.fotos || [];

            return `
            <main class="container mb-5">
                <div class="gallery-header text-center mb-4">
                    <h2>${evento.titulo || 'Galeria de Fotografia'}</h2>
                </div>

                <section class="event-info mb-4">
                    <div class="info-item">
                        <div class="info-content">
                            <span class="info-label">Data</span>
                            <span class="info-value">${dataFormatada}</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-content">
                            <span class="info-label">Localização</span>
                            <span class="info-value">${evento.localizacao || 'N/D'}</span>
                        </div>
                    </div>
                    <div class="info-item">
                        <div class="info-content">
                            <span class="info-label">Organização</span>
                            <span class="info-value">${evento.organizacao || 'N/D'}</span>
                        </div>
                    </div>
                </section>

                <div class="swiper swiper-evento-${evento.id}" data-moldar-bloco="1">
                    <div class="swiper-wrapper">
                        ${fotos.map(foto => {
                            // Mapeamento compatível com caminho_foto_webp / caminho_foto_original ou url_thumb / url_original
                            const thumbSrc = foto.caminho_foto_webp || foto.url_thumb || foto.caminho_foto_original || foto.url;
                            const fullSrc = foto.caminho_foto_original || foto.url_original || foto.caminho_foto_webp || foto.url;

                            return `
                                <div class="swiper-slide">
                                    <img src="${thumbSrc}" data-full="${fullSrc}" alt="${evento.titulo || 'Fotografia'}">
                                </div>
                            `;
                        }).join('')}
                    </div>
                    <div class="swiper-button-next"></div>
                    <div class="swiper-button-prev"></div>
                    <div class="swiper-pagination"></div>
                </div>

                <div class="download-container text-center mt-3">
                    <a href="#" download class="btn-download download-link">
                        Descarregar Fotografia Original →
                    </a>
                </div>
            </main>
            `;
        }).join('');

        // Inicialização individual dos Swipers
        eventos.forEach(evento => {
            const swiperElement = document.querySelector(`.swiper-evento-${evento.id}`);
            if (swiperElement && typeof Swiper !== 'undefined') {
                new Swiper(swiperElement, {
                    loop: (evento.fotos && evento.fotos.length > 1),
                    grabCursor: true,
                    pagination: { el: swiperElement.querySelector('.swiper-pagination'), clickable: true },
                    navigation: { nextEl: swiperElement.querySelector('.swiper-button-next'), prevEl: swiperElement.querySelector('.swiper-button-prev') },
                    on: {
                        slideChange: function () { atualizarLinkDownload(this); },
                        slideChangeTransitionEnd: function () { ajustarGaleria(this); },
                        imagesReady: function () { ajustarGaleria(this); },
                        resize: function () { ajustarGaleria(this); },
                        init: function () { atualizarLinkDownload(this); }
                    }
                });
            }
        });

        // Atualiza as setas quando as imagens terminarem de carregar
        observarImagensSwiper(container);

    } catch (err) {
        console.error('Erro:', err);
        container.innerHTML = `<p style="text-align: center; color: #e63946; margin-top: 40px;">Não foi possível carregar as galerias.</p>`;
    }
}

function atualizarLinkDownload(swiperInstance) {
    if (!swiperInstance || !swiperInstance.slides) return;

    const slideAtivo = swiperInstance.slides[swiperInstance.activeIndex];
    if (!slideAtivo) return;

    const img = slideAtivo.querySelector('img');
    const container = swiperInstance.el.closest('.container');
    if (!container) return;

    const btnDownload = container.querySelector('.download-link');

    if (img && btnDownload) {
        const urlOriginal = img.getAttribute('data-full');
        if (urlOriginal) {
            btnDownload.href = urlOriginal;
            btnDownload.setAttribute('download', urlOriginal.split('/').pop());
        }
    }
}
