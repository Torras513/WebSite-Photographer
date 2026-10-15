// ============================================================
// Posiciona as setas de navegação do Swiper junto à imagem
// visível (funciona para imagens 9:16, 16:9 ou quadradas).
// Usa-se em qualquer página com <div class="swiper"> e os botões
// .swiper-button-prev / .swiper-button-next dentro dela.
// ============================================================

// Ajusta a largura da "janela" do carrossel ao tamanho da imagem visível
// (limitada pela altura do carrossel), em vez de ocupar o ecrã todo.
function ajustarGaleria(swiperInstance) {
    const el = swiperInstance && swiperInstance.el;
    if (!el) return;

    const slide = swiperInstance.slides && swiperInstance.slides[swiperInstance.activeIndex];
    const img = slide && slide.querySelector('img');

    if (!img || !img.naturalWidth || !img.naturalHeight) {
        posicionarSetas(swiperInstance);
        return;
    }

    const alturaSlide = el.clientHeight;
    if (!alturaSlide) return;

    // Largura que a foto terá quando limitada apenas pela ALTURA do carrossel
    // (independente da largura atual — evita oscilações de medida)
    const escala = Math.min(1, alturaSlide / img.naturalHeight);
    const larguraVisivel = img.naturalWidth * escala;

    const moldura = 44;      // respiro em volta da foto (22px de cada lado)
    const paddingBloco = 48; // padding horizontal do bloco .container (24px de cada lado)

    // Medir o espaço disponível sem o limite que possamos ter aplicado antes
    const bloco = el.parentElement;
    if (bloco && bloco.style.maxWidth) {
        bloco.style.maxWidth = '';
    }
    const larguraPai = bloco ? bloco.clientWidth : window.innerWidth;

    const larguraJanela = Math.max(
        220,
        Math.min(larguraVisivel + moldura, Math.max(220, larguraPai - paddingBloco))
    );

    el.style.width = larguraJanela + 'px';

    // Alinha o bloco completo do evento (título, info, carrossel e botão de
    // download) à mesma largura da janela — tudo centrado como um só cartão
    if (bloco && el.dataset.moldarBloco === '1') {
        bloco.style.maxWidth = (larguraJanela + paddingBloco) + 'px';
        bloco.style.marginLeft = 'auto';
        bloco.style.marginRight = 'auto';
    }

    // Recalcula as dimensões internas e coloca as setas junto à foto
    swiperInstance.update();
    posicionarSetas(swiperInstance);
}

function posicionarSetas(swiperInstance) {
    const el = swiperInstance && swiperInstance.el;
    if (!el) return;

    const slide = swiperInstance.slides && swiperInstance.slides[swiperInstance.activeIndex];
    const img = slide && slide.querySelector('img');
    const btnPrev = el.querySelector('.swiper-button-prev');
    const btnNext = el.querySelector('.swiper-button-next');
    if (!img || !btnPrev || !btnNext) return;

    const elRect = el.getBoundingClientRect();
    const imgRect = img.getBoundingClientRect();

    // Imagem ainda sem dimensões (a carregar) — nada a fazer por agora
    if (!imgRect.width || !imgRect.height) return;

    const margem = 10; // distância entre a seta e a borda da imagem
    const btnW = btnPrev.offsetWidth || 40;

    const esquerda = (imgRect.left - elRect.left) - margem - btnW;
    const direita = (elRect.right - imgRect.right) - margem - btnW;

    btnPrev.style.left = Math.max(8, esquerda) + 'px';
    btnNext.style.right = Math.max(8, direita) + 'px';
}

// Observa o carregamento das imagens de um .swiper e atualiza as setas
// sempre que uma imagem fica disponível (lazy loading incluído).
function observarImagensSwiper(containerEl) {
    if (!containerEl || !containerEl.querySelectorAll) return;

    containerEl.querySelectorAll('.swiper img').forEach(img => {
        if (img.dataset.setasObservada) return;
        img.dataset.setasObservada = '1';

        const atualizar = () => {
            const swiperEl = img.closest('.swiper');
            const sw = swiperEl && swiperEl.swiper;
            if (sw) ajustarGaleria(sw);
        };

        if (img.complete && img.naturalWidth) {
            requestAnimationFrame(atualizar);
        } else {
            img.addEventListener('load', atualizar);
        }
    });
}
