document.addEventListener('DOMContentLoaded', () => {
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error');
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');

    // 1. Obter o parâmetro de destino descodificado ou direcionar para galeria-sessoes por defeito
    const urlParams = new URLSearchParams(window.location.search);
    const redirectParam = urlParams.get('redirect');
    const redirectTo = redirectParam ? decodeURIComponent(redirectParam) : 'galeria-sessoes';

    // 2. Alternar visibilidade da palavra-passe
    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            togglePassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
        });
    }

    // 3. Submissão do Formulário de Login para a API
    if (loginForm) {
        loginForm.addEventListener('submit', async event => {
            event.preventDefault(); // Evita SEMPRE o recarregamento da página

            const email = document.getElementById('username').value.trim();
            const password = passwordInput.value.trim();

            if (!email || !password) {
                errorMessage.textContent = 'Preencha o utilizador/e-mail e a palavra-passe.';
                errorMessage.style.display = 'block';
                return;
            }

            errorMessage.style.display = 'none';

            try {
                const response = await fetch('/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email, password: password })
                });

                const data = await response.json();
                console.log('Resposta da API:', data); // Diagnóstico na consola F12

                if (response.ok && (data.sucesso || data.cliente || data.id)) {
                    // Extrai o objeto do cliente e o ID de forma flexível (conforme a estrutura devolvida pelo backend)
                    const clienteData = data.cliente || data.user || data;
                    const clienteId = clienteData.id || data.id;

                    // Guarda a sessão, o ID direto (usado pelo galeria-sessoes.js) e o objeto completo
                    localStorage.setItem('loggedIn', 'true');
                    localStorage.setItem('clienteId', clienteId);
                    localStorage.setItem('cliente', JSON.stringify(clienteData));
                    if (clienteData.nome) localStorage.setItem('username', clienteData.nome);
                    localStorage.setItem('role', data.role || 'cliente');

                    // Administrador vai para o CRM por defeito; clientes vão para as galerias
                    const destino = (data.role === 'admin' && !redirectParam) ? 'crm' : redirectTo;
                    window.location.href = destino;
                    return;
                }

                // Se as credenciais estiverem erradas
                errorMessage.textContent = data.erro || data.error || 'O utilizador ou a palavra-passe estão incorretos.';
                errorMessage.style.display = 'block';

            } catch (err) {
                console.error('Erro na ligação à API:', err);
                errorMessage.textContent = 'Não foi possível ligar ao servidor de login.';
                errorMessage.style.display = 'block';
            }
        });
    }

    // 4. Atualizar o ano no rodapé
    const anoElemento = document.getElementById('ano-atual');
    if (anoElemento) {
        anoElemento.textContent = new Date().getFullYear();
    }

    // 5. Funcionalidade de Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', event => {
            event.preventDefault();
            fetch('/api/logout', { method: 'POST' }).catch(() => {});
            localStorage.removeItem('loggedIn');
            localStorage.removeItem('clienteId');
            localStorage.removeItem('cliente');
            localStorage.removeItem('username');
            window.location.href = 'login';
        });
    }
});