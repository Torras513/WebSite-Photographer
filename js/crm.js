document.addEventListener('DOMContentLoaded', async () => {
    // Verificação de sessão de administrador no servidor
    try {
        const meRes = await fetch('/api/me');
        if (!meRes.ok) throw new Error('sem sessão');
        const me = await meRes.json();
        if (me.role !== 'admin') throw new Error('sem permissão');
    } catch (err) {
        window.location.href = 'login?redirect=' + encodeURIComponent('crm');
        return;
    }

    carregarEstatisticasReais();
    carregarClientesRecentes();
    popularSelectClientes(); // Preenche as dropdowns de clientes
    carregarEventosPublicos(); // Carrega a tabela de galerias públicas
    carregarCategorias(); // Preenche as dropdowns de categorias a partir da BD
    carregarCategoriasConfig(); // Preenche a tabela de categorias (Configurações)

    // Listeners das funcionalidades de Configurações e edição de galerias
    const formEditarEvento = document.getElementById('form-editar-evento');
    if (formEditarEvento) formEditarEvento.addEventListener('submit', submeterEdicaoEvento);

    const formNovaCategoria = document.getElementById('form-nova-categoria');
    if (formNovaCategoria) formNovaCategoria.addEventListener('submit', criarCategoria);

    const formAlterarPassword = document.getElementById('form-alterar-password');
    if (formAlterarPassword) formAlterarPassword.addEventListener('submit', submeterAlterarPassword);

    const navLinks = document.querySelectorAll('.crm-nav .nav-link');
    const views = document.querySelectorAll('.crm-view');

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            const targetViewId = link.getAttribute('data-target');
            if (!targetViewId) return;

            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            views.forEach(view => {
                view.style.display = (view.id === targetViewId) ? 'block' : 'none';
            });
        });
    });

    // Submissão do formulário de upload de fotos (Modal Upload Privado)
    const formUpload = document.getElementById('form-upload-fotos');
    if (formUpload) {
        formUpload.addEventListener('submit', async (e) => {
            e.preventDefault();

            const feedbackDiv = document.getElementById('upload-feedback-msg');
            const btnSubmit = document.getElementById('btn-submit-upload');

            const clienteId = document.getElementById('upload-cliente-id')?.value;
            const dataSessao = document.getElementById('upload-data-sessao')?.value;
            const titulo = document.getElementById('upload-titulo-sessao')?.value;
            const fileInput = document.getElementById('input-fotos');

            if (!clienteId) {
                if (feedbackDiv) {
                    feedbackDiv.style.color = '#e63946';
                    feedbackDiv.innerText = 'Erro: Selecione primeiro um cliente no filtro de Galerias.';
                }
                return;
            }

            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                if (feedbackDiv) {
                    feedbackDiv.style.color = '#e63946';
                    feedbackDiv.innerText = 'Por favor, selecione pelo menos uma imagem.';
                }
                return;
            }

            const formData = new FormData();
            formData.append('cliente_id', clienteId);
            if (dataSessao) formData.append('data_sessao', dataSessao);
            if (titulo) formData.append('titulo', titulo);

            for (let i = 0; i < fileInput.files.length; i++) {
                formData.append('fotos', fileInput.files[i]);
            }

            if (btnSubmit) btnSubmit.disabled = true;
            if (feedbackDiv) {
                feedbackDiv.style.color = '#ffb703';
                feedbackDiv.innerText = 'A processar imagens e a converter para WebP... Aguarde.';
            }

            try {
                const response = await fetch('/api/admin/galerias/upload', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Falha ao enviar ficheiros');
                }

                const result = await response.json();

                if (feedbackDiv) {
                    feedbackDiv.style.color = '#2ec4b6';
                    feedbackDiv.innerText = `Sucesso! ${result.total || 'Foto(s)'} adicionada(s) com sucesso!`;
                }

                setTimeout(() => {
                    fecharModalUpload();
                    carregarEstatisticasReais();
                    carregarSessoesDoCliente(clienteId);
                }, 1200);

            } catch (err) {
                console.error('Erro ao enviar fotos:', err);
                if (feedbackDiv) {
                    feedbackDiv.style.color = '#e63946';
                    feedbackDiv.innerText = `Erro: ${err.message}`;
                }
            } finally {
                if (btnSubmit) btnSubmit.disabled = false;
            }
        });
    }

    // Submissão do formulário de Criar Galeria Pública
    const formEvento = document.getElementById('form-evento-publico');
    if (formEvento) {
        formEvento.addEventListener('submit', async (e) => {
            e.preventDefault();

            const feedbackDiv = document.getElementById('evento-feedback-msg');
            const btnSubmit = document.getElementById('btn-submit-evento');
            const fileInput = document.getElementById('input-fotos-evento');

            if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
                if (feedbackDiv) {
                    feedbackDiv.style.color = '#e63946';
                    feedbackDiv.innerText = 'Selecione pelo menos uma fotografia.';
                }
                return;
            }

            const formData = new FormData();
            
            // Mapeamento flexível de inputs com suporte aos nomes do formulário no HTML
            const tituloVal = document.getElementById('evento-titulo')?.value || document.getElementById('publica-titulo')?.value;
            const categoriaVal = document.getElementById('evento-categoria')?.value || document.getElementById('publica-categoria')?.value;
            const localizacaoVal = document.getElementById('evento-localizacao')?.value || document.getElementById('publica-localizacao')?.value;
            const dataVal = document.getElementById('evento-data')?.value || document.getElementById('publica-data')?.value;

            if (tituloVal) formData.append('titulo', tituloVal);
            if (categoriaVal) formData.append('categoria_id', categoriaVal);
            if (localizacaoVal) formData.append('localizacao', localizacaoVal);
            if (dataVal) formData.append('data_evento', dataVal);

            for (let i = 0; i < fileInput.files.length; i++) {
                formData.append('fotos', fileInput.files[i]);
            }

            if (btnSubmit) btnSubmit.disabled = true;
            if (feedbackDiv) {
                feedbackDiv.style.color = '#ffb703';
                feedbackDiv.innerText = 'A processar fotografias e a otimizar para WebP + Original JPG... Aguarde.';
            }

            try {
                const response = await fetch('/api/admin/galerias/publicas', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || 'Erro ao publicar galeria.');
                }

                if (feedbackDiv) {
                    feedbackDiv.style.color = '#2ec4b6';
                    feedbackDiv.innerText = 'Galeria pública criada com sucesso!';
                }

                setTimeout(() => {
                    fecharModalEventoPublico();
                    carregarEventosPublicos();
                    carregarEstatisticasReais();
                }, 1000);

            } catch (err) {
                console.error('Erro ao publicar galeria:', err);
                if (feedbackDiv) {
                    feedbackDiv.style.color = '#e63946';
                    feedbackDiv.innerText = `Erro: ${err.message}`;
                }
            } finally {
                if (btnSubmit) btnSubmit.disabled = false;
            }
        });
    }

    // Formulário de Edição de Cliente
    const formEditarCliente = document.getElementById('form-editar-cliente');
    if (formEditarCliente) {
        formEditarCliente.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-cliente-id').value;
            const nome = document.getElementById('edit-cliente-nome').value;
            const email = document.getElementById('edit-cliente-email').value;

            try {
                const res = await fetch(`/api/admin/clientes/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ nome, email })
                });

                if (!res.ok) throw new Error('Erro ao atualizar cliente');

                alert('Dados do cliente atualizados com sucesso!');
                fecharModalEditarCliente();
                carregarClientesRecentes();
                popularSelectClientes();
            } catch (err) {
                console.error('Erro:', err);
                alert('Erro ao atualizar os dados do cliente.');
            }
        });
    }

    // Formulário de Novo Cliente
    const formNovoCliente = document.getElementById('form-novo-cliente');
    if (formNovoCliente) {
        formNovoCliente.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nome = document.getElementById('novo-cliente-nome').value.trim();
            const email = document.getElementById('novo-cliente-email').value.trim();
            const password = document.getElementById('novo-cliente-pass').value;

            const feedbackDiv = document.getElementById('novo-cliente-feedback');
            const btnSubmit = document.getElementById('btn-submit-novo-cliente');

            if (btnSubmit) btnSubmit.disabled = true;
            if (feedbackDiv) {
                feedbackDiv.style.color = '#ffb703';
                feedbackDiv.innerText = 'A criar cliente... Por favor aguarde.';
            }

            try {
                const response = await fetch('/api/admin/clientes', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ nome, email, password })
                });

                const data = await response.json();

                if (response.ok) {
                    if (feedbackDiv) {
                        feedbackDiv.style.color = '#2ec4b6';
                        feedbackDiv.innerText = 'Cliente criado com sucesso!';
                    }

                    setTimeout(() => {
                        fecharModalNovoCliente();
                        carregarClientesRecentes();
                        carregarEstatisticasReais();
                        popularSelectClientes();
                    }, 1000);

                } else {
                    throw new Error(data.error || 'Erro ao criar cliente.');
                }
            } catch (err) {
                console.error('Erro no registo do cliente:', err);
                if (feedbackDiv) {
                    feedbackDiv.style.color = '#e63946';
                    feedbackDiv.innerText = `Erro: ${err.message}`;
                }
            } finally {
                if (btnSubmit) btnSubmit.disabled = false;
            }
        });
    }

    // Handler do formulário de adicionar mais fotos a sessões
    const formMaisFotos = document.getElementById('form-adicionar-mais-fotos');
    if (formMaisFotos) {
        formMaisFotos.addEventListener('submit', async (e) => {
            e.preventDefault();

            const sessaoId = document.getElementById('mais-fotos-sessao-id').value;
            const fileInput = document.getElementById('input-mais-fotos');
            const feedbackDiv = document.getElementById('mais-fotos-feedback-msg');
            const btnSubmit = document.getElementById('btn-submit-mais-fotos');

            if (!fileInput.files || fileInput.files.length === 0) {
                if (feedbackDiv) {
                    feedbackDiv.style.color = '#e63946';
                    feedbackDiv.innerText = 'Selecione pelo menos uma fotografia.';
                }
                return;
            }

            const formData = new FormData();
            for (let i = 0; i < fileInput.files.length; i++) {
                formData.append('fotos', fileInput.files[i]);
            }

            if (btnSubmit) btnSubmit.disabled = true;
            if (feedbackDiv) {
                feedbackDiv.style.color = '#ffb703';
                feedbackDiv.innerText = 'A carregar e a otimizar imagens... Aguarde.';
            }

            try {
                const response = await fetch(`/api/admin/sessoes/${sessaoId}/fotos`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: formData
                });

                if (!response.ok) throw new Error('Falha ao adicionar novas fotos.');

                if (feedbackDiv) {
                    feedbackDiv.style.color = '#2ec4b6';
                    feedbackDiv.innerText = 'Fotografias adicionadas com sucesso!';
                }

                setTimeout(() => {
                    fecharModalAdicionarMaisFotos();
                    const clienteId = document.getElementById('filtro-cliente-galeria')?.value;
                    if (clienteId) carregarSessoesDoCliente(clienteId);
                }, 1000);

            } catch (err) {
                console.error(err);
                if (feedbackDiv) {
                    feedbackDiv.style.color = '#e63946';
                    feedbackDiv.innerText = `Erro: ${err.message}`;
                }
            } finally {
                if (btnSubmit) btnSubmit.disabled = false;
            }
        });
    }
});

let sessaoAtualId = null;
let fotoIdsParaEliminar = new Set();

// 1. CARREGAR ESTATÍSTICAS
async function carregarEstatisticasReais() {
    try {
        const response = await fetch('/api/admin/stats', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) return;
        const data = await response.json();

        animarContador('stat-total-clientes', data.totalClientes ?? 0);
        animarContador('stat-galerias-ativas', data.galeriasAtivas ?? 0);
        animarContador('stat-total-fotos', data.totalFotos ?? 0);
    } catch (error) {
        console.error('Falha ao procurar estatísticas:', error);
    }
}

function animarContador(elementId, valorFinal, duracao = 1000) {
    const el = document.getElementById(elementId);
    if (!el) return;

    let valorInicial = 0;
    const incremento = valorFinal / (duracao / 16);

    const timer = setInterval(() => {
        valorInicial += incremento;
        if (valorInicial >= valorFinal) {
            el.textContent = valorFinal.toLocaleString('pt-PT');
            clearInterval(timer);
        } else {
            el.textContent = Math.floor(valorInicial).toLocaleString('pt-PT');
        }
    }, 16);
}

// 2. GESTÃO DE CLIENTES
async function carregarClientesRecentes() {
    const tbody = document.getElementById('crm-clients-list');
    if (!tbody) return;

    try {
        const response = await fetch('/api/admin/clientes', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) throw new Error('Falha ao obter lista de clientes');

        const clientes = await response.json();
        renderizarTabelaClientes(clientes);
    } catch (error) {
        console.error('Erro:', error);
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #e74c3c;">Erro ao carregar clientes.</td></tr>`;
    }
}

function renderizarTabelaClientes(clientes) {
    const tbody = document.getElementById('crm-clients-list');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (clientes.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #888;">Nenhum cliente registado.</td></tr>`;
        return;
    }

    clientes.forEach(cliente => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${cliente.nome}</strong></td>
            <td>${cliente.email}</td>
            <td><span class="badge badge-success">Ativo</span></td>
            <td>
                <div class="actions-cell">
                    <button class="btn-action" onclick="abrirModalEditarCliente(${cliente.id}, '${cliente.nome}', '${cliente.email}')">✏️ Editar</button>
                    <button class="btn-action" onclick="gerirPassword(${cliente.id}, '${cliente.nome}')">🔑 Password</button>
                    <button class="btn-action" onclick="verGaleria(${cliente.id})">👁️ Ver Site</button>
                    <button class="btn-action" style="background: #d62828 !important; color: #fff;" onclick="removerCliente(${cliente.id}, '${cliente.nome}')">🗑️ Remover</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function popularSelectClientes() {
    const select = document.getElementById('filtro-cliente-galeria');
    if (!select) return;

    try {
        const res = await fetch('/api/admin/clientes', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!res.ok) return;

        const clientes = await res.json();
        const valorAtual = select.value;

        select.innerHTML = '<option value="">Selecione um cliente...</option>';
        clientes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.id;
            opt.textContent = c.nome;
            select.appendChild(opt);
        });

        if (valorAtual) select.value = valorAtual;
    } catch (e) {
        console.error('Erro ao carregar lista de clientes:', e);
    }
}

// 3. GESTÃO DE SESSÕES PRIVADAS
async function carregarSessoesDoCliente(clienteId) {
    const tbody = document.getElementById('crm-sessoes-list');

    if (!clienteId) {
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">Selecione um cliente para visualizar as suas sessões.</td></tr>';
        }
        return;
    }

    try {
        const response = await fetch(`/api/admin/sessoes/cliente/${clienteId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!response.ok) throw new Error('Erro ao carregar sessões.');

        const sessoes = await response.json();
        if (!tbody) return;

        if (sessoes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">Nenhuma sessão encontrada para este cliente.</td></tr>';
            return;
        }

        tbody.innerHTML = sessoes.map(sessao => `
            <tr>
                <td>${sessao.data_sessao ? new Date(sessao.data_sessao).toLocaleDateString('pt-PT') : 'N/D'}</td>
                <td><strong>${sessao.titulo || 'Sessão sem título'}</strong></td>
                <td>${sessao.total_fotos || 0} fotos</td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-action" style="background: #2ec4b6 !important; color: #fff;" onclick="abrirModalAdicionarMaisFotos(${sessao.id}, '${sessao.titulo || 'Sessão'}')">➕ Fotos</button>
                        <button class="btn-action" onclick="abrirModalGerirFotos(${sessao.id}, '${sessao.titulo || 'Sessão'}')">🗑️ Gerir Fotos</button>
                        <button class="btn-action" onclick="abrirModalReordenar(${sessao.id})">↕️ Reordenar</button>
                    </div>
                </td>
            </tr>
        `).join('');

    } catch (err) {
        console.error('Erro ao carregar sessões:', err);
    }
}

// 4. GESTÃO DE GALERIAS PÚBLICAS
async function carregarEventosPublicos() {
    const tbody = document.getElementById('crm-galerias-publicas-list');
    if (!tbody) return;

    try {
        const response = await fetch('/api/admin/galerias/publicas');

        if (!response.ok) throw new Error('Falha ao carregar galerias públicas.');

        const galerias = await response.json();
        galeriasPublicasCache = galerias;

        if (galerias.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #888;">Nenhuma galeria pública encontrada.</td></tr>';
            return;
        }

        tbody.innerHTML = galerias.map(g => {
            const dataExibicao = g.data || g.data_evento;
            return `
            <tr>
                <td>${dataExibicao ? new Date(dataExibicao).toLocaleDateString('pt-PT') : 'N/D'}</td>
                <td><span class="badge">${g.categoria || 'Geral'}</span></td>
                <td><strong>${g.titulo}</strong></td>
                <td>${g.localizacao || '-'}</td>
                <td>${g.total_fotos || 0} fotos</td>
                <td>
                    <div class="actions-cell">
                        <button onclick="abrirModalEditarEvento(${g.id})" class="btn-action">✏️ Editar</button>
                        <button onclick="eliminarGaleriaPublica(${g.id})" class="btn-danger">Eliminar</button>
                    </div>
                </td>
            </tr>
        `}).join('');

    } catch (err) {
        console.error('Erro ao carregar galerias públicas:', err);
    }
}

async function eliminarGaleriaPublica(id) {
    if (!confirm('Tens a certeza que pretendes remover permanentemente esta galeria pública e todas as suas fotografias?')) return;

    try {
        const res = await fetch(`/api/admin/galerias/publicas/${id}`, {
            method: 'DELETE'
        });

        if (res.ok) {
            carregarEventosPublicos();
            carregarEstatisticasReais();
        } else {
            alert('Erro ao eliminar a galeria pública.');
        }
    } catch (e) {
        console.error('Erro:', e);
    }
}

function abrirModalEventoPublico() {
    const modal = document.getElementById('modal-evento-publico');
    if (modal) {
        const dataInput = document.getElementById('evento-data') || document.getElementById('publica-data');
        if (dataInput) dataInput.value = new Date().toISOString().split('T')[0];
        modal.style.display = 'flex';
    }
}

function fecharModalEventoPublico() {
    const modal = document.getElementById('modal-evento-publico');
    if (modal) {
        modal.style.display = 'none';
        const form = document.getElementById('form-evento-publico');
        if (form) form.reset();
        const feedback = document.getElementById('evento-feedback-msg');
        if (feedback) feedback.innerText = '';
    }
}

// 5. MODAIS E AÇÕES AUXILIARES
function abrirModalUpload() {
    const filtroCliente = document.getElementById('filtro-cliente-galeria');

    if (!filtroCliente || !filtroCliente.value) {
        alert('Por favor, selecione primeiro um cliente no filtro antes de criar uma sessão.');
        return;
    }

    const clienteId = filtroCliente.value;
    const nomeCliente = filtroCliente.options[filtroCliente.selectedIndex].text;

    document.getElementById('upload-cliente-id').value = clienteId;
    document.getElementById('upload-cliente-nome').value = nomeCliente;
    document.getElementById('upload-data-sessao').value = new Date().toISOString().split('T')[0];

    const modal = document.getElementById('modal-upload-fotos');
    if (modal) modal.style.display = 'flex';
}

function fecharModalUpload() {
    const modal = document.getElementById('modal-upload-fotos');
    if (modal) {
        modal.style.display = 'none';
        const form = document.getElementById('form-upload-fotos');
        if (form) form.reset();
        const feedbackDiv = document.getElementById('upload-feedback-msg');
        if (feedbackDiv) feedbackDiv.innerText = '';
    }
}

function abrirModalNovoCliente() {
    const modal = document.getElementById('modal-novo-cliente');
    if (modal) modal.style.display = 'flex';
}

function fecharModalNovoCliente() {
    const modal = document.getElementById('modal-novo-cliente');
    if (modal) {
        modal.style.display = 'none';
        const form = document.getElementById('form-novo-cliente');
        if (form) form.reset();
        const feedback = document.getElementById('novo-cliente-feedback');
        if (feedback) feedback.innerText = '';
    }
}

function abrirModalEditarCliente(id, nome, email) {
    const modal = document.getElementById('modal-editar-cliente');
    if (modal) {
        document.getElementById('edit-cliente-id').value = id;
        document.getElementById('edit-cliente-nome').value = nome;
        document.getElementById('edit-cliente-email').value = email;
        modal.style.display = 'flex';
    }
}

function fecharModalEditarCliente() {
    const modal = document.getElementById('modal-editar-cliente');
    if (modal) modal.style.display = 'none';
}

async function gerirPassword(clienteId, nomeCliente) {
    setTimeout(async () => {
        const novaPass = prompt(`Introduza a nova password para ${nomeCliente}:`);
        if (novaPass && novaPass.trim() !== '') {
            try {
                const response = await fetch(`/api/admin/clientes/${clienteId}/password`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    },
                    body: JSON.stringify({ password: novaPass })
                });

                if (response.ok) alert(`Password de ${nomeCliente} alterada com sucesso!`);
                else alert('Erro ao alterar a password.');
            } catch (err) {
                console.error('Erro:', err);
            }
        }
    }, 10);
}

async function removerCliente(clienteId, nomeCliente) {
    if (!confirm(`Remover o cliente "${nomeCliente}"? Todas as sessões e fotos associadas serão apagadas.`)) return;

    try {
        const response = await fetch(`/api/admin/clientes/${clienteId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (response.ok) {
            alert('Cliente removido com sucesso.');
            carregarClientesRecentes();
            carregarEstatisticasReais();
            popularSelectClientes();
        } else {
            alert('Erro ao remover o cliente.');
        }
    } catch (err) {
        console.error('Erro:', err);
    }
}

function verGaleria(clienteId) {
    window.open(`galeria-sessoes?clienteId=${clienteId}`, '_blank');
}

// 6. GERIR E REORDENAR FOTOS DE SESSÕES PRIVADAS
async function abrirModalGerirFotos(sessaoId, tituloSessao) {
    sessaoAtualId = sessaoId;
    fotoIdsParaEliminar.clear();

    const modal = document.getElementById('modal-gerir-fotos');
    const grid = document.getElementById('grid-fotos-sessao');
    const tituloEl = document.getElementById('titulo-modal-gerir');
    if (tituloEl) tituloEl.innerText = `Gerir Fotos: ${tituloSessao}`;

    try {
        const res = await fetch(`/api/admin/sessoes/${sessaoId}/fotos`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const fotos = await res.json();

        if (grid) {
            grid.innerHTML = fotos.map(f => {
                const imgSrc = f.caminho_foto_webp || f.caminho_foto_original || f.url_webp || f.url;
                return `
                <div class="foto-card-select" onclick="toggleSelecaoFoto(${f.id}, this)" style="position: relative; cursor: pointer; border: 2px solid transparent; border-radius: 6px; overflow: hidden; height: 100px;">
                    <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover;">
                    <div class="check-overlay" style="display: none; position: absolute; inset: 0; background: rgba(214, 40, 40, 0.6); align-items: center; justify-content: center; color: white; font-weight: bold;">✕ Selecionada</div>
                </div>
            `}).join('');
        }

        if (modal) modal.style.display = 'flex';
    } catch (e) {
        alert('Erro ao carregar fotos da sessão.');
    }
}

function toggleSelecaoFoto(fotoId, el) {
    const overlay = el.querySelector('.check-overlay');
    if (fotoIdsParaEliminar.has(fotoId)) {
        fotoIdsParaEliminar.delete(fotoId);
        el.style.borderColor = 'transparent';
        if (overlay) overlay.style.display = 'none';
    } else {
        fotoIdsParaEliminar.add(fotoId);
        el.style.borderColor = '#d62828';
        if (overlay) overlay.style.display = 'flex';
    }
}

function fecharModalGerirFotos() {
    const modal = document.getElementById('modal-gerir-fotos');
    if (modal) modal.style.display = 'none';
}

async function eliminarFotosSelecionadas() {
    if (fotoIdsParaEliminar.size === 0) return alert('Selecione pelo menos uma fotografia.');
    if (!confirm(`Remover permanentemente ${fotoIdsParaEliminar.size} fotografia(s)?`)) return;

    try {
        const res = await fetch(`/api/admin/sessoes/${sessaoAtualId}/fotos`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ fotoIds: Array.from(fotoIdsParaEliminar) })
        });

        if (res.ok) {
            fecharModalGerirFotos();
            const clienteId = document.getElementById('filtro-cliente-galeria')?.value;
            if (clienteId) carregarSessoesDoCliente(clienteId);
        } else {
            alert('Erro ao eliminar fotos.');
        }
    } catch (e) {
        console.error('Erro:', e);
    }
}

