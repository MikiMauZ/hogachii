// Funciones para el chat familiar
document.addEventListener('DOMContentLoaded', function() {
  // Referencias a elementos del DOM
  const messagesContainer = document.getElementById('messagesContainer');
  const messageInput = document.getElementById('messageInput');
  const sendMessageBtn = document.getElementById('sendMessageBtn');
  const chatMembers = document.getElementById('chatMembers');
  const emojiPickerBtn = document.getElementById('emojiPickerBtn');
  const emojiPicker = document.getElementById('emojiPicker');
  
  // Estado para el homeId actual
  let currentHomeId = null;
  
  // Verificar autenticación
  checkAuth().then(user => {
    // Obtener ID del hogar actual
    currentHomeId = getCurrentHome();
    
    if (!currentHomeId) {
      showNotification('No hay un hogar seleccionado. Por favor, crea o únete a un hogar primero.', 'error');
      messagesContainer.innerHTML = '<p class="empty-message">Selecciona un hogar para chatear</p>';
      return;
    }
    
    // Cargar miembros del hogar
    loadFamilyMembers();
    
    // Cargar mensajes del chat
    loadMessages();
    
    // Inicializar emoji picker
    initEmojiPicker();
    
    // Setup de eventos
    setupEventListeners();
  }).catch(error => {
    console.error("Error de autenticación:", error);
  });
  
  function setupEventListeners() {
    // Enviar mensaje al hacer clic en el botón
    sendMessageBtn.addEventListener('click', sendMessage);
    
    // Enviar mensaje al presionar Enter
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
    
    // Mostrar/ocultar selector de emojis
    emojiPickerBtn.addEventListener('click', toggleEmojiPicker);
    
    // Cerrar el selector de emojis al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (emojiPicker.style.display === 'block' && 
          !emojiPickerBtn.contains(e.target) && 
          !emojiPicker.contains(e.target)) {
        emojiPicker.style.display = 'none';
      }
    });
  }
  
  // Cargar miembros del hogar
  function loadFamilyMembers() {
    chatMembers.innerHTML = '<div class="loader"></div>';
    
    // Obtener el hogar para ver los miembros
    db.collection('homes').doc(currentHomeId).get()
      .then((doc) => {
        if (doc.exists) {
          const home = doc.data();
          const memberIds = home.members || [];
          
          // Si no hay miembros, salir
          if (memberIds.length === 0) {
            chatMembers.innerHTML = '<p class="empty-message">No hay miembros en este hogar</p>';
            return;
          }
          
          // Promesas para obtener info de cada miembro
          const memberPromises = memberIds.map(memberId => {
            if (firebase.auth().currentUser && firebase.auth().currentUser.uid === memberId) {
              return Promise.resolve({ 
                id: memberId, 
                displayName: 'Yo',
                avatar: getUserAvatar(firebase.auth().currentUser),
                online: true
              });
            } else {
              return db.collection('users').doc(memberId).get().then(userDoc => {
                if (userDoc.exists) {
                  return {
                    id: memberId,
                    displayName: userDoc.data().displayName || 'Usuario',
                    avatar: userDoc.data().avatar || 'default',
                    online: false // Como ejemplo, solo el usuario actual aparece online
                  };
                }
                return { 
                  id: memberId, 
                  displayName: 'Usuario',
                  avatar: 'default',
                  online: false
                };
              });
            }
          });
          
          // Resolver todas las promesas
          return Promise.all(memberPromises);
        }
        
        return [];
      })
      .then((members) => {
        if (members.length === 0) {
          chatMembers.innerHTML = '<p class="empty-message">No hay miembros en este hogar</p>';
          return;
        }
        
        let membersHTML = '<h3>Miembros del Hogar</h3>';
        
        members.forEach(member => {
          membersHTML += `
            <div class="chat-member">
              <div class="member-avatar">${getAvatarIcon(member.avatar)}</div>
              <div class="member-name">${member.displayName}</div>
              ${member.online ? '<div class="member-online"></div>' : ''}
            </div>
          `;
        });
        
        chatMembers.innerHTML = membersHTML;
      })
      .catch(error => {
        console.error("Error al cargar miembros:", error);
        chatMembers.innerHTML = '<p class="error-message">Error al cargar miembros</p>';
      });
  }
  
  // Cargar mensajes del chat
  function loadMessages() {
    messagesContainer.innerHTML = '<div class="loader"></div>';
    
    // Referencia al chat
    const chatRef = db.collection('chats').doc(currentHomeId);
    
    // Verificar si existe el documento del chat, si no, crearlo
    chatRef.get().then(doc => {
      if (!doc.exists) {
        return chatRef.set({
          homeId: currentHomeId,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      }
    }).then(() => {
      // Escuchar nuevos mensajes en tiempo real
      chatRef.collection('messages')
        .orderBy('timestamp', 'desc')
        .limit(50)
        .onSnapshot((snapshot) => {
          // Limpiar loader si existe
          if (messagesContainer.querySelector('.loader')) {
            messagesContainer.innerHTML = '';
          }
          
          // Si no hay mensajes
          if (snapshot.empty && messagesContainer.children.length === 0) {
            messagesContainer.innerHTML = `
              <div class="empty-chat">
                <div class="empty-chat-icon">💬</div>
                <p>Aún no hay mensajes. ¡Sé el primero en saludar!</p>
              </div>
            `;
            return;
          }
          
          // Procesar cambios en los mensajes
          snapshot.docChanges().forEach((change) => {
            if (change.type === 'added') {
              const message = change.doc.data();
              appendMessageToUI(change.doc.id, message);
            }
          });
        }, (error) => {
          console.error("Error al cargar mensajes:", error);
          messagesContainer.innerHTML = '<p class="error-message">Error al cargar mensajes</p>';
        });
    }).catch(error => {
      console.error("Error al inicializar chat:", error);
      messagesContainer.innerHTML = '<p class="error-message">Error al inicializar chat</p>';
    });
  }
  
  // Enviar un mensaje
  function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;
    
    const user = firebase.auth().currentUser;
    if (!user) return;
    
    // Obtener información del usuario actual
    getUserProfile(user.uid).then(profile => {
      // Referencia al chat
      const chatRef = db.collection('chats').doc(currentHomeId);
      
      // Crear el mensaje
      return chatRef.collection('messages').add({
        text,
        senderId: user.uid,
        senderName: profile.displayName || user.displayName || 'Usuario',
        avatar: profile.avatar || 'default',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
      });
    }).then(() => {
      // Limpiar input
      messageInput.value = '';
    }).catch(error => {
      console.error("Error al enviar mensaje:", error);
      showNotification('Error al enviar el mensaje', 'error');
    });
  }
  
  // Añadir mensaje a la UI
  function appendMessageToUI(id, message) {
    const messageElement = document.createElement('div');
    const currentUser = firebase.auth().currentUser;
    
    // Determinar si el mensaje es enviado o recibido
    const isSent = currentUser && message.senderId === currentUser.uid;
    
    messageElement.className = `message ${isSent ? 'sent' : 'received'}`;
    messageElement.id = `message-${id}`;
    
    // Formatear timestamp
    let timeStr = 'Ahora';
    if (message.timestamp) {
      const messageDate = message.timestamp.toDate ? message.timestamp.toDate() : new Date(message.timestamp);
      timeStr = formatMessageTime(messageDate);
    }
    
    messageElement.innerHTML = `
      <div class="message-content">
        ${!isSent ? `<div class="message-sender">${message.senderName}</div>` : ''}
        <div class="message-text">${message.text}</div>
        <div class="message-time">${timeStr}</div>
      </div>
    `;
    
    // Insertar al principio (ya que están ordenados por timestamp desc)
    messagesContainer.insertBefore(messageElement, messagesContainer.firstChild);
  }
  
  // Inicializar selector de emojis
  function initEmojiPicker() {
    // Asignar eventos a los emojis
    document.querySelectorAll('.emoji').forEach(emoji => {
      emoji.addEventListener('click', () => {
        insertEmoji(emoji.textContent);
        emojiPicker.style.display = 'none';
      });
    });
  }
  
  // Insertar emoji en el input
  function insertEmoji(emoji) {
    messageInput.value += emoji;
    messageInput.focus();
  }
  
  // Mostrar/ocultar selector de emojis
  function toggleEmojiPicker() {
    if (emojiPicker.style.display === 'none' || emojiPicker.style.display === '') {
      // Posicionar junto al botón
      const rect = emojiPickerBtn.getBoundingClientRect();
      emojiPicker.style.left = `${rect.left}px`;
      emojiPicker.style.top = `${rect.bottom + window.scrollY + 5}px`;
      
      emojiPicker.style.display = 'block';
    } else {
      emojiPicker.style.display = 'none';
    }
  }
  
  // Obtener icono para avatar
  function getAvatarIcon(avatar) {
    if (avatar === 'cat') return '🐱';
    if (avatar === 'dog') return '🐶';
    if (avatar === 'rabbit') return '🐰';
    if (avatar === 'bear') return '🐻';
    if (avatar === 'panda') return '🐼';
    
    // Default
    return '👤';
  }
  
  // Obtener avatar del usuario
  function getUserAvatar(user) {
    // Si ya tenemos la info del perfil, la usamos
    if (user.avatar) return user.avatar;
    
    // Si no, usamos la inicial como avatar
    const displayName = user.displayName || 'Usuario';
    return displayName.charAt(0).toUpperCase();
  }
  
  // Formatear tiempo de mensaje
  function formatMessageTime(date) {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000); // Diferencia en segundos
    
    if (diff < 60) return 'Ahora';
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    
    // Si es de otro día, mostrar fecha
    return date.toLocaleDateString();
  }
});