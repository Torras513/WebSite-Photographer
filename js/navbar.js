document.addEventListener('DOMContentLoaded', () => {
    // =========================================
    // 1. CONTROLO DO MENU HAMBÚRGUER (MOBILE)
    // =========================================
    const menuBtn = document.getElementById('mobile-menu-btn');
    const navMenu = document.getElementById('nav-menu');

    if (menuBtn && navMenu) {
        // Toggle de Abertura / Fecho do Menu no Mobile
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            menuBtn.classList.toggle('active');
            navMenu.classList.toggle('active');
        });

        // Fechar o menu automaticamente ao clicar em qualquer link interno
        const allNavLinks = navMenu.querySelectorAll('a');
        allNavLinks.forEach(link => {
            link.addEventListener('click', () => {
                menuBtn.classList.remove('active');
                navMenu.classList.remove('active');
            });
        });

        // Fechar o menu se o utilizador clicar fora da navbar
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && !menuBtn.contains(e.target)) {
                menuBtn.classList.remove('active');
                navMenu.classList.remove('active');
            }
        });
    }

    // =========================================
    // 2. VERIFICAÇÃO DE SESSÃO / AUTENTICAÇÃO
    // =========================================
    const isLoggedIn = localStorage.getItem('loggedIn') === 'true';
    const clienteData = localStorage.getItem('cliente');
    
    // Tenta obter o objeto do cliente guardado no login
    let cliente = null;
    if (clienteData) {
        try {
            cliente = JSON.parse(clienteData);
        } catch (e) {
            console.error('Erro ao ler dados do cliente:', e);
        }
    }

    // Elementos de Controlo da Navbar
    const loginLink = document.querySelector('a[href="login"]');
    const logoutBtn = document.getElementById('logoutBtn');
    const navLinks = document.querySelector('.nav-links');

    if (isLoggedIn) {
        // --- UTILIZADOR AUTENTICADO ---
        
        // Se existir o link para o login, escondemo-lo
        if (loginLink && loginLink.parentElement) {
            loginLink.parentElement.style.display = 'none';
        }

        // Mostramos o botão de Logout
        if (logoutBtn && logoutBtn.parentElement) {
            logoutBtn.parentElement.style.display = 'inline-block';
        }

        // Criar/Mostrar o nome do utilizador na Navbar (se tivermos os dados)
        if (cliente && cliente.nome && navLinks) {
            // Evita criar duplicados se o elemento já existir
            if (!document.getElementById('user-greeting')) {
                const userLi = document.createElement('li');
                userLi.id = 'user-greeting';
                
                // Primeiro nome do cliente para exibição limpa
                const primeiroNome = cliente.nome.split(' ')[0];
                
                userLi.innerHTML = `<span style="color: var(--bronze, #A67C52); font-weight: 500; padding: 0.5rem 1rem; display: inline-block;">Olá, ${primeiroNome}</span>`;
                
                // Insere a saudação antes do botão de Logout (ou no fim da lista)
                if (logoutBtn && logoutBtn.parentElement) {
                    navLinks.insertBefore(userLi, logoutBtn.parentElement);
                } else {
                    navLinks.appendChild(userLi);
                }
            }
        }

    } else {
        // --- UTILIZADOR NÃO AUTENTICADO ---
        
        // Garantimos que o botão de Login aparece
        if (loginLink && loginLink.parentElement) {
            loginLink.parentElement.style.display = 'inline-block';
        }

        // Escondemos o botão de Logout
        if (logoutBtn && logoutBtn.parentElement) {
            logoutBtn.parentElement.style.display = 'none';
        }

        // Removemos a saudação, se existir
        const userGreeting = document.getElementById('user-greeting');
        if (userGreeting) {
            userGreeting.remove();
        }
    }

    // =========================================
    // 3. EVENTO DO BOTÃO DE LOGOUT
    // =========================================
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();

            // Termina a sessão no servidor
            fetch('/api/logout', { method: 'POST' }).catch(() => {});

            // Limpa os dados de sessão
            localStorage.removeItem('loggedIn');
            localStorage.removeItem('cliente');

            // Redireciona para a página de login
            window.location.href = 'login';
        });
    }
});