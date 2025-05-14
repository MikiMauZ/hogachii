// Funciones para la lista de compra

document.addEventListener('DOMContentLoaded', function() {
  // Referencias a elementos DOM
  const newItemInput = document.getElementById('newItemInput');
  const categorySelect = document.getElementById('categorySelect');
  const addItemBtn = document.getElementById('addItemBtn');
  const shoppingList = document.getElementById('shoppingList');
  const categoryFilters = document.querySelectorAll('.kawaii-filter');
  
  // Estado para el filtro actual
  let currentCategory = 'all';
  
  // Verificar autenticación
  checkAuth().then(user => {
    // Cargar lista de compra inicial
    loadShoppingList('all');
    
    // Setup de eventos
    setupEventListeners();
  }).catch(error => {
    console.error("Error de autenticación:", error);
  });
  
  function setupEventListeners() {
    // Añadir nuevo item
    addItemBtn.addEventListener('click', addNewItem);
    
    // También permitir añadir al presionar Enter
    newItemInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        addNewItem();
      }
    });
    
    // Filtros de categoría
    categoryFilters.forEach(filter => {
      filter.addEventListener('click', () => {
        // Actualizar UI
        categoryFilters.forEach(f => f.classList.remove('active'));
        filter.classList.add('active');
        
        // Actualizar filtro y cargar items
        currentCategory = filter.dataset.category;
        loadShoppingList(currentCategory);
      });
    });
  }
  
  // Cargar lista de compra según filtro
  function loadShoppingList(category) {
    // Mostrar loader
    shoppingList.innerHTML = '<div class="loader"></div>';
    
    const homeId = getCurrentHome();
    if (!homeId) {
      shoppingList.innerHTML = '<p class="empty-message">No hay un hogar seleccionado</p>';
      return;
    }
    
    // Preparar query base
    let query = db.collection('shoppingItems').where('homeId', '==', homeId);
    
    // Aplicar filtro si no es 'all'
    if (category !== 'all') {
      query = query.where('category', '==', category);
    }
    
    // Ejecutar query
    query.orderBy('addedAt', 'desc')
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          shoppingList.innerHTML = '<p class="empty-message">La lista de compra está vacía. ¡Añade algunos productos!</p>';
          return;
        }
        
        let itemsHTML = '';
        
        snapshot.forEach((doc) => {
          const item = doc.data();
          const itemId = doc.id;
          const categoryIcon = getCategoryIcon(item.category);
          
          itemsHTML += `
            <div class="shopping-item ${item.purchased ? 'purchased' : ''}" data-id="${itemId}">
              <div class="item-checkbox">
                <input type="checkbox" ${item.purchased ? 'checked' : ''}>
                <span class="checkmark"></span>
              </div>
              <div class="item-category">${categoryIcon}</div>
              <div class="item-name">${item.name}</div>
              <div class="item-actions">
                <button class="delete-btn">🗑️</button>
              </div>
            </div>
          `;
        });
        
        shoppingList.innerHTML = itemsHTML;
        
        // Añadir event listeners a los items
        setupShoppingItemListeners();
      })
      .catch((error) => {
        console.error("Error al cargar lista de compra:", error);
        shoppingList.innerHTML = '<p class="error-message">Error al cargar la lista de compra</p>';
      });
  }
  
  // Añadir event listeners a los items de compra
  function setupShoppingItemListeners() {
    // Checkboxes para marcar como comprado
    document.querySelectorAll('.item-checkbox input').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const shoppingItem = e.target.closest('.shopping-item');
        const itemId = shoppingItem.dataset.id;
        const isPurchased = e.target.checked;
        
        updateItemStatus(itemId, isPurchased);
      });
    });
    
    // Botones de eliminación
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const shoppingItem = e.target.closest('.shopping-item');
        const itemId = shoppingItem.dataset.id;
        
        deleteShoppingItem(itemId);
      });
    });
  }
  
  // Añadir nuevo item a la lista
  function addNewItem() {
    const itemName = newItemInput.value.trim();
    const category = categorySelect.value;
    
    if (!itemName) {
      showNotification('Por favor, introduce el nombre del producto', 'error');
      return;
    }
    
    const homeId = getCurrentHome();
    if (!homeId) {
      showNotification('No hay un hogar seleccionado', 'error');
      return;
    }
    
    const user = firebase.auth().currentUser;
    if (!user) {
      showNotification('Usuario no autenticado', 'error');
      return;
    }
    
    // Preparar objeto de item
    const itemData = {
      name: itemName,
      category: category,
      purchased: false,
      addedBy: user.uid,
      addedAt: firebase.firestore.FieldValue.serverTimestamp(),
      homeId: homeId
    };
    
    // Guardar en Firestore
    db.collection('shoppingItems').add(itemData)
      .then(() => {
        // Limpiar input
        newItemInput.value = '';
        
        // Recargar lista (manteniendo el filtro actual)
        loadShoppingList(currentCategory);
        
        showNotification('Producto añadido a la lista', 'success');
      })
      .catch((error) => {
        console.error("Error al añadir item:", error);
        showNotification('Error al añadir el producto', 'error');
      });
  }
  
  // Actualizar estado de un item (comprado/pendiente)
  function updateItemStatus(itemId, isPurchased) {
    db.collection('shoppingItems').doc(itemId).update({
      purchased: isPurchased
    })
    .then(() => {
      // Actualizar UI
      const shoppingItem = document.querySelector(`.shopping-item[data-id="${itemId}"]`);
      if (shoppingItem) {
        if (isPurchased) {
          shoppingItem.classList.add('purchased');
        } else {
          shoppingItem.classList.remove('purchased');
        }
      }
      
      showNotification(isPurchased ? 'Producto marcado como comprado' : 'Producto marcado como pendiente', 'success');
    })
    .catch((error) => {
      console.error("Error al actualizar item:", error);
      showNotification('Error al actualizar el producto', 'error');
    });
  }
  
  // Eliminar un item de la lista
  function deleteShoppingItem(itemId) {
    db.collection('shoppingItems').doc(itemId).delete()
      .then(() => {
        // Eliminar del DOM
        const shoppingItem = document.querySelector(`.shopping-item[data-id="${itemId}"]`);
        if (shoppingItem) {
          shoppingItem.remove();
        }
        
        // Verificar si la lista quedó vacía
        if (shoppingList.children.length === 0) {
          shoppingList.innerHTML = '<p class="empty-message">La lista de compra está vacía. ¡Añade algunos productos!</p>';
        }
        
        showNotification('Producto eliminado de la lista', 'success');
      })
      .catch((error) => {
        console.error("Error al eliminar item:", error);
        showNotification('Error al eliminar el producto', 'error');
      });
  }
  
  // Función para obtener icono según categoría
  function getCategoryIcon(category) {
    const icons = {
      'fruits': '🍎',
      'dairy': '🥛',
      'bakery': '🍞',
      'meat': '🥩',
      'cleaning': '🧹',
      'other': '📦'
    };
    
    return icons[category] || '📦';
  }
});