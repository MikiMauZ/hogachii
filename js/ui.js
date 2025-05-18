// Funciones UI compartidas

// Mostrar notificación
function showNotification(message, type = 'info') {
  // Eliminar notificaciones existentes
  const existingNotifications = document.querySelectorAll('.notification');
  existingNotifications.forEach(note => note.remove());
  
  // Crear nueva notificación
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.textContent = message;
  
  // Añadir al DOM
  document.body.appendChild(notification);
  
  // Eliminar después de 3 segundos
  setTimeout(() => {
    notification.style.opacity = '0';
    setTimeout(() => {
      notification.remove();
    }, 300);
  }, 3000);
}

// Cargar datos del usuario en el menú
// Cargar datos del usuario en el menú
function updateUserMenu() {
  const userMenu = document.getElementById('userMenu');
  const currentUser = firebase.auth().currentUser;
  
  if (userMenu) {
    if (currentUser) {
      // Usuario autenticado
      const displayName = currentUser.displayName || 'Usuario';
      const initial = displayName.charAt(0).toUpperCase();
      
      userMenu.innerHTML = `
  <div class="user-dropdown">
    <div class="user-avatar" id="userAvatar">${initial}</div>
    <div class="user-dropdown-content" id="userDropdown">
      <a href="profile.html"><i class="fas fa-user"></i> Mi Perfil</a>
      <a href="#" class="logout" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Cerrar Sesión</a>
    </div>
  </div>
`;
      
      // Evento para mostrar/ocultar dropdown
      const userAvatar = document.getElementById('userAvatar');
      const userDropdown = document.getElementById('userDropdown');
      
      userAvatar.addEventListener('click', function(e) {
        e.stopPropagation();
        userDropdown.classList.toggle('show');
      });
      
      // Cerrar dropdown al hacer clic en cualquier otra parte
      document.addEventListener('click', function(e) {
        if (userDropdown.classList.contains('show') && e.target !== userAvatar) {
          userDropdown.classList.remove('show');
        }
      });
      
      // Evento para cerrar sesión
      document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        firebase.auth().signOut().then(() => {
          window.location.href = 'login.html';
        }).catch(error => {
          showNotification('Error al cerrar sesión', 'error');
        });
      });
    } else {
      // Usuario no autenticado
      userMenu.innerHTML = `
        <a href="login.html" class="kawaii-btn">Iniciar Sesión</a>
      `;
    }
  }
}

// Verificar si el usuario está autenticado
function checkAuth() {
  return new Promise((resolve, reject) => {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        updateUserMenu();
        resolve(user);
      } else {
        // Redirigir a login si no estamos ya en la página de login o registro
        const currentPage = window.location.pathname.split('/').pop();
        if (currentPage !== 'login.html' && currentPage !== 'register.html') {
          window.location.href = 'login.html';
        }
        reject('Usuario no autenticado');
      }
    });
  });
}

// Agregar animaciones kawaii a elementos
function addKawaiiEffects() {
  // Añadir efectos a los botones
  document.querySelectorAll('.kawaii-btn').forEach(btn => {
    btn.addEventListener('mouseover', () => {
      btn.style.transform = 'translateY(-3px)';
    });
    
    btn.addEventListener('mouseout', () => {
      btn.style.transform = 'translateY(0)';
    });
  });
}

// Inicializar los dropdowns
function initDropdowns() {
  document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.preventDefault();
      const dropdownMenu = toggle.nextElementSibling;
      dropdownMenu.classList.toggle('show');
      
      // Cerrar al hacer clic fuera
      document.addEventListener('click', function closeDropdown(event) {
        if (!toggle.contains(event.target) && !dropdownMenu.contains(event.target)) {
          dropdownMenu.classList.remove('show');
          document.removeEventListener('click', closeDropdown);
        }
      });
    });
  });
}

// Funciones para el menú hamburguesa mejorado
function setupMobileMenu() {
  const hamburgerMenu = document.getElementById('hamburgerMenu');
  const mobileMenu = document.getElementById('mobileMenu');
  
  if (hamburgerMenu && mobileMenu) {
    hamburgerMenu.addEventListener('click', () => {
      hamburgerMenu.classList.toggle('active');
      
      if (mobileMenu.classList.contains('open')) {
        // Cerrar menú con una transición suave
        mobileMenu.classList.remove('open');
        document.body.style.overflow = '';
        
        setTimeout(() => {
          mobileMenu.style.display = 'none';
        }, 400); // Coincidir con duración de la transición
      } else {
        // Abrir menú con una transición suave
        mobileMenu.style.display = 'flex';
        document.body.style.overflow = 'hidden'; // Evitar scroll mientras el menú está abierto
        
        setTimeout(() => {
          mobileMenu.classList.add('open');
        }, 10);
      }
    });
    
    // Cerrar el menú al hacer clic en un enlace
    const menuLinks = mobileMenu.querySelectorAll('a');
    menuLinks.forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.remove('open');
        hamburgerMenu.classList.remove('active');
        document.body.style.overflow = '';
        
        setTimeout(() => {
          mobileMenu.style.display = 'none';
        }, 400);
      });
    });
    
    // Marcar la página actual como activa
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    menuLinks.forEach(link => {
      const href = link.getAttribute('href');
      if (href === currentPage) {
        link.classList.add('active');
      }
    });
  }
}

// Agregar a las funciones que se ejecutan al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  updateUserMenu();
  addKawaiiEffects();
  initDropdowns();
  setupMobileMenu(); // Añadir esta línea
});

// Obtener el hogar actual del usuario
function getCurrentHome() {
  return localStorage.getItem('currentHomeId');
}

// Establecer el hogar actual del usuario
function setCurrentHome(homeId) {
  localStorage.setItem('currentHomeId', homeId);
}

// Inicializar elementos UI al cargar la página
document.addEventListener('DOMContentLoaded', () => {
  updateUserMenu();
  addKawaiiEffects();
  initDropdowns();
  setupMobileMenu();
});