async function abrirModalReordenar(sessaoId) {
    sessaoAtualId = sessaoId;
    const modal = document.getElementById('modal-reordenar-fotos');
    const container = document.getElementById('container-reordenar');

    try {
        const res = await fetch(`/api/admin/sessoes/${sessaoId}/fotos`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const fotos = await res.json();

        if (container) {
            container.innerHTML = fotos.map(f => {
                const imgSrc = f.caminho_foto_webp || f.caminho_foto_original || f.url_webp || f.url;
                return `
                <div class="drag-foto-item" data-id="${f.id}" draggable="true" style="cursor: grab; border: 1px solid #333; border-radius: 6px; overflow: hidden; height: 90px;">
                    <img src="${imgSrc}" style="width: 100%; height: 100%; object-fit: cover; pointer-events: none;">
                </div>
            `}).join('');
        }

        ativarDragAndDrop();
        if (modal) modal.style.display = 'flex';
    } catch (e) {
        alert('Erro ao carregar fotografias para ordenação.');
    }
}

function fecharModalReordenar() {
    const modal = document.getElementById('modal-reordenar-fotos');
    if (modal) modal.style.display = 'none';
}

function ativarDragAndDrop() {
    const container = document.getElementById('container-reordenar');
    if (!container) return;

    let draggedItem = null;

    container.querySelectorAll('.drag-foto-item').forEach(item => {
        item.addEventListener('dragstart', () => { draggedItem = item; item.style.opacity = '0.4'; });
        item.addEventListener('dragend', () => { item.style.opacity = '1'; });
        item.addEventListener('dragover', e => e.preventDefault());
        item.addEventListener('drop', e => {
            e.preventDefault();
            if (item !== draggedItem) {
                const items = Array.from(container.children);
                const srcIndex = items.indexOf(draggedItem);
                const targetIndex = items.indexOf(item);
                if (srcIndex < targetIndex) container.insertBefore(draggedItem, item.nextSibling);
                else container.insertBefore(draggedItem, item);
            }
        });
    });
}

async function guardarNovaOrdem() {
    const items = document.querySelectorAll('#container-reordenar .drag-foto-item');
    const ordem = Array.from(items).map((item, index) => ({
        fotoId: parseInt(item.getAttribute('data-id'), 10),
        ordem: index + 1
    }));

    try {
        const res = await fetch(`/api/admin/sessoes/${sessaoAtualId}/reordenar`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ ordem })
        });

        if (res.ok) {
            alert('Ordem atualizada com sucesso!');
            fecharModalReordenar();
        } else {
            alert('Erro ao guardar a nova ordem.');
        }
    } catch (e) {
        console.error(e);
    }
}

function abrirModalAdicionarMaisFotos(sessaoId, tituloSessao) {
    const sessaoInput = document.getElementById('mais-fotos-sessao-id');
    const tituloEl = document.getElementById('titulo-modal-mais-fotos');
    const modal = document.getElementById('modal-adicionar-mais-fotos');

    if (sessaoInput) sessaoInput.value = sessaoId;
    if (tituloEl) tituloEl.innerText = `Adicionar Fotos: ${tituloSessao}`;
    if (modal) modal.style.display = 'flex';
}

function fecharModalAdicionarMaisFotos() {
    const modal = document.getElementById('modal-adicionar-mais-fotos');
    if (modal) {
        modal.style.display = 'none';
        const form = document.getElementById('form-adicionar-mais-fotos');
        if (form) form.reset();
        const feedback = document.getElementById('mais-fotos-feedback-msg');
        if (feedback) feedback.innerText = '';
    }
}

// ============================================================
// CATEGORIAS (preenchimento das dropdowns a partir da BD)
// ============================================================
let galeriasPublicasCache = [];
let categoriasCache = [];

async function carregarCategorias() {
    try {
        const res = await fetch('/api/admin/categorias');
        if (!res.ok) return;
        categoriasCache = await res.json();

        for (const sid of ['evento-categoria', 'evento-edit-categoria']) {
            const sel = document.getElementById(sid);
            if (!sel) continue;
            const valorAtual = sel.value;
            sel.innerHTML = categoriasCache.map(c =>
                `<option value="${c.id}">${c.nome}</option>`
            ).join('');
            if (valorAtual) sel.value = valorAtual;
        }
    } catch (err) {
        console.error('Erro ao carregar categorias:', err);
    }
}

// ============================================================
// EDITAR GALERIA PÚBLICA
// ============================================================
function abrirModalEditarEvento(id) {
    const g = galeriasPublicasCache.find(x => x.id === id);
    if (!g) return;

    const feedback = document.getElementById('evento-edit-feedback-msg');
    if (feedback) feedback.innerText = '';

    document.getElementById('evento-edit-id').value = g.id;
    document.getElementById('evento-edit-titulo').value = g.titulo || '';

    const selCat = document.getElementById('evento-edit-categoria');
    if (selCat) selCat.value = g.categoria_id || '';

    document.getElementById('evento-edit-localizacao').value = g.localizacao || '';

    const dataEl = document.getElementById('evento-edit-data');
    if (dataEl) {
        const d = g.data ? new Date(g.data) : null;
        dataEl.value = (d && !isNaN(d)) ? d.toISOString().split('T')[0] : '';
    }

    document.getElementById('evento-edit-descricao').value = g.descricao || g.organizacao || '';

    const modal = document.getElementById('modal-editar-evento');
    if (modal) modal.style.display = 'flex';
}

function fecharModalEditarEvento() {
    const modal = document.getElementById('modal-editar-evento');
    if (modal) {
        modal.style.display = 'none';
        const form = document.getElementById('form-editar-evento');
        if (form) form.reset();
        const feedback = document.getElementById('evento-edit-feedback-msg');
        if (feedback) feedback.innerText = '';
    }
}

async function submeterEdicaoEvento(e) {
    e.preventDefault();
    const id = document.getElementById('evento-edit-id').value;
    const feedback = document.getElementById('evento-edit-feedback-msg');

    const payload = {
        titulo: document.getElementById('evento-edit-titulo').value.trim(),
        categoria_id: document.getElementById('evento-edit-categoria').value,
        localizacao: document.getElementById('evento-edit-localizacao').value.trim(),
        data: document.getElementById('evento-edit-data').value,
        descricao: document.getElementById('evento-edit-descricao').value.trim()
    };

    if (!payload.titulo) {
        feedback.textContent = 'O título é obrigatório.';
        feedback.style.color = '#e63946';
        return;
    }

    try {
        const res = await fetch(`/api/admin/galerias/publicas/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok) {
            feedback.textContent = 'Galeria atualizada com sucesso!';
            feedback.style.color = '#2ec4b6';
            carregarEventosPublicos();
            setTimeout(fecharModalEditarEvento, 800);
        } else {
            feedback.textContent = data.error || 'Erro ao atualizar a galeria.';
            feedback.style.color = '#e63946';
        }
    } catch (err) {
        feedback.textContent = 'Erro de ligação ao servidor.';
        feedback.style.color = '#e63946';
    }
}

// ============================================================
// CONFIGURAÇÕES — GESTÃO DE CATEGORIAS
// ============================================================
async function carregarCategoriasConfig() {
    const tbody = document.getElementById('config-categorias-list');
    if (!tbody) return;

    try {
        const res = await fetch('/api/admin/categorias');
        if (!res.ok) throw new Error('falha ao carregar');
        const cats = await res.json();
        categoriasCache = cats;

        if (cats.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#888;">Sem categorias. Cria a primeira abaixo.</td></tr>';
            return;
        }

        tbody.innerHTML = cats.map(c => `
            <tr>
                <td><strong>${c.nome}</strong></td>
                <td>${c.pagina || '-'}</td>
                <td>${c.total_galerias ?? 0}</td>
                <td>
                    <div class="actions-cell">
                        <button class="btn-action" onclick="renomearCategoria(${c.id})">✏️ Editar</button>
                        <button class="btn-danger" onclick="eliminarCategoria(${c.id})">🗑️ Eliminar</button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#e63946;">Erro ao carregar categorias.</td></tr>';
    }
}

async function criarCategoria(e) {
    e.preventDefault();
    const nome = document.getElementById('nova-categoria-nome').value.trim();
    const pagina = document.getElementById('nova-categoria-pagina').value;
    if (!nome) return;

    try {
        const res = await fetch('/api/admin/categorias', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome, pagina })
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok) {
            document.getElementById('nova-categoria-nome').value = '';
            carregarCategoriasConfig();
            carregarCategorias();
        } else {
            alert(data.error || 'Erro ao criar categoria.');
        }
    } catch (err) {
        alert('Erro de ligação ao servidor.');
    }
}

async function renomearCategoria(id) {
    const cat = categoriasCache.find(c => c.id === id);
    if (!cat) return;

    const novoNome = prompt('Novo nome da categoria:', cat.nome || '');
    if (novoNome === null) return;
    if (!novoNome.trim()) { alert('O nome não pode ficar vazio.'); return; }

    const novaPagina = prompt(
        'Página no site onde as galerias desta categoria aparecem:\n(galeria-carros, galeria-paisagens ou vazio)',
        cat.pagina || ''
    );
    if (novaPagina === null) return;

    try {
        const res = await fetch(`/api/admin/categorias/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nome: novoNome.trim(), pagina: novaPagina.trim() || null })
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok) {
            carregarCategoriasConfig();
            carregarCategorias();
            carregarEventosPublicos();
        } else {
            alert(data.error || 'Erro ao atualizar categoria.');
        }
    } catch (err) {
        alert('Erro de ligação ao servidor.');
    }
}

async function eliminarCategoria(id) {
    if (!confirm('Eliminar esta categoria? (Só é possível se não tiver galerias associadas.)')) return;

    try {
        const res = await fetch(`/api/admin/categorias/${id}`, { method: 'DELETE' });
        const data = await res.json().catch(() => ({}));

        if (res.ok) {
            carregarCategoriasConfig();
            carregarCategorias();
        } else {
            alert(data.error || 'Erro ao eliminar categoria.');
        }
    } catch (err) {
        alert('Erro de ligação ao servidor.');
    }
}

// ============================================================
// CONFIGURAÇÕES — ALTERAR A PRÓPRIA PASSWORD
// ============================================================
async function submeterAlterarPassword(e) {
    e.preventDefault();
    const feedback = document.getElementById('password-feedback-msg');

    const atual = document.getElementById('password-atual').value;
    const nova = document.getElementById('password-nova').value;
    const confirmar = document.getElementById('password-confirmar').value;

    if (nova !== confirmar) {
        feedback.textContent = 'A confirmação não coincide com a nova password.';
        feedback.style.color = '#e63946';
        return;
    }

    try {
        const res = await fetch('/api/admin/password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password_atual: atual, password_nova: nova })
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok) {
            feedback.textContent = 'Password alterada com sucesso!';
            feedback.style.color = '#2ec4b6';
            document.getElementById('form-alterar-password').reset();
        } else {
            feedback.textContent = data.error || 'Erro ao alterar a password.';
            feedback.style.color = '#e63946';
        }
    } catch (err) {
        feedback.textContent = 'Erro de ligação ao servidor.';
        feedback.style.color = '#e63946';
    }
}