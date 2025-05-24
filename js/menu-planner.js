// Funciones para el planificador de menú semanal
document.addEventListener('DOMContentLoaded', function() {
  // Referencias a elementos del DOM
  const recipesList = document.getElementById('recipesList');
  const menuGrid = document.getElementById('menuGrid');
  const currentWeekLabel = document.getElementById('currentWeekLabel');
  const prevWeekBtn = document.getElementById('prevWeekBtn');
  const nextWeekBtn = document.getElementById('nextWeekBtn');
  const addRecipeBtn = document.getElementById('addRecipeBtn');
  const generateShoppingBtn = document.getElementById('generateShoppingBtn');
  const recipeSearch = document.getElementById('recipeSearch');
  const categoryFilters = document.querySelectorAll('.recipe-categories .kawaii-filter');
  const paginationInfo = document.getElementById('paginationInfo');
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  
  // Modales
  const recipeModal = document.getElementById('recipeModal');
  const closeRecipeModal = document.getElementById('closeRecipeModal');
  const cancelRecipeBtn = document.getElementById('cancelRecipeBtn');
  const deleteRecipeBtn = document.getElementById('deleteRecipeBtn');
  const recipeForm = document.getElementById('recipeForm');
  
  const assignRecipeModal = document.getElementById('assignRecipeModal');
  const closeAssignModal = document.getElementById('closeAssignModal');
  const cancelAssignBtn = document.getElementById('cancelAssignBtn');
  const confirmAssignBtn = document.getElementById('confirmAssignBtn');
  const removeFromMenuBtn = document.getElementById('removeFromMenuBtn');
  
  const viewRecipeModal = document.getElementById('viewRecipeModal');
  const closeViewRecipeModal = document.getElementById('closeViewRecipeModal');
  const closeViewRecipeBtn = document.getElementById('closeViewRecipeBtn');
  const editRecipeBtn = document.getElementById('editRecipeBtn');
  const addToMenuBtn = document.getElementById('addToMenuBtn');
  
  const generateShoppingModal = document.getElementById('generateShoppingModal');
  const closeShoppingModal = document.getElementById('closeShoppingModal');
  const cancelShoppingBtn = document.getElementById('cancelShoppingBtn');
  const confirmShoppingBtn = document.getElementById('confirmShoppingBtn');
  
  // Estado del planificador
  let currentWeekStart = getStartOfWeek(new Date());
  let currentRecipes = [];
  let currentFilter = 'all';
  let currentSearchTerm = '';
  let currentPage = 1;
  const recipesPerPage = 12; // Ajustado para mostrar más en escritorio
  
  // Estado para modales
  let selectedRecipeId = null;
  let selectedDay = null;
  let selectedMealTime = null;
  let isEditingMenu = false;
  
  // Verificar autenticación
  checkAuth().then(user => {
    // Inicializar el menú
    updateWeekLabel();
    loadMenuGrid();
    
    // Cargar recetas
    loadRecipes('all');
    
    // Setup de eventos
    setupEventListeners();
  }).catch(error => {
    console.error("Error de autenticación:", error);
  });
  
  function setupEventListeners() {
    // Navegación de semanas
    prevWeekBtn.addEventListener('click', () => {
      currentWeekStart.setDate(currentWeekStart.getDate() - 7);
      updateWeekLabel();
      loadMenuGrid();
    });
    
    nextWeekBtn.addEventListener('click', () => {
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      updateWeekLabel();
      loadMenuGrid();
    });
    
    // Navegación de páginas para recetas
    prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderRecipes();
      }
    });
    
    nextPageBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(currentRecipes.length / recipesPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderRecipes();
      }
    });
    
    // Botón para añadir nueva receta
    addRecipeBtn.addEventListener('click', () => {
      openNewRecipeModal();
    });
    
    // Filtros de categorías
    categoryFilters.forEach(filter => {
      filter.addEventListener('click', () => {
        categoryFilters.forEach(f => f.classList.remove('active'));
        filter.classList.add('active');
        
        currentFilter = filter.dataset.category;
        currentPage = 1; // Reiniciar a la primera página al cambiar filtro
        loadRecipes(currentFilter);
      });
    });
    
    // Búsqueda de recetas
    recipeSearch.addEventListener('input', () => {
      currentSearchTerm = recipeSearch.value.trim().toLowerCase();
      currentPage = 1; // Reiniciar a la primera página al buscar
      loadRecipes(currentFilter);
    });
    
    // Formulario de receta
    recipeForm.addEventListener('submit', (e) => {
      e.preventDefault();
      saveRecipe();
    });
    
    // Botón para añadir ingrediente
    document.getElementById('addIngredientBtn').addEventListener('click', addIngredientField);
    
    // Botones para cerrar modales
    closeRecipeModal.addEventListener('click', () => closeModal(recipeModal));
    cancelRecipeBtn.addEventListener('click', () => closeModal(recipeModal));
    closeAssignModal.addEventListener('click', () => closeModal(assignRecipeModal));
    cancelAssignBtn.addEventListener('click', () => closeModal(assignRecipeModal));
    closeViewRecipeModal.addEventListener('click', () => closeModal(viewRecipeModal));
    closeViewRecipeBtn.addEventListener('click', () => closeModal(viewRecipeModal));
    closeShoppingModal.addEventListener('click', () => closeModal(generateShoppingModal));
    cancelShoppingBtn.addEventListener('click', () => closeModal(generateShoppingModal));
    
    // Escuchar clics fuera de los modales para cerrar
    [recipeModal, assignRecipeModal, viewRecipeModal, generateShoppingModal].forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeModal(modal);
        }
      });
    });
    
    // Botón para eliminar receta
    deleteRecipeBtn.addEventListener('click', deleteRecipe);
    
    // Botón para editar receta desde vista detalle
    editRecipeBtn.addEventListener('click', () => {
      if (selectedRecipeId) {
        closeModal(viewRecipeModal);
        openEditRecipeModal(selectedRecipeId);
      }
    });
    
    // Botón para añadir receta al menú desde vista detalle
    addToMenuBtn.addEventListener('click', () => {
      if (selectedRecipeId) {
        closeModal(viewRecipeModal);
        openAssignModal(selectedRecipeId);
      }
    });
    
    // Botones para asignar receta al menú
    confirmAssignBtn.addEventListener('click', assignRecipeToMenu);
    removeFromMenuBtn.addEventListener('click', removeRecipeFromMenu);
    
    // Botón para generar lista de compra
    generateShoppingBtn.addEventListener('click', openGenerateShoppingModal);
    
    // Botón para confirmar generación de lista de compra
    confirmShoppingBtn.addEventListener('click', addIngredientsToShoppingList);
  }
  
  // Funciones para el menú semanal
  
  // Actualizar la etiqueta de la semana actual
  function updateWeekLabel() {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const formatDate = date => {
      return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    };
    
    currentWeekLabel.textContent = `${formatDate(currentWeekStart)} - ${formatDate(weekEnd)}`;
  }
  
  // Generar la estructura base del menú
  function loadMenuGrid() {
    // Mostrar loader
    menuGrid.innerHTML = `
      <div class="loader-container">
        <div class="loader"></div>
      </div>
    `;
    
    const homeId = getCurrentHome();
    if (!homeId) {
      menuGrid.innerHTML = '<p class="empty-message">No hay un hogar seleccionado</p>';
      return;
    }
    
    // Los tiempos de comida que mostramos
    const mealTimes = [
      { id: 'breakfast', label: 'Desayuno', icon: '☕' },
      { id: 'lunch', label: 'Comida', icon: '🍲' },
      { id: 'dinner', label: 'Cena', icon: '🍽️' }
    ];
    
    // Generar estructura HTML del grid
    let gridHTML = '';
    
    mealTimes.forEach(meal => {
      gridHTML += `
        <div class="meal-time-label">
          <span>${meal.icon} ${meal.label}</span>
        </div>
      `;
      
      // Generar celdas para los 7 días de la semana
      for (let i = 0; i < 7; i++) {
        const isWeekend = i >= 5;
        const cellDate = new Date(currentWeekStart);
        cellDate.setDate(cellDate.getDate() + i);
        
        const dateStr = formatDateForDb(cellDate);
        
        gridHTML += `
          <div class="menu-cell ${isWeekend ? 'weekend' : ''}" 
               data-day="${dateStr}" 
               data-meal="${meal.id}"
               onclick="openAssignModalForCell(this)">
            <div class="menu-cell-empty">+</div>
          </div>
        `;
      }
    });
    
    menuGrid.innerHTML = gridHTML;
    
    // Cargar las recetas asignadas al menú
    loadMenuAssignments(homeId);
    
    // Añadir evento global para abrir modal de asignación
    window.openAssignModalForCell = function(cell) {
      const day = cell.dataset.day;
      const meal = cell.dataset.meal;
      openAssignModalForDay(day, meal);
    };
  }
  
  // Cargar recetas asignadas para esta semana
  function loadMenuAssignments(homeId) {
    const startDateStr = formatDateForDb(currentWeekStart);
    
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 7);
    const endDateStr = formatDateForDb(endDate);
    
    db.collection('menuAssignments')
      .where('homeId', '==', homeId)
      .where('date', '>=', startDateStr)
      .where('date', '<', endDateStr)
      .get()
      .then((snapshot) => {
        snapshot.forEach((doc) => {
          const assignment = doc.data();
          assignment.id = doc.id;
          updateMenuCell(assignment);
        });
      })
      .catch((error) => {
        console.error("Error al cargar asignaciones del menú:", error);
      });
  }
  
  // Actualizar celda del menú con receta asignada
  function updateMenuCell(assignment) {
    const cell = document.querySelector(`.menu-cell[data-day="${assignment.date}"][data-meal="${assignment.mealTime}"]`);
    
    if (cell) {
      // Buscar la receta correspondiente
      db.collection('recipes').doc(assignment.recipeId).get()
        .then((doc) => {
          if (doc.exists) {
            const recipe = doc.data();
            
            cell.innerHTML = `
              <div class="menu-cell-content" data-assignment-id="${assignment.id || ''}">
                <div class="menu-recipe-icon">${getRecipeIcon(recipe.category)}</div>
                <div class="menu-recipe-name">${recipe.name}</div>
                <div class="menu-recipe-desc">${recipe.description || ''}</div>
              </div>
            `;
            
            // También actualizamos el evento onclick para editar la asignación
            cell.onclick = function() {
              openAssignModalForDay(assignment.date, assignment.mealTime, assignment.recipeId, assignment.id);
            };
          }
        })
        .catch((error) => {
          console.error("Error al cargar detalles de receta:", error);
        });
    }
  }
  
  // Abrir modal para asignar receta a un día y comida específicos
  function openAssignModalForDay(day, mealTime, recipeId = null, assignmentId = null) {
    selectedDay = day;
    selectedMealTime = mealTime;
    selectedRecipeId = recipeId;
    isEditingMenu = !!assignmentId;
    
    // Formatear fecha para mostrar
    const dayDate = parseDbDate(day);
    const dayStr = dayDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
    
    // Definir el título de la comida
    let mealTitle = '';
    switch (mealTime) {
      case 'breakfast': mealTitle = 'Desayuno'; break;
      case 'lunch': mealTitle = 'Comida'; break;
      case 'dinner': mealTitle = 'Cena'; break;
    }
    
    const assignModalContent = document.getElementById('assignModalContent');
    
    if (recipeId) {
      // Si ya hay una receta asignada, mostrar sus detalles
      db.collection('recipes').doc(recipeId).get()
        .then((doc) => {
          if (doc.exists) {
            const recipe = doc.data();
            
            assignModalContent.innerHTML = `
              <h3>Editar Menú</h3>
              <p>Día: <strong>${dayStr}</strong> - ${mealTitle}</p>
              <div class="recipe-selection">
                <h4>Receta actual:</h4>
                <div class="selected-recipe">
                  <div class="recipe-icon">${getRecipeIcon(recipe.category)}</div>
                  <div class="recipe-info">
                    <div class="recipe-name">${recipe.name}</div>
                    <div class="recipe-description">${recipe.description || ''}</div>
                  </div>
                </div>
              </div>
              <p class="mt-20">Puedes <strong>cambiar la receta</strong> o <strong>quitarla del menú</strong> con los botones de abajo.</p>
            `;
            
            // Mostrar botón de eliminar
            removeFromMenuBtn.style.display = 'block';
            removeFromMenuBtn.dataset.assignmentId = assignmentId;
            confirmAssignBtn.textContent = 'Cambiar Receta';
          }
        });
    } else {
      // Si no hay receta asignada, mostrar selector para añadir
      assignModalContent.innerHTML = `
        <h3>Añadir al Menú</h3>
        <p>Día: <strong>${dayStr}</strong> - ${mealTitle}</p>
        <p>Selecciona una receta de tu lista o <a href="#" id="createNewRecipeLink">crea una nueva</a>.</p>
        <div class="search-container mt-20">
          <input type="text" id="modalRecipeSearch" placeholder="Buscar recetas...">
        </div>
        <div class="recipes-quick-list" id="modalRecipesList" style="max-height: 300px; overflow-y: auto; margin-top: 15px;">
          <div class="loader"></div>
        </div>
      `;
      
      // Ocultar botón de eliminar
      removeFromMenuBtn.style.display = 'none';
      confirmAssignBtn.textContent = 'Añadir al Menú';
      
      // Cargar lista de recetas en el modal
      loadRecipesForModal();
      
      // Añadir evento al enlace de crear nueva receta
      document.getElementById('createNewRecipeLink').addEventListener('click', (e) => {
        e.preventDefault();
        closeModal(assignRecipeModal);
        openNewRecipeModal();
      });
      
      // Añadir evento de búsqueda en el modal
      document.getElementById('modalRecipeSearch').addEventListener('input', (e) => {
        const searchTerm = e.target.value.trim().toLowerCase();
        filterModalRecipes(searchTerm);
      });
    }
    
    openModal(assignRecipeModal);
  }
  
  // Cargar recetas en el modal de asignación
  function loadRecipesForModal() {
    const modalRecipesList = document.getElementById('modalRecipesList');
    const homeId = getCurrentHome();
    
    if (!homeId) {
      modalRecipesList.innerHTML = '<p class="empty-message">No hay un hogar seleccionado</p>';
      return;
    }
    
    db.collection('recipes')
      .where('homeId', '==', homeId)
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          modalRecipesList.innerHTML = '<p class="empty-message">No tienes recetas guardadas. Crea tu primera receta.</p>';
          return;
        }
        
        const recipes = [];
        snapshot.forEach((doc) => {
          recipes.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Guardar en variable global para filtrado
        window.modalRecipesList = recipes;
        
        renderModalRecipes(recipes);
      })
      .catch((error) => {
        console.error("Error al cargar recetas:", error);
        modalRecipesList.innerHTML = '<p class="error-message">Error al cargar recetas</p>';
      });
  }
  
  // Renderizar recetas en el modal
  function renderModalRecipes(recipes) {
    const modalRecipesList = document.getElementById('modalRecipesList');
    
    if (recipes.length === 0) {
      modalRecipesList.innerHTML = '<p class="empty-message">No se encontraron recetas que coincidan con tu búsqueda.</p>';
      return;
    }
    
    let recipesHTML = '';
    
    recipes.forEach(recipe => {
      recipesHTML += `
        <div class="recipe-item" data-id="${recipe.id}" onclick="selectModalRecipe(this)">
          <h4>${recipe.name}</h4>
          <div class="recipe-meta">
            ${getRecipeIcon(recipe.category)} ${recipe.prepTime} min
          </div>
        </div>
      `;
    });
    
    modalRecipesList.innerHTML = recipesHTML;
    
    // Función global para seleccionar receta
    window.selectModalRecipe = function(element) {
      // Desmarcar selecciones previas
      document.querySelectorAll('#modalRecipesList .recipe-item').forEach(item => {
        item.classList.remove('selected');
        item.style.borderLeftColor = 'transparent';
      });
      
      // Marcar la seleccionada
      element.classList.add('selected');
      element.style.borderLeftColor = '#FFAEA3';
      
      // Guardar ID de la receta seleccionada
      selectedRecipeId = element.dataset.id;
    };
  }
  
  // Filtrar recetas en el modal
  function filterModalRecipes(searchTerm) {
    if (!window.modalRecipesList) return;
    
    const filtered = window.modalRecipesList.filter(recipe => 
      recipe.name.toLowerCase().includes(searchTerm) || 
      (recipe.description && recipe.description.toLowerCase().includes(searchTerm))
    );
    
    renderModalRecipes(filtered);
  }
  
  // Asignar receta al menú
  function assignRecipeToMenu() {
    if (!selectedDay || !selectedMealTime || !selectedRecipeId) {
      showNotification('Por favor, selecciona una receta para añadir al menú', 'error');
      return;
    }
    
    const homeId = getCurrentHome();
    if (!homeId) {
      showNotification('No hay un hogar seleccionado', 'error');
      return;
    }
    
    // Datos para guardar
    const assignmentData = {
      homeId,
      date: selectedDay,
      mealTime: selectedMealTime,
      recipeId: selectedRecipeId,
      assignedBy: firebase.auth().currentUser.uid,
      assignedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    // Si estamos editando, actualizar documento existente
    if (isEditingMenu) {
      const assignmentId = removeFromMenuBtn.dataset.assignmentId;
      
      db.collection('menuAssignments').doc(assignmentId).update(assignmentData)
        .then(() => {
          // Actualizar la celda del menú
          assignmentData.id = assignmentId;
          updateMenuCell(assignmentData);
          
          showNotification('Menú actualizado correctamente', 'success');
          closeModal(assignRecipeModal);
        })
        .catch((error) => {
          console.error("Error al actualizar asignación:", error);
          showNotification('Error al actualizar el menú', 'error');
        });
    } 
    // Si es nueva asignación, crear documento
    else {
      db.collection('menuAssignments').add(assignmentData)
        .then((docRef) => {
          // Actualizar la celda del menú
          assignmentData.id = docRef.id;
          updateMenuCell(assignmentData);
          
          showNotification('Receta añadida al menú', 'success');
          closeModal(assignRecipeModal);
        })
        .catch((error) => {
          console.error("Error al asignar receta:", error);
          showNotification('Error al añadir la receta al menú', 'error');
        });
    }
  }
  
  // Eliminar receta del menú
  function removeRecipeFromMenu() {
    const assignmentId = removeFromMenuBtn.dataset.assignmentId;
    
    if (!assignmentId) {
      showNotification('No se pudo identificar la asignación a eliminar', 'error');
      return;
    }
    
    db.collection('menuAssignments').doc(assignmentId).delete()
      .then(() => {
        // Recargar celda del menú para mostrarla vacía
        const cell = document.querySelector(`.menu-cell[data-day="${selectedDay}"][data-meal="${selectedMealTime}"]`);
        if (cell) {
          cell.innerHTML = `<div class="menu-cell-empty">+</div>`;
          cell.onclick = function() {
            openAssignModalForDay(selectedDay, selectedMealTime);
          };
        }
        
        showNotification('Receta eliminada del menú', 'success');
        closeModal(assignRecipeModal);
      })
      .catch((error) => {
        console.error("Error al eliminar asignación:", error);
        showNotification('Error al eliminar la receta del menú', 'error');
      });
  }
  
  // Funciones para gestión de recetas
  
  // Cargar recetas según filtro
  function loadRecipes(category) {
    recipesList.innerHTML = '<div class="loader"></div>';
    
    const homeId = getCurrentHome();
    if (!homeId) {
      recipesList.innerHTML = '<p class="empty-message">No hay un hogar seleccionado</p>';
      return;
    }
    
    // Preparar query base
    let query = db.collection('recipes').where('homeId', '==', homeId);
    
    // Aplicar filtro si no es 'all'
    if (category !== 'all') {
      query = query.where('category', '==', category);
    }
    
    // Ejecutar query
    query.get()
      .then((snapshot) => {
        if (snapshot.empty) {
          recipesList.innerHTML = '<p class="empty-message">No hay recetas guardadas. ¡Añade tu primera receta!</p>';
          return;
        }
        
        // Recopilar recetas
        currentRecipes = [];
        snapshot.forEach((doc) => {
          currentRecipes.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Aplicar filtro de búsqueda si existe
        if (currentSearchTerm) {
          currentRecipes = currentRecipes.filter(recipe => 
            recipe.name.toLowerCase().includes(currentSearchTerm) || 
            (recipe.description && recipe.description.toLowerCase().includes(currentSearchTerm))
          );
        }
        
        // Ordenar recetas: primero las más usadas/recientes
        currentRecipes.sort((a, b) => (b.usageCount || 0) - (a.usageCount || 0));
        
        // Reiniciar página si el filtro cambió
        if (currentPage > Math.ceil(currentRecipes.length / recipesPerPage)) {
          currentPage = 1;
        }
        
        // Renderizar recetas
        renderRecipes();
      })
      .catch((error) => {
        console.error("Error al cargar recetas:", error);
        recipesList.innerHTML = '<p class="error-message">Error al cargar las recetas</p>';
      });
  }
  
  // Renderizar lista de recetas con paginación
  function renderRecipes() {
    if (currentRecipes.length === 0) {
      if (currentSearchTerm) {
        recipesList.innerHTML = '<p class="empty-message">No hay recetas que coincidan con tu búsqueda.</p>';
      } else {
        recipesList.innerHTML = '<p class="empty-message">No hay recetas en esta categoría.</p>';
      }
      updatePaginationInfo();
      return;
    }
    
    // Calcular recetas para la página actual
    const startIndex = (currentPage - 1) * recipesPerPage;
    const endIndex = startIndex + recipesPerPage;
    const recipesForPage = currentRecipes.slice(startIndex, endIndex);
    
    let recipesHTML = '';
    
    recipesForPage.forEach(recipe => {
      // Formatear etiquetas
      let tagsHTML = '';
      if (recipe.tags && recipe.tags.length > 0) {
        tagsHTML = '<div class="recipe-tags">';
        recipe.tags.forEach(tag => {
          tagsHTML += `<span class="recipe-tag">${getTagLabel(tag)}</span>`;
        });
        tagsHTML += '</div>';
      }
      
      recipesHTML += `
        <div class="recipe-item" data-id="${recipe.id}">
          <h4>${recipe.name}</h4>
          <div class="recipe-meta">
            ${getRecipeIcon(recipe.category)} ${recipe.prepTime} min 
          </div>
          ${tagsHTML}
        </div>
      `;
    });
    
    recipesList.innerHTML = recipesHTML;
    
    // Añadir event listeners a las recetas
    document.querySelectorAll('.recipe-item').forEach(item => {
      item.addEventListener('click', () => {
        const recipeId = item.dataset.id;
        openViewRecipeModal(recipeId);
      });
    });
    
    // Actualizar información de paginación
    updatePaginationInfo();
  }
  
  // Actualizar información de paginación
  function updatePaginationInfo() {
    const totalPages = Math.ceil(currentRecipes.length / recipesPerPage);
    
    paginationInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    
    // Habilitar/deshabilitar botones de navegación
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
    
    // Añadir estilos para botones deshabilitados
    if (prevPageBtn.disabled) {
      prevPageBtn.style.opacity = '0.5';
      prevPageBtn.style.cursor = 'not-allowed';
    } else {
      prevPageBtn.style.opacity = '1';
      prevPageBtn.style.cursor = 'pointer';
    }
    
    if (nextPageBtn.disabled) {
      nextPageBtn.style.opacity = '0.5';
      nextPageBtn.style.cursor = 'not-allowed';
    } else {
      nextPageBtn.style.opacity = '1';
      nextPageBtn.style.cursor = 'pointer';
    }
  }
  
  // Abrir modal de nueva receta
  function openNewRecipeModal() {
    // Limpiar formulario
    document.getElementById('recipeForm').reset();
    document.getElementById('recipeId').value = '';
    document.getElementById('recipeModalTitle').textContent = 'Nueva Receta';
    
    // Limpiar lista de ingredientes, dejando solo uno
    const ingredientsList = document.getElementById('ingredientsList');
    ingredientsList.innerHTML = `
      <div class="ingredient-row">
        <input type="text" class="ingredient-name" placeholder="Ingrediente">
        <input type="text" class="ingredient-amount" placeholder="Cantidad">
        <button type="button" class="remove-ingredient-btn">🗑️</button>
      </div>
    `;
    
    // Resetear tags
    document.querySelectorAll('#recipeTags .tag-option').forEach(tag => {
      tag.classList.remove('selected');
    });
    
    // Ocultar botón de eliminar
    document.getElementById('deleteRecipeBtn').style.display = 'none';
    
    // Mostrar modal
    openModal(recipeModal);
    
    // Añadir eventos a los botones de eliminar ingrediente
    setupIngredientRemoveButtons();
  }
  
  // Abrir modal para editar receta existente
  function openEditRecipeModal(recipeId) {
    db.collection('recipes').doc(recipeId).get()
      .then((doc) => {
        if (!doc.exists) {
          showNotification('Receta no encontrada', 'error');
          return;
        }
        
        const recipe = doc.data();
        
        // Establecer ID y título
        document.getElementById('recipeId').value = recipeId;
        document.getElementById('recipeModalTitle').textContent = 'Editar Receta';
        
        // Llenar el formulario con los datos de la receta
        document.getElementById('recipeName').value = recipe.name;
        document.getElementById('recipeCategory').value = recipe.category;
        document.getElementById('recipePrepTime').value = recipe.prepTime;
        document.getElementById('recipeDescription').value = recipe.description || '';
        document.getElementById('recipeInstructions').value = recipe.instructions || '';
        
        // Llenar ingredientes
        const ingredientsList = document.getElementById('ingredientsList');
        ingredientsList.innerHTML = '';
        
        if (recipe.ingredients && recipe.ingredients.length > 0) {
          recipe.ingredients.forEach(ingredient => {
            const row = document.createElement('div');
            row.className = 'ingredient-row';
            row.innerHTML = `
              <input type="text" class="ingredient-name" placeholder="Ingrediente" value="${ingredient.name}">
              <input type="text" class="ingredient-amount" placeholder="Cantidad" value="${ingredient.amount}">
              <button type="button" class="remove-ingredient-btn">🗑️</button>
            `;
            ingredientsList.appendChild(row);
          });
        } else {
          // Si no hay ingredientes, crear una fila vacía
          ingredientsList.innerHTML = `
            <div class="ingredient-row">
              <input type="text" class="ingredient-name" placeholder="Ingrediente">
              <input type="text" class="ingredient-amount" placeholder="Cantidad">
              <button type="button" class="remove-ingredient-btn">🗑️</button>
            </div>
          `;
        }
        
        // Marcar tags seleccionados
        document.querySelectorAll('#recipeTags .tag-option').forEach(tag => {
          if (recipe.tags && recipe.tags.includes(tag.dataset.tag)) {
            tag.classList.add('selected');
          } else {
            tag.classList.remove('selected');
          }
        });
        
        // Mostrar botón de eliminar
        document.getElementById('deleteRecipeBtn').style.display = 'block';
        
        // Abrir modal
        openModal(recipeModal);
        
        // Configurar eventos de los botones de eliminar ingrediente
        setupIngredientRemoveButtons();
      })
      .catch((error) => {
        console.error("Error al cargar receta:", error);
        showNotification('Error al cargar la receta', 'error');
      });
  }
  
  // Abrir modal para ver detalles de receta
  function openViewRecipeModal(recipeId) {
    db.collection('recipes').doc(recipeId).get()
      .then((doc) => {
        if (!doc.exists) {
          showNotification('Receta no encontrada', 'error');
          return;
        }
        
        const recipe = doc.data();
        
        // Guardar ID de la receta seleccionada
        selectedRecipeId = recipeId;
        
        // Actualizar título
        document.getElementById('viewRecipeTitle').textContent = recipe.name;
        
        // Formato para los ingredientes
        let ingredientsHTML = '<ul class="recipe-ingredients">';
        if (recipe.ingredients && recipe.ingredients.length > 0) {
          recipe.ingredients.forEach(ingredient => {
            ingredientsHTML += `<li><strong>${ingredient.amount}</strong> ${ingredient.name}</li>`;
          });
        } else {
          ingredientsHTML += '<li>No hay ingredientes especificados</li>';
        }
        ingredientsHTML += '</ul>';
        
        // Formato para los tags
        let tagsHTML = '';
        if (recipe.tags && recipe.tags.length > 0) {
          tagsHTML = '<div class="recipe-tags" style="margin-top: 10px;">';
          recipe.tags.forEach(tag => {
            tagsHTML += `<span class="recipe-tag">${getTagLabel(tag)}</span>`;
          });
          tagsHTML += '</div>';
        }
        
        // Construir HTML de detalles
        document.getElementById('recipeDetails').innerHTML = `
          <div class="recipe-meta-info">
            <div class="recipe-meta-item">
              <span class="meta-icon">${getRecipeIcon(recipe.category)}</span>
              ${getCategoryName(recipe.category)}
            </div>
            <div class="recipe-meta-item">
              <span class="meta-icon">⏱️</span>
              ${recipe.prepTime} minutos
            </div>
          </div>
          
          ${recipe.description ? `
            <div class="recipe-detail-section">
              <p>${recipe.description}</p>
            </div>
          ` : ''}
          
          <div class="recipe-detail-section">
            <h3>Ingredientes</h3>
            ${ingredientsHTML}
          </div>
          
          ${recipe.instructions ? `
            <div class="recipe-detail-section">
              <h3>Instrucciones</h3>
              <div class="recipe-instructions">${recipe.instructions}</div>
            </div>
          ` : ''}
          
          ${tagsHTML}
        `;
        
        // Mostrar modal
        openModal(viewRecipeModal);
      })
      .catch((error) => {
        console.error("Error al cargar receta:", error);
        showNotification('Error al cargar la receta', 'error');
      });
  }
  
  // Guardar una receta (nueva o edición)
  function saveRecipe() {
    const recipeName = document.getElementById('recipeName').value.trim();
    const recipeCategory = document.getElementById('recipeCategory').value;
    const recipePrepTime = parseInt(document.getElementById('recipePrepTime').value);
    const recipeDescription = document.getElementById('recipeDescription').value.trim();
    const recipeInstructions = document.getElementById('recipeInstructions').value.trim();
    
    if (!recipeName) {
      showNotification('El nombre de la receta es obligatorio', 'error');
      return;
    }
    
    const homeId = getCurrentHome();
    if (!homeId) {
      showNotification('No hay un hogar seleccionado', 'error');
      return;
    }
    
    // Recopilar ingredientes
    const ingredients = [];
    document.querySelectorAll('.ingredient-row').forEach(row => {
      const nameInput = row.querySelector('.ingredient-name');
      const amountInput = row.querySelector('.ingredient-amount');
      
      if (nameInput && nameInput.value.trim()) {
        ingredients.push({
          name: nameInput.value.trim(),
          amount: amountInput ? amountInput.value.trim() : ''
        });
      }
    });
    
    // Recopilar tags seleccionados
    const tags = [];
    document.querySelectorAll('#recipeTags .tag-option.selected').forEach(tag => {
      tags.push(tag.dataset.tag);
    });
    
    // Preparar datos de la receta
    const recipeData = {
      name: recipeName,
      category: recipeCategory,
      prepTime: recipePrepTime,
      description: recipeDescription,
      instructions: recipeInstructions,
      ingredients: ingredients,
      tags: tags,
      homeId: homeId,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const recipeId = document.getElementById('recipeId').value;
    
    // Si hay ID, actualizar, si no, crear nuevo
    if (recipeId) {
      db.collection('recipes').doc(recipeId).update(recipeData)
        .then(() => {
          showNotification('Receta actualizada correctamente', 'success');
          closeModal(recipeModal);
          loadRecipes(currentFilter);
        })
        .catch((error) => {
          console.error("Error al actualizar receta:", error);
          showNotification('Error al actualizar la receta', 'error');
        });
    } else {
      // Para nueva receta, añadir campos adicionales
      recipeData.createdBy = firebase.auth().currentUser.uid;
      recipeData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
      recipeData.usageCount = 0;
      
      db.collection('recipes').add(recipeData)
        .then(() => {
          showNotification('Receta creada correctamente', 'success');
          closeModal(recipeModal);
          loadRecipes(currentFilter);
        })
        .catch((error) => {
          console.error("Error al crear receta:", error);
          showNotification('Error al crear la receta', 'error');
        });
    }
  }
  
  // Eliminar una receta
  function deleteRecipe() {
    const recipeId = document.getElementById('recipeId').value;
    
    if (!recipeId) {
      showNotification('No se puede identificar la receta a eliminar', 'error');
      return;
    }
    
    if (confirm('¿Estás seguro de que quieres eliminar esta receta? También se eliminará de cualquier menú donde esté asignada.')) {
      // Primero, buscar y eliminar todas las asignaciones de menú con esta receta
      const homeId = getCurrentHome();
      
      db.collection('menuAssignments')
        .where('homeId', '==', homeId)
        .where('recipeId', '==', recipeId)
        .get()
        .then((snapshot) => {
          // Crear batch para eliminar todas las asignaciones
          const batch = db.batch();
          
          snapshot.forEach((doc) => {
            batch.delete(doc.ref);
          });
          
          return batch.commit();
        })
        .then(() => {
          // Ahora eliminar la receta
          return db.collection('recipes').doc(recipeId).delete();
        })
        .then(() => {
          showNotification('Receta eliminada correctamente', 'success');
          closeModal(recipeModal);
          loadRecipes(currentFilter);
          loadMenuGrid(); // Recargar el menú para reflejar los cambios
        })
        .catch((error) => {
          console.error("Error al eliminar receta:", error);
          showNotification('Error al eliminar la receta', 'error');
        });
    }
  }
  
  // Añadir campo de ingrediente
  function addIngredientField() {
    const ingredientsList = document.getElementById('ingredientsList');
    const newRow = document.createElement('div');
    newRow.className = 'ingredient-row';
    newRow.innerHTML = `
      <input type="text" class="ingredient-name" placeholder="Ingrediente">
      <input type="text" class="ingredient-amount" placeholder="Cantidad">
      <button type="button" class="remove-ingredient-btn">🗑️</button>
    `;
    
    ingredientsList.appendChild(newRow);
    
    // Configurar el botón de eliminar
    const removeBtn = newRow.querySelector('.remove-ingredient-btn');
    removeBtn.addEventListener('click', function() {
      newRow.remove();
    });
  }
  
  // Configurar botones para eliminar ingredientes
  function setupIngredientRemoveButtons() {
    document.querySelectorAll('.remove-ingredient-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        // No eliminar si es el único ingrediente
        if (document.querySelectorAll('.ingredient-row').length > 1) {
          btn.closest('.ingredient-row').remove();
        }
      });
    });
    
    // Añadir seleccionador de tags
    document.querySelectorAll('#recipeTags .tag-option').forEach(tag => {
      tag.addEventListener('click', function() {
        this.classList.toggle('selected');
      });
    });
  }
  
  // Generar lista de compra
  
  // Abrir modal para generar lista de compra
  function openGenerateShoppingModal() {
    const homeId = getCurrentHome();
    if (!homeId) {
      showNotification('No hay un hogar seleccionado', 'error');
      return;
    }
    
    // Fechas de inicio y fin de la semana
    const startDateStr = formatDateForDb(currentWeekStart);
    const endDate = new Date(currentWeekStart);
    endDate.setDate(endDate.getDate() + 7);
    const endDateStr = formatDateForDb(endDate);
    
    // Buscar todas las asignaciones para esta semana
    db.collection('menuAssignments')
      .where('homeId', '==', homeId)
      .where('date', '>=', startDateStr)
      .where('date', '<', endDateStr)
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          showNotification('No hay recetas en el menú para esta semana', 'error');
          return;
        }
        
        // Recopilar IDs de recetas
        const recipeIds = [];
        snapshot.forEach((doc) => {
          const assignment = doc.data();
          if (!recipeIds.includes(assignment.recipeId)) {
            recipeIds.push(assignment.recipeId);
          }
        });
        
        // Buscar detalles de las recetas
        return Promise.all(recipeIds.map(id => 
          db.collection('recipes').doc(id).get()
        ));
      })
      .then((recipeSnapshots) => {
        // Compilar todos los ingredientes
        const allIngredients = {};
        
        recipeSnapshots.forEach((recipeDoc) => {
          if (recipeDoc.exists) {
            const recipe = recipeDoc.data();
            
            if (recipe.ingredients && recipe.ingredients.length > 0) {
              recipe.ingredients.forEach(ingredient => {
                const ingredientName = ingredient.name.toLowerCase();
                
                if (allIngredients[ingredientName]) {
                  // Si ya existe el ingrediente, añadir información
                  allIngredients[ingredientName].recipes.push(recipe.name);
                  allIngredients[ingredientName].amounts.push(ingredient.amount);
                } else {
                  // Si es nuevo, inicializar
                  allIngredients[ingredientName] = {
                    name: ingredient.name,
                    recipes: [recipe.name],
                    amounts: [ingredient.amount]
                  };
                }
              });
            }
          }
        });
        
        // Renderizar la previsualización
        renderIngredientsPreview(allIngredients);
        
        // Abrir modal
        openModal(generateShoppingModal);
      })
      .catch((error) => {
        console.error("Error al generar lista de compra:", error);
        showNotification('Error al generar la lista de compra', 'error');
      });
  }
  
  // Renderizar previsualización de ingredientes
  function renderIngredientsPreview(ingredients) {
    const container = document.getElementById('ingredientsPreview');
    
    if (Object.keys(ingredients).length === 0) {
      container.innerHTML = '<p class="empty-message">No se encontraron ingredientes en las recetas del menú.</p>';
      return;
    }
    
    let html = '<div class="ingredients-list">';
    
    // Convertir objeto a array para ordenarlo alfabéticamente
    const sortedIngredients = Object.values(ingredients).sort((a, b) => 
      a.name.localeCompare(b.name)
    );
    
    sortedIngredients.forEach(ingredient => {
      const amounts = ingredient.amounts.join(', ');
      const recipes = ingredient.recipes.join(', ');
      
      html += `
        <div class="ingredient-item">
          <input type="checkbox" class="ingredient-checkbox" checked id="ing_${ingredient.name.replace(/\s+/g, '_')}">
          <div class="ingredient-details">
            <div class="ingredient-name-display">${ingredient.name}</div>
            <div class="ingredient-amount-display">${amounts}</div>
            <div class="ingredient-recipes-display" style="font-size: 11px; color: #999;">Para: ${recipes}</div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
  }
  
  // Añadir ingredientes a la lista de compra
  function addIngredientsToShoppingList() {
    const container = document.getElementById('ingredientsPreview');
    const homeId = getCurrentHome();
    
    if (!homeId) {
      showNotification('No hay un hogar seleccionado', 'error');
      return;
    }
    
    // Recopilar ingredientes seleccionados
    const selectedIngredients = [];
    container.querySelectorAll('.ingredient-checkbox:checked').forEach(checkbox => {
      const item = checkbox.closest('.ingredient-item');
      const name = item.querySelector('.ingredient-name-display').textContent;
      const amount = item.querySelector('.ingredient-amount-display').textContent;
      
      selectedIngredients.push({
        name: name,
        amount: amount
      });
    });
    
    if (selectedIngredients.length === 0) {
      showNotification('No has seleccionado ningún ingrediente', 'error');
      return;
    }
    
    // Crear batch para añadir múltiples elementos
    const batch = db.batch();
    
    // Añadir cada ingrediente como item de compra
    selectedIngredients.forEach(ingredient => {
      const itemData = {
        name: ingredient.name,
        description: `${ingredient.amount} (Menú semanal)`,
        supermarketId: 'other',
        supermarketName: 'Otro',
        purchased: false,
        addedBy: firebase.auth().currentUser.uid,
        addedAt: firebase.firestore.FieldValue.serverTimestamp(),
        homeId: homeId
      };
      
      const newItemRef = db.collection('shoppingItems').doc();
      batch.set(newItemRef, itemData);
    });
    
    // Ejecutar el batch
    batch.commit()
      .then(() => {
        showNotification(`${selectedIngredients.length} ingredientes añadidos a la lista de compra`, 'success');
        closeModal(generateShoppingModal);
      })
      .catch((error) => {
        console.error("Error al añadir ingredientes a la lista:", error);
        showNotification('Error al añadir a la lista de compra', 'error');
      });
  }
  
  // Función auxiliar para abrir modal desde la vista de receta detallada
  function openAssignModal(recipeId) {
    selectedRecipeId = recipeId;
    
    // Crear contenido para seleccionar día y comida
    const assignModalContent = document.getElementById('assignModalContent');
    
    assignModalContent.innerHTML = `
      <h3>Añadir al Menú Semanal</h3>
      <p>Selecciona el día y la comida para esta receta.</p>
      
      <div class="form-group">
        <label for="assignDay">Día de la semana</label>
        <select id="assignDay" class="kawaii-select">
          <option value="">Seleccionar día...</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="assignMeal">Comida</label>
        <select id="assignMeal" class="kawaii-select">
          <option value="breakfast">Desayuno</option>
          <option value="lunch">Comida</option>
          <option value="dinner">Cena</option>
        </select>
      </div>
    `;
    
    // Llenar el selector de días con los días de la semana actual
    const daySelect = document.getElementById('assignDay');
    const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(date.getDate() + i);
      const dateStr = formatDateForDb(date);
      const dayName = dayNames[i];
      const dayNumber = date.getDate();
      
      const option = document.createElement('option');
      option.value = dateStr;
      option.textContent = `${dayName} ${dayNumber}`;
      daySelect.appendChild(option);
    }
    
    // Actualizar comportamiento del botón de confirmar
    confirmAssignBtn.onclick = function() {
      const selectedDayValue = document.getElementById('assignDay').value;
      const selectedMealValue = document.getElementById('assignMeal').value;
      
      if (!selectedDayValue || !selectedMealValue) {
        showNotification('Por favor, selecciona día y comida', 'error');
        return;
      }
      
      selectedDay = selectedDayValue;
      selectedMealTime = selectedMealValue;
      isEditingMenu = false;
      
      assignRecipeToMenu();
    };
    
    removeFromMenuBtn.style.display = 'none';
    confirmAssignBtn.textContent = 'Añadir al Menú';
    
    openModal(assignRecipeModal);
  }
  
  // Funciones auxiliares
  
  // Obtener el inicio de la semana (lunes) para una fecha dada
  function getStartOfWeek(date) {
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day + (day == 0 ? -6 : 1); // Ajustar para que el lunes sea el inicio
    result.setDate(diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }
  
  // Formatear fecha para almacenar en DB
  function formatDateForDb(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  // Parsear fecha desde formato DB
  function parseDbDate(dateStr) {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  
  // Obtener ícono según categoría de receta
  function getRecipeIcon(category) {
    const icons = {
      'main': '🍲',
      'side': '🥗',
      'dessert': '🍰',
      'breakfast': '☕',
      'snack': '🥨'
    };
    
    return icons[category] || '🍽️';
  }
  
  // Obtener nombre de categoría
  function getCategoryName(category) {
    const names = {
      'main': 'Plato Principal',
      'side': 'Guarnición',
      'dessert': 'Postre',
      'breakfast': 'Desayuno',
      'snack': 'Aperitivo'
    };
    
    return names[category] || 'Otro';
  }
  
  // Obtener etiqueta para un tag
  function getTagLabel(tag) {
    const labels = {
      'vegetarian': 'Vegetariano',
      'vegan': 'Vegano',
      'gluten-free': 'Sin Gluten',
      'quick': 'Rápido',
      'easy': 'Fácil',
      'healthy': 'Saludable'
    };
    
    return labels[tag] || tag;
  }
  
  // Funciones para manejar modales
  function openModal(modal) {
    modal.style.display = 'flex';
  }
  
  function closeModal(modal) {
    modal.style.display = 'none';
    
    // Limpiar estados si es necesario
    if (modal === assignRecipeModal) {
      selectedRecipeId = null;
      selectedDay = null;
      selectedMealTime = null;
      isEditingMenu = false;
    }
    
    if (modal === viewRecipeModal) {
      selectedRecipeId = null;
    }
  }
});