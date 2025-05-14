// Funciones para la gestión de tareas

document.addEventListener('DOMContentLoaded', function() {
  // Referencias a elementos del DOM
  const tasksList = document.getElementById('tasksList');
  const addTaskBtn = document.getElementById('addTaskBtn');
  const taskModal = document.getElementById('taskModal');
  const closeTaskModalBtn = document.getElementById('closeTaskModal');
  const cancelTaskBtn = document.getElementById('cancelTaskBtn');
  const taskForm = document.getElementById('taskForm');
  const statusFilters = document.querySelectorAll('.tasks-filters .kawaii-filter');
  
  // Estado para el filtro actual - cambiamos el valor por defecto a 'pending'
  let currentFilter = 'pending';
  
  // Verificar autenticación
  checkAuth().then(user => {
    // Cargar miembros del hogar para el selector de asignación
    loadFamilyMembers();
    
    // Cargar tareas iniciales (pendientes por defecto)
    loadTasks('pending');
    
    // Activar el filtro de "Pendientes" por defecto
    statusFilters.forEach(filter => {
      if (filter.dataset.status === 'pending') {
        filter.classList.add('active');
      } else if (filter.dataset.status === 'all') {
        filter.classList.remove('active');
      }
    });
    
    // Setup de eventos
    setupEventListeners();
  }).catch(error => {
    console.error("Error de autenticación:", error);
  });
  
  function setupEventListeners() {
    // Botón para abrir modal
    addTaskBtn.addEventListener('click', () => {
      openTaskModal();
    });
    
    // Botones para cerrar modal
    closeTaskModalBtn.addEventListener('click', () => {
      closeModal(taskModal);
    });
    
    cancelTaskBtn.addEventListener('click', () => {
      closeModal(taskModal);
    });
    
    // Escuchar clic fuera del modal para cerrar
    taskModal.addEventListener('click', (e) => {
      if (e.target === taskModal) {
        closeModal(taskModal);
      }
    });
    
    // Filtros de estado
    statusFilters.forEach(filter => {
      filter.addEventListener('click', () => {
        // Actualizar UI
        statusFilters.forEach(f => f.classList.remove('active'));
        filter.classList.add('active');
        
        // Actualizar filtro y cargar tareas
        currentFilter = filter.dataset.status;
        loadTasks(currentFilter);
      });
    });
    
    // Envío del formulario
    taskForm.addEventListener('submit', (e) => {
      e.preventDefault();
      addNewTask();
    });
  }
  
  // Funciones para gestionar tareas
  
  // Cargar tareas según filtro
  function loadTasks(statusFilter) {
    // Mostrar loader
    tasksList.innerHTML = '<div class="loader"></div>';
    
    const homeId = getCurrentHome();
    if (!homeId) {
      tasksList.innerHTML = '<p class="empty-message">No hay un hogar seleccionado</p>';
      showNotification('No hay un hogar seleccionado. Por favor, crea o únete a un hogar primero.', 'error');
      return;
    }
    
    console.log("Cargando tareas con homeId:", homeId);
    
    // Preparar query base
    let query = db.collection('tasks').where('homeId', '==', homeId);
    
    // Siempre filtrar por estado, ya no permitimos "todas"
    query = query.where('status', '==', statusFilter);
    
    // Ejecutar query
    query.orderBy('createdAt', 'desc')
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
          // Mensaje personalizado según el filtro
          let message = statusFilter === 'pending' 
            ? 'No hay tareas pendientes. ¡Todo en orden!' 
            : 'No hay tareas completadas.';
          
          tasksList.innerHTML = `<p class="empty-message">${message}</p>`;
          return;
        }
        
        let tasksHTML = '';
        
        snapshot.forEach((doc) => {
          const task = doc.data();
          const taskId = doc.id;
          
          // Formatear fecha
          let dueDateStr = 'Sin fecha límite';
          if (task.dueDate) {
            const dueDate = task.dueDate instanceof Date ? task.dueDate : new Date(task.dueDate.seconds * 1000);
            dueDateStr = dueDate.toLocaleDateString();
          }
          
          // Crear elemento de tarea
          tasksHTML += `
            <div class="task-item ${task.status === 'completed' ? 'completed' : ''}" data-id="${taskId}">
              <div class="task-checkbox">
                <input type="checkbox" ${task.status === 'completed' ? 'checked' : ''}>
                <span class="checkmark"></span>
              </div>
              <div class="task-content">
                <div class="task-title">${task.title}</div>
                <div class="task-description">${task.description || ''}</div>
                <div class="task-meta">
                  <span class="task-due-date">Fecha: ${dueDateStr}</span>
                  ${task.assignedTo ? `<span class="task-assignee">Asignada a: ${task.assigneeName || 'Alguien'}</span>` : ''}
                </div>
              </div>
              <div class="task-actions">
                <button class="task-edit-btn">✏️</button>
                <button class="task-delete-btn">🗑️</button>
              </div>
            </div>
          `;
        });
        
        tasksList.innerHTML = tasksHTML;
        
        // Añadir event listeners a los elementos de tareas
        setupTaskItemListeners();
      })
      .catch((error) => {
        console.error("Error al cargar tareas:", error);
        tasksList.innerHTML = '<p class="error-message">Error al cargar las tareas. Por favor, intenta crear un índice en Firestore.</p>';
        showNotification('Error al cargar tareas. Es posible que necesites crear un índice en Firebase.', 'error');
      });
  }
  
  // Añadir event listeners a los elementos de tareas
  function setupTaskItemListeners() {
    // Checkboxes para marcar como completado
    document.querySelectorAll('.task-checkbox input').forEach(checkbox => {
      checkbox.addEventListener('change', (e) => {
        const taskItem = e.target.closest('.task-item');
        const taskId = taskItem.dataset.id;
        const isCompleted = e.target.checked;
        
        updateTaskStatus(taskId, isCompleted ? 'completed' : 'pending');
      });
    });
    
    // Botones de edición
    document.querySelectorAll('.task-edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const taskItem = e.target.closest('.task-item');
        const taskId = taskItem.dataset.id;
        
        editTask(taskId);
      });
    });
    
    // Botones de eliminación
    document.querySelectorAll('.task-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const taskItem = e.target.closest('.task-item');
        const taskId = taskItem.dataset.id;
        
        deleteTask(taskId);
      });
    });
  }
  
  // Cargar miembros del hogar para el selector
  function loadFamilyMembers() {
    const taskAssignee = document.getElementById('taskAssignee');
    const homeId = getCurrentHome();
    
    if (!homeId || !taskAssignee) {
      return;
    }
    
    // Obtener el hogar para ver los miembros
    db.collection('homes').doc(homeId).get()
      .then((doc) => {
        if (doc.exists) {
          const home = doc.data();
          const memberIds = home.members || [];
          
          // Si no hay miembros, salir
          if (memberIds.length === 0) {
            return;
          }
          
          // Promesas para obtener info de cada miembro
          const memberPromises = memberIds.map(memberId => {
            if (firebase.auth().currentUser && firebase.auth().currentUser.uid === memberId) {
              return Promise.resolve({ id: memberId, displayName: 'Yo' });
            } else {
              return db.collection('users').doc(memberId).get().then(userDoc => {
                if (userDoc.exists) {
                  return {
                    id: memberId,
                    displayName: userDoc.data().displayName || 'Usuario'
                  };
                }
                return { id: memberId, displayName: 'Usuario' };
              });
            }
          });
          
          // Resolver todas las promesas
          return Promise.all(memberPromises);
        }
        
        return [];
      })
      .then((members) => {
        // Limpiar selector actual
        taskAssignee.innerHTML = '<option value="">Seleccionar miembro...</option>';
        
        // Añadir cada miembro como opción
        members.forEach(member => {
          const option = document.createElement('option');
          option.value = member.id;
          option.textContent = member.displayName;
          taskAssignee.appendChild(option);
        });
      })
      .catch((error) => {
        console.error("Error al cargar miembros:", error);
      });
  }
  
  // Añadir nueva tarea
  function addNewTask() {
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
    
    // Obtener valores del formulario
    const title = document.getElementById('taskTitle').value.trim();
    const description = document.getElementById('taskDescription').value.trim();
    const assigneeId = document.getElementById('taskAssignee').value;
    const assigneeName = assigneeId ? document.getElementById('taskAssignee').options[document.getElementById('taskAssignee').selectedIndex].text : '';
    const dueDateInput = document.getElementById('taskDueDate').value;
    const category = document.getElementById('taskCategory').value;
    const recurrence = document.getElementById('taskRecurrence').value;
    
    // Validación básica
    if (!title) {
      showNotification('El título de la tarea es obligatorio', 'error');
      return;
    }
    
    // Preparar objeto de tarea
    const taskData = {
      title,
      description,
      status: 'pending',
      category,
      recurrence,
      homeId,
      createdBy: user.uid,
      createdByName: user.displayName || 'Usuario', // Añadir nombre de creador
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    
    // Añadir fecha si está presente
    if (dueDateInput) {
      taskData.dueDate = new Date(dueDateInput);
    }
    
    // Añadir asignación si está presente
    if (assigneeId) {
      taskData.assignedTo = assigneeId;
      taskData.assigneeName = assigneeName;
    }
    
    // Guardar en Firestore
    db.collection('tasks').add(taskData)
      .then(() => {
        showNotification('Tarea creada correctamente', 'success');
        closeModal(taskModal);
        loadTasks(currentFilter); // Recargar tareas con el filtro actual
      })
      .catch((error) => {
        console.error("Error al crear tarea:", error);
        showNotification('Error al crear la tarea', 'error');
      });
  }
  
  // Actualizar estado de una tarea
  function updateTaskStatus(taskId, status) {
    const user = firebase.auth().currentUser;
    
    // Datos para actualizar
    const updateData = {
      status: status
    };
    
    // Si está completada, agregar datos de quien la completó y cuándo
    if (status === 'completed') {
      updateData.completedAt = firebase.firestore.FieldValue.serverTimestamp();
      updateData.completedBy = user.uid;
      updateData.completedByName = user.displayName || 'Usuario';
    }
    
    db.collection('tasks').doc(taskId).update(updateData)
    .then(() => {
      // Si estamos en la vista de pendientes y la tarea se marca como completada,
      // eliminarla del DOM
      if (currentFilter === 'pending' && status === 'completed') {
        const taskItem = document.querySelector(`.task-item[data-id="${taskId}"]`);
        if (taskItem) {
          // Aplicar una animación de desvanecimiento antes de eliminar
          taskItem.style.opacity = '0';
          taskItem.style.transform = 'translateX(20px)';
          setTimeout(() => {
            taskItem.remove();
            
            // Verificar si la lista quedó vacía
            if (tasksList.children.length === 0) {
              tasksList.innerHTML = '<p class="empty-message">No hay tareas pendientes. ¡Todo en orden!</p>';
            }
          }, 300);
        }
      } 
      // Si estamos en la vista de completadas y la tarea se marca como pendiente,
      // eliminarla del DOM
      else if (currentFilter === 'completed' && status === 'pending') {
        const taskItem = document.querySelector(`.task-item[data-id="${taskId}"]`);
        if (taskItem) {
          // Aplicar una animación de desvanecimiento antes de eliminar
          taskItem.style.opacity = '0';
          taskItem.style.transform = 'translateX(20px)';
          setTimeout(() => {
            taskItem.remove();
            
            // Verificar si la lista quedó vacía
            if (tasksList.children.length === 0) {
              tasksList.innerHTML = '<p class="empty-message">No hay tareas completadas.</p>';
            }
          }, 300);
        }
      }
      // En otros casos (que no debería ocurrir con la nueva estructura), actualizar la UI
      else {
        const taskItem = document.querySelector(`.task-item[data-id="${taskId}"]`);
        if (taskItem) {
          if (status === 'completed') {
            taskItem.classList.add('completed');
          } else {
            taskItem.classList.remove('completed');
          }
        }
      }
      
      showNotification(status === 'completed' ? 'Tarea completada' : 'Tarea marcada como pendiente', 'success');
    })
    .catch((error) => {
      console.error("Error al actualizar tarea:", error);
      showNotification('Error al actualizar la tarea', 'error');
    });
  }
  
  // Editar una tarea (por ahora, solo abre el modal)
  function editTask(taskId) {
    // Por implementar
    showNotification('Edición de tareas en desarrollo', 'info');
  }
  
  // Eliminar una tarea
  function deleteTask(taskId) {
    if (confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
      db.collection('tasks').doc(taskId).delete()
        .then(() => {
          // Eliminar del DOM con animación
          const taskItem = document.querySelector(`.task-item[data-id="${taskId}"]`);
          if (taskItem) {
            // Aplicar una animación de desvanecimiento antes de eliminar
            taskItem.style.opacity = '0';
            taskItem.style.transform = 'translateX(20px)';
            setTimeout(() => {
              taskItem.remove();
              
              // Verificar si la lista quedó vacía
              if (tasksList.children.length === 0) {
                let message = currentFilter === 'pending' 
                  ? 'No hay tareas pendientes. ¡Todo en orden!' 
                  : 'No hay tareas completadas.';
                
                tasksList.innerHTML = `<p class="empty-message">${message}</p>`;
              }
            }, 300);
          }
          
          showNotification('Tarea eliminada', 'success');
        })
        .catch((error) => {
          console.error("Error al eliminar tarea:", error);
          showNotification('Error al eliminar la tarea', 'error');
        });
    }
  }
  
  // Funciones para manejar el modal
  
  function openTaskModal() {
    // Limpiar formulario
    taskForm.reset();
    
    // Asignar fecha actual por defecto
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    document.getElementById('taskDueDate').value = formattedDate;
    
    // Mostrar modal
    openModal(taskModal);
  }
  
  function openModal(modal) {
    modal.style.display = 'flex';
  }
  
  function closeModal(modal) {
    modal.style.display = 'none';
  }
});