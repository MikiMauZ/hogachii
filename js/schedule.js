// Variables de estado
let currentUser = null;
let currentScheduleId = null;
let currentScheduleData = null;
let currentWeekStart = new Date(); // Semana actual
let activitiesCache = []; // Cache de actividades
let editingActivityId = null; // ID de la actividad que está siendo editada

// === INICIALIZACIÓN ===
document.addEventListener('DOMContentLoaded', function() {
  // Verificar autenticación
  firebase.auth().onAuthStateChanged(user => {
    if (user) {
      currentUser = user;
      
      // Inicializar fecha (inicio de la semana actual - lunes)
      currentWeekStart = getStartOfWeek(new Date());
      
      // Actualizar menú de usuario
      updateUserMenu();
      
      // Cargar horarios
      loadSchedules();
      
      // Configurar event listeners
      setupEventListeners();
      
      // Ampliar las opciones de horas en el formulario de creación
      expandHourOptions();
    } else {
      window.location.href = 'login.html';
    }
  });
});

// Función para expandir las opciones de horas en el formulario
function expandHourOptions() {
  // Expandir opciones de hora de inicio
  const startHourSelect = document.getElementById('scheduleStartHour');
  if (startHourSelect) {
    startHourSelect.innerHTML = ''; // Limpiar opciones existentes
    
    // Añadir las 24 horas
    for (let i = 0; i < 24; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = `${i}:00`;
      // Seleccionar 7:00 como valor por defecto
      if (i === 7) option.selected = true;
      startHourSelect.appendChild(option);
    }
  }
  
  // Expandir opciones de hora de fin
  const endHourSelect = document.getElementById('scheduleEndHour');
  if (endHourSelect) {
    endHourSelect.innerHTML = ''; // Limpiar opciones existentes
    
    // Añadir las 24 horas
    for (let i = 1; i <= 24; i++) {
      const option = document.createElement('option');
      option.value = i;
      option.textContent = `${i}:00`;
      // Seleccionar 22:00 como valor por defecto
      if (i === 22) option.selected = true;
      endHourSelect.appendChild(option);
    }
  }
}

// === EVENT LISTENERS ===
function setupEventListeners() {
  // Botón para crear nuevo horario
  document.getElementById('createBoardBtn').addEventListener('click', () => {
    document.getElementById('createScheduleModal').style.display = 'flex';
  });
  
  // Formulario de crear horario
  document.getElementById('createScheduleForm').addEventListener('submit', (e) => {
    e.preventDefault();
    createNewSchedule();
  });
  
  // Cerrar modales
  document.getElementById('closeCreateScheduleModal').addEventListener('click', () => {
    document.getElementById('createScheduleModal').style.display = 'none';
  });
  
  document.getElementById('cancelCreateScheduleBtn').addEventListener('click', () => {
    document.getElementById('createScheduleModal').style.display = 'none';
  });
  
  document.getElementById('closeActivityModal').addEventListener('click', () => {
    document.getElementById('activityModal').style.display = 'none';
    editingActivityId = null;
  });
  
  document.getElementById('cancelActivityBtn').addEventListener('click', () => {
    document.getElementById('activityModal').style.display = 'none';
    editingActivityId = null;
  });
  
  // Formulario de actividad
  document.getElementById('activityForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveActivity();
  });
  
  // Botón eliminar actividad
  document.getElementById('deleteActivityBtn').addEventListener('click', () => {
    deleteActivity();
  });
  
  // Navegación de semanas
  document.getElementById('prevWeekBtn').addEventListener('click', () => {
    // Retroceder una semana
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    updateWeekTitle();
    renderScheduleGrid();
  });
  
  document.getElementById('nextWeekBtn').addEventListener('click', () => {
    // Avanzar una semana
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    updateWeekTitle();
    renderScheduleGrid();
  });
  
  // Selector de color
  document.querySelectorAll('.color-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.color-option').forEach(opt => opt.classList.remove('selected'));
      option.classList.add('selected');
    });
  });
  
  // Cerrar modales al hacer clic fuera
  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.style.display = 'none';
      if (e.target.id === 'activityModal') {
        editingActivityId = null;
      }
    }
  });
  
  // Enlazar los cambios de hora inicial y final para actualizar las opciones
  const startHourSelect = document.getElementById('activityStartHour');
  if (startHourSelect) {
    startHourSelect.addEventListener('change', updateEndHourOptions);
  }
  
  // Inicializar elementos UI
  setupMobileMenu();
}

// === CARGAR HORARIOS ===
function loadSchedules() {
  const boardsList = document.getElementById('boardsList');
  boardsList.innerHTML = '<div class="loader"></div>';
  
  // Obtener el homeId actual
  const homeId = getCurrentHome();
  if (!homeId) {
    boardsList.innerHTML = '<p class="empty-message">No hay un hogar seleccionado. Por favor, selecciona o crea un hogar desde tu perfil.</p>';
    return;
  }
  
  db.collection('schedules')
    .where('homeId', '==', homeId)
    .orderBy('createdAt', 'desc')
    .get()
    .then(snapshot => {
      if (snapshot.empty) {
        boardsList.innerHTML = '<p class="empty-message">No tienes horarios creados. ¡Crea tu primer horario!</p>';
        return;
      }
      
      boardsList.innerHTML = '';
      
      snapshot.forEach(doc => {
        const schedule = doc.data();
        const scheduleItem = document.createElement('div');
        scheduleItem.className = 'board-item';
        scheduleItem.dataset.id = doc.id;
        
        // Determinar ícono según tipo
        let icon = '📋';
        if (schedule.type === 'school') icon = '🏫';
        else if (schedule.type === 'work') icon = '💼';
        else if (schedule.type === 'activities') icon = '🎯';
        
        // Agregar acciones al elemento
        scheduleItem.innerHTML = `
          <div class="board-item-icon">${icon}</div>
          <div>
            <div class="board-item-title">${schedule.name}</div>
            <div class="board-item-meta">${getScheduleTypeName(schedule.type)}</div>
          </div>
          <div class="board-item-actions">
            <button class="delete-board-btn" title="Eliminar horario">🗑️</button>
          </div>
        `;
        
        // Evento para seleccionar horario
        scheduleItem.addEventListener('click', (e) => {
          // No activar si se hizo clic en el botón de eliminar
          if (!e.target.closest('.delete-board-btn')) {
            selectSchedule(doc.id, schedule);
          }
        });
        
        // Evento para eliminar horario
        const deleteBtn = scheduleItem.querySelector('.delete-board-btn');
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation(); // Evitar seleccionar el horario
          deleteSchedule(doc.id, schedule.name);
        });
        
        boardsList.appendChild(scheduleItem);
      });
      
      // Si hay horarios pero ninguno seleccionado, seleccionar el primero
      if (!currentScheduleId && snapshot.docs.length > 0) {
        const firstDoc = snapshot.docs[0];
        selectSchedule(firstDoc.id, firstDoc.data());
      }
    })
    .catch(error => {
      console.error('Error al cargar horarios:', error);
      boardsList.innerHTML = '<p class="error-message">Error al cargar horarios</p>';
    });
}

// === CREAR NUEVO HORARIO ===
function createNewSchedule() {
  const name = document.getElementById('scheduleName').value.trim();
  const type = document.getElementById('scheduleType').value;
  const startHour = parseInt(document.getElementById('scheduleStartHour').value);
  const endHour = parseInt(document.getElementById('scheduleEndHour').value);
  const timeSlot = parseInt(document.getElementById('scheduleTimeSlot').value);
  
  if (!name) {
    showNotification('El nombre del horario es obligatorio', 'error');
    return;
  }
  
  // Validar que la hora de inicio sea menor que la de fin
  if (startHour >= endHour) {
    showNotification('La hora de inicio debe ser menor que la hora de fin', 'error');
    return;
  }
  
  const homeId = getCurrentHome();
  if (!homeId) {
    showNotification('No hay un hogar seleccionado. Por favor, selecciona un hogar desde tu perfil.', 'error');
    return;
  }
  
  const scheduleData = {
    name,
    type,
    startHour,
    endHour,
    timeSlot,
    createdBy: currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    homeId: homeId
  };
  
  db.collection('schedules').add(scheduleData)
    .then(docRef => {
      showNotification('Horario creado correctamente', 'success');
      document.getElementById('createScheduleModal').style.display = 'none';
      document.getElementById('createScheduleForm').reset();
      
      // Seleccionar el nuevo horario
      selectSchedule(docRef.id, scheduleData);
      
      // Recargar la lista de horarios
      loadSchedules();
    })
    .catch(error => {
      console.error('Error al crear horario:', error);
      showNotification('Error al crear el horario', 'error');
    });
}

// === SELECCIONAR HORARIO ===
function selectSchedule(scheduleId, scheduleData) {
  currentScheduleId = scheduleId;
  currentScheduleData = scheduleData;
  
  // Si no hay horas de inicio/fin definidas, usar valores por defecto
  if (!currentScheduleData.startHour && currentScheduleData.startHour !== 0) currentScheduleData.startHour = 7;
  if (!currentScheduleData.endHour) currentScheduleData.endHour = 22;
  if (!currentScheduleData.timeSlot) currentScheduleData.timeSlot = 30;
  
  // Actualizar UI
  document.getElementById('boardTitle').textContent = scheduleData.name;
  
  // Marcar como activo en la lista
  document.querySelectorAll('.board-item').forEach(item => {
    item.classList.toggle('active', item.dataset.id === scheduleId);
  });
  
  // Mostrar navegación de semanas
  document.getElementById('weekNav').style.display = 'flex';
  
  // Ocultar mensaje vacío
  document.getElementById('emptyScheduleMessage').style.display = 'none';
  
  // Mostrar cuadrícula
  document.getElementById('scheduleGrid').style.display = 'grid';
  
  // Actualizar título de la semana
  updateWeekTitle();
  
  // Cargar actividades y renderizar cuadrícula
  loadActivities();
}

// === ELIMINAR HORARIO ===
function deleteSchedule(scheduleId, scheduleName) {
  if (confirm(`¿Estás seguro de que quieres eliminar el horario "${scheduleName}"?`)) {
    // Primero eliminar todas las actividades
    db.collection('schedules').doc(scheduleId).collection('activities').get()
      .then(snapshot => {
        const batch = db.batch();
        
        snapshot.forEach(doc => {
          batch.delete(doc.ref);
        });
        
        return batch.commit();
      })
      .then(() => {
        // Luego eliminar el horario
        return db.collection('schedules').doc(scheduleId).delete();
      })
      .then(() => {
        showNotification(`Horario "${scheduleName}" eliminado correctamente`, 'success');
        
        // Si es el horario actual, limpiar la vista
        if (currentScheduleId === scheduleId) {
          currentScheduleId = null;
          currentScheduleData = null;
          
          document.getElementById('boardTitle').textContent = 'Selecciona un horario';
          document.getElementById('weekNav').style.display = 'none';
          document.getElementById('scheduleGrid').style.display = 'none';
          document.getElementById('emptyScheduleMessage').style.display = 'block';
        }
        
        // Recargar la lista de horarios
        loadSchedules();
      })
      .catch(error => {
        console.error('Error al eliminar horario:', error);
        showNotification('Error al eliminar el horario', 'error');
      });
  }
}

// === CARGAR ACTIVIDADES ===
function loadActivities() {
  if (!currentScheduleId) return;
  
  // Mostrar loader en cuadrícula
  document.getElementById('scheduleGrid').innerHTML = '<div class="loader"></div>';
  
  // Obtener actividades de este horario
  db.collection('schedules').doc(currentScheduleId)
    .collection('activities')
    .get()
    .then(snapshot => {
      // Limpiar cache
      activitiesCache = [];
      
      snapshot.forEach(doc => {
        const activity = {
          id: doc.id,
          ...doc.data()
        };
        
        activitiesCache.push(activity);
      });
      
      // Renderizar cuadrícula con las actividades
      renderScheduleGrid();
    })
    .catch(error => {
      console.error('Error al cargar actividades:', error);
      showNotification('Error al cargar las actividades', 'error');
    });
}

// === RENDERIZAR CUADRÍCULA ===
function renderScheduleGrid() {
  const grid = document.getElementById('scheduleGrid');
  grid.innerHTML = '';
  
  // Obtener rango de horas del horario
  const startHour = currentScheduleData.startHour || 7;
  const endHour = currentScheduleData.endHour || 22;
  
  // Crear columna de horas
  const timeColumn = document.createElement('div');
  timeColumn.className = 'time-column';
  
  // Encabezado vacío para alinear con los días
  const emptyHeader = document.createElement('div');
  emptyHeader.className = 'day-header';
  emptyHeader.innerHTML = '&nbsp;';
  timeColumn.appendChild(emptyHeader);
  
  // Horas según rango definido
  for (let hour = startHour; hour <= endHour; hour++) {
    const timeSlot = document.createElement('div');
    timeSlot.className = 'time-slot';
    timeSlot.textContent = `${hour}:00`;
    timeColumn.appendChild(timeSlot);
  }
  
  grid.appendChild(timeColumn);
  
  // Crear columnas para cada día
  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const today = new Date();
  
  for (let day = 0; day < 7; day++) {
    const dayColumn = document.createElement('div');
    dayColumn.className = 'day-column';
    
    // Calcular fecha actual para este día
    const currentDate = new Date(currentWeekStart);
    currentDate.setDate(currentWeekStart.getDate() + day);
    
    // Formato de fecha para mostrar
    const dateStr = `${currentDate.getDate()}/${currentDate.getMonth() + 1}`;
    
    // Encabezado del día
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    
    // Destacar si es hoy
    if (
      today.getDate() === currentDate.getDate() &&
      today.getMonth() === currentDate.getMonth() &&
      today.getFullYear() === currentDate.getFullYear()
    ) {
      dayHeader.classList.add('today');
    }
    
    // Añadir clase para fin de semana
    if (day >= 5) {
      dayHeader.classList.add('weekend');
    }
    
    dayHeader.textContent = `${daysOfWeek[day]} ${dateStr}`;
    dayColumn.appendChild(dayHeader);
    
    // Celdas para cada hora
    for (let hour = startHour; hour <= endHour; hour++) {
      const cell = document.createElement('div');
      cell.className = 'schedule-cell';
      
      // Importante: debemos guardar correctamente el día actual, no el anterior
      cell.dataset.day = day.toString();
      cell.dataset.hour = hour.toString();
      cell.dataset.date = currentDate.toISOString().split('T')[0]; // Guardar fecha en formato YYYY-MM-DD
      
      // Añadir clase para fin de semana
      if (day >= 5) {
        cell.classList.add('weekend');
      }
      
      // Evento para abrir modal al hacer clic en celda vacía
      cell.addEventListener('click', function() {
        if (!this.classList.contains('active')) {
          openActivityModal(parseInt(this.dataset.day), parseInt(this.dataset.hour), currentDate);
        }
      });
      
      // Buscar actividades para esta celda
      const activitiesForCell = activitiesCache.filter(activity => {
        const activityDate = activity.date ? new Date(activity.date.seconds * 1000) : null;
        
        // Verificar si es una actividad recurrente o de este día específico
        if (activity.recurring) {
          // CORREGIDO: Comparar con el día correcto
          return parseInt(activity.day) === day && parseInt(activity.hour) === hour;
        } else if (activityDate) {
          return (
            activityDate.getDate() === currentDate.getDate() &&
            activityDate.getMonth() === currentDate.getMonth() &&
            activityDate.getFullYear() === currentDate.getFullYear() &&
            parseInt(activity.hour) === hour
          );
        }
        
        return false;
      });
      
      // Si hay actividades, mostrarlas
      if (activitiesForCell.length > 0) {
        cell.classList.add('active');
        
        // Usar la primera actividad para mostrar
        const activity = activitiesForCell[0];
        cell.style.backgroundColor = activity.color || '#ff6b9d';
        cell.dataset.activityId = activity.id;
        
        const activityInfo = document.createElement('div');
        activityInfo.className = 'activity-info';
        
        const activityTitle = document.createElement('div');
        activityTitle.className = 'activity-title';
        activityTitle.textContent = activity.title;
        activityInfo.appendChild(activityTitle);
        
        // Mostrar la hora de inicio con minutos si están disponibles
        if (activity.startMinute) {
          const timeText = document.createElement('div');
          timeText.className = 'activity-time';
          timeText.textContent = `${activity.hour}:${activity.startMinute}`;
          activityInfo.appendChild(timeText);
        }
        
        if (activity.location) {
          const activityLocation = document.createElement('div');
          activityLocation.className = 'activity-location';
          activityLocation.textContent = activity.location;
          activityInfo.appendChild(activityLocation);
        }
        
        cell.appendChild(activityInfo);
        
        // Evento para editar actividad
        cell.addEventListener('click', function(e) {
          e.stopPropagation();
          openActivityModal(parseInt(this.dataset.day), parseInt(this.dataset.hour), currentDate, activity);
        });
        
        // Verificar si esta actividad es parte de un rango
        if (activity.endHour && parseInt(activity.hour) < parseInt(activity.endHour)) {
          // Añadir una clase especial para mostrar que es parte de un rango
          cell.classList.add('activity-range');
          
          // Verificar si es la primera celda del rango
          if (parseInt(activity.hour) === hour) {
            cell.classList.add('activity-range-start');
          }
        }
      }
      
      dayColumn.appendChild(cell);
    }
    
    grid.appendChild(dayColumn);
  }
}

// === CARGAR MIEMBROS DEL HOGAR ===
function loadHomeMembersForSelector() {
  const activityAssignee = document.getElementById('activityAssignee');
  activityAssignee.innerHTML = '<option value="">Sin asignar</option>';
  
  const homeId = getCurrentHome();
  if (!homeId) return;
  
  // Obtener miembros del hogar actual
  db.collection('homes').doc(homeId).get()
    .then(doc => {
      if (doc.exists) {
        const home = doc.data();
        if (home.members && home.members.length > 0) {
          // Para cada miembro, obtener sus datos
          const memberPromises = home.members.map(memberId => {
            return db.collection('users').doc(memberId).get()
              .then(userDoc => {
                if (userDoc.exists) {
                  return {
                    id: memberId,
                    displayName: userDoc.data().displayName || 'Usuario'
                  };
                } else {
                  return {
                    id: memberId,
                    displayName: 'Usuario'
                  };
                }
              });
          });
          
          // Cuando tengamos todos los datos, actualizar el selector
          return Promise.all(memberPromises);
        }
      }
      return [];
    })
    .then(members => {
      // Agregar cada miembro al selector
      members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.displayName;
        activityAssignee.appendChild(option);
      });
    })
    .catch(error => {
      console.error('Error al cargar miembros del hogar:', error);
    });
}

// Actualizar las opciones del selector de hora final basado en la hora inicial
function updateEndHourOptions() {
  const startHour = parseInt(document.getElementById('activityStartHour').value);
  const endHourSelect = document.getElementById('activityEndHour');
  const endHour = endHourSelect.value ? parseInt(endHourSelect.value) : startHour + 1;
  
  // Limpiar opciones actuales
  endHourSelect.innerHTML = '';
  
  // Añadir opciones desde la hora de inicio + 1 hasta el final del día
  // Asegurarse de que haya al menos 24 horas disponibles desde la hora de inicio
  const maxHour = Math.max(currentScheduleData.endHour || 23, startHour + 23);
  
  for (let h = startHour + 1; h <= maxHour; h++) {
    const option = document.createElement('option');
    option.value = h;
    option.textContent = `${h}:00`;
    endHourSelect.appendChild(option);
    
    // Seleccionar la hora previamente seleccionada si es válida
    if (h === endHour) {
      option.selected = true;
    }
  }
  
  // Si no hay valor previo o es inválido, seleccionar la primera opción
  if (endHourSelect.selectedIndex === -1 && endHourSelect.options.length > 0) {
    endHourSelect.selectedIndex = 0;
  }
}

// Llenar el selector de horas de inicio con las horas disponibles en el horario
function populateTimeSelectors(startHour, selectedMinute = '00') {
  const startHourSelect = document.getElementById('activityStartHour');
  const startMinuteSelect = document.getElementById('activityStartMinute');
  
  if (!startHourSelect || !startMinuteSelect) return;
  
  // Limpiar y llenar el selector de horas de inicio
  startHourSelect.innerHTML = '';
  
  // Usar las horas del horario actual con más opciones para mayor flexibilidad
  const minHour = 0;  // Desde las 00:00
  const maxHour = 23; // Hasta las 23:00
  
  for (let h = minHour; h <= maxHour; h++) {
    const option = document.createElement('option');
    option.value = h;
    option.textContent = `${h}:00`;
    
    // Seleccionar la hora indicada
    if (h === startHour) {
      option.selected = true;
    }
    
    startHourSelect.appendChild(option);
  }
  
  // Seleccionar el minuto indicado
  if (startMinuteSelect) {
    Array.from(startMinuteSelect.options).forEach(option => {
      option.selected = option.value === selectedMinute;
    });
  }
  
  // Actualizar las opciones de hora final
  updateEndHourOptions();
}

// === ABRIR MODAL DE ACTIVIDAD ===
function openActivityModal(day, hour, date, activity = null) {
  // Limpiar form
  document.getElementById('activityForm').reset();
  
  console.log("Día seleccionado:", day); // Debug
  
  // Establecer día y hora en los campos ocultos
  // IMPORTANTE: No alterar el valor del día, mantenerlo exactamente como viene
  document.getElementById('activityDay').value = day;
  document.getElementById('activityHour').value = hour;
  
  // Cargar miembros del hogar para el selector
  loadHomeMembersForSelector();
  
  // Inicializar selectores de hora
  populateTimeSelectors(hour, '00');
  
  // Actualizar título del modal
  const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  const dayStr = dayNames[day];
  const dateStr = `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
  
  document.getElementById('activityModalTitle').textContent = activity
    ? 'Editar Actividad'
    : `Nueva Actividad - ${dayStr} ${dateStr} a las ${hour}:00`;
  
  // Mostrar/ocultar las opciones de eliminación
  const deleteOptions = document.getElementById('deleteOptions');
  if (deleteOptions) {
    deleteOptions.style.display = activity ? 'block' : 'none';
  }
  
  // Si estamos editando, cargar datos
  if (activity) {
    editingActivityId = activity.id;
    document.getElementById('activityTitle').value = activity.title || '';
    
    const assigneeSelect = document.getElementById('activityAssignee');
    if (assigneeSelect) {
      assigneeSelect.value = activity.assignee || '';
    }
    
    document.getElementById('activityLocation').value = activity.location || '';
    
    const notesInput = document.getElementById('activityNotes');
    if (notesInput) {
      notesInput.value = activity.notes || '';
    }
    
    const recurringCheckbox = document.getElementById('activityRecurring');
    if (recurringCheckbox) {
      recurringCheckbox.checked = activity.recurring || false;
    }
    
    // Configurar hora de inicio con minutos
    const startHourSelect = document.getElementById('activityStartHour');
    if (startHourSelect) {
      startHourSelect.value = activity.hour || hour;
    }
    
    const startMinuteSelect = document.getElementById('activityStartMinute');
    if (startMinuteSelect) {
      startMinuteSelect.value = activity.startMinute || '00';
    }
    
    // Si la actividad tiene hora de fin definida
    if (activity.endHour) {
      const endHourSelect = document.getElementById('activityEndHour');
      if (endHourSelect) {
        endHourSelect.value = activity.endHour;
      }
      
      const endMinuteSelect = document.getElementById('activityEndMinute');
      if (endMinuteSelect) {
        endMinuteSelect.value = activity.endMinute || '00';
      }
    }
    
    // Seleccionar color
    document.querySelectorAll('.color-option').forEach(option => {
      option.classList.toggle('selected', option.dataset.color === activity.color);
    });
    
    // Mostrar botón de eliminar
    const deleteBtn = document.getElementById('deleteActivityBtn');
    if (deleteBtn) {
      deleteBtn.style.display = 'block';
    }
    
    // Por defecto, marcar la opción de eliminar todas las horas
    const deleteAllHoursCheck = document.getElementById('deleteAllHours');
    if (deleteAllHoursCheck) {
      deleteAllHoursCheck.checked = true;
    }
  } else {
    editingActivityId = null;
    
    // Ocultar botón de eliminar
    const deleteBtn = document.getElementById('deleteActivityBtn');
    if (deleteBtn) {
      deleteBtn.style.display = 'none';
    }
    
    // Color por defecto
    document.querySelectorAll('.color-option').forEach(option => {
      option.classList.toggle('selected', option.dataset.color === '#ffaea3');
    });
  }
  
  // Mostrar modal
  document.getElementById('activityModal').style.display = 'flex';
}

// === GUARDAR ACTIVIDAD ===
function saveActivity() {
  if (!currentScheduleId) return;
  
  // Obtener los valores de los campos
  // Importante: Mantener el valor del día exactamente como está en el campo oculto
  const day = parseInt(document.getElementById('activityDay').value);
  
  console.log("Día a guardar:", day); // Debug
  
  const startHour = parseInt(document.getElementById('activityStartHour').value);
  const startMinute = document.getElementById('activityStartMinute').value;
  const endHour = parseInt(document.getElementById('activityEndHour').value);
  const endMinute = document.getElementById('activityEndMinute').value;
  const title = document.getElementById('activityTitle').value.trim();
  const assignee = document.getElementById('activityAssignee').value;
  const location = document.getElementById('activityLocation').value.trim();
  const notes = document.getElementById('activityNotes').value.trim();
  const recurring = document.getElementById('activityRecurring').checked;
  const colorOption = document.querySelector('.color-option.selected');
  const color = colorOption ? colorOption.dataset.color : '#ffaea3';
  
  if (!title) {
    showNotification('El título es obligatorio', 'error');
    return;
  }
  
  // Verificar que la hora final sea mayor que la inicial
  if (parseInt(endHour) < parseInt(startHour)) {
    showNotification('La hora final debe ser mayor que la hora inicial', 'error');
    return;
  } else if (parseInt(endHour) === parseInt(startHour) && endMinute <= startMinute) {
    showNotification('Para la misma hora, los minutos finales deben ser mayores que los iniciales', 'error');
    return;
  }
  
  // Si estamos editando una actividad existente
  if (editingActivityId) {
    // Buscar en activitiesCache la actividad que estamos editando
    const existingActivity = activitiesCache.find(act => act.id === editingActivityId);
    
    // Si la actividad tiene un rango y se quiere eliminar todo el rango
    if (existingActivity && existingActivity.groupId && document.getElementById('deleteAllHours').checked) {
      // Eliminar todas las actividades del grupo primero
      deleteActivityGroup(existingActivity.groupId)
        .then(() => {
          // Luego crear las nuevas actividades
          return createRangeActivities();
        })
        .catch(error => {
          console.error('Error al actualizar actividades:', error);
          showNotification('Error al actualizar las actividades', 'error');
        });
    } else {
      // Solo eliminar esta actividad específica
      db.collection('schedules')
        .doc(currentScheduleId)
        .collection('activities')
        .doc(editingActivityId)
        .delete()
        .then(() => {
          // Continuar con la creación de la nueva actividad
          return createRangeActivities();
        })
        .catch(error => {
          console.error('Error al eliminar actividad anterior:', error);
          showNotification('Error al actualizar la actividad', 'error');
        });
    }
  } else {
    // Si es una actividad nueva, crearla directamente
    createRangeActivities();
  }
  
  function createRangeActivities() {
  const batch = db.batch();
  const activitiesRef = db.collection('schedules').doc(currentScheduleId).collection('activities');
  const groupId = Date.now().toString() + Math.floor(Math.random() * 1000);
  const hourDiff = parseInt(endHour) - parseInt(startHour);

  for (let i = 0; i < hourDiff; i++) {
    const currentHour = parseInt(startHour) + i;
    let currentMinute = (i === 0) ? startMinute : '00';

    const activityData = {
      day,
      hour: currentHour.toString(),
      startMinute: currentMinute,
      endHour,
      endMinute,
      title,
      assignee,
      location,
      notes,
      recurring,
      color,
      groupId,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: currentUser.uid
    };

    if (!recurring) {
      const cells = document.querySelectorAll('.schedule-cell');
      for (const cell of cells) {
        if (parseInt(cell.dataset.day) === day && parseInt(cell.dataset.hour) === currentHour) {
          if (cell.dataset.date) {
            activityData.date = new Date(cell.dataset.date);
            break;
          }
        }
      }
    }

    const newActivityRef = activitiesRef.doc();
    batch.set(newActivityRef, activityData);
  }

  return batch.commit()
    .then(() => {
      showNotification('Actividad guardada correctamente', 'success');
      document.getElementById('activityModal').style.display = 'none';
      editingActivityId = null;
      loadActivities();
    })
    .catch(error => {
      console.error('Error al guardar actividades:', error);
      showNotification('Error al guardar la actividad', 'error');
    });
}

// Ajuste del selector de horas en función del horario activo
function populateTimeSelectors(startHour, selectedMinute = '00') {
  const startHourSelect = document.getElementById('activityStartHour');
  const startMinuteSelect = document.getElementById('activityStartMinute');
  if (!startHourSelect || !startMinuteSelect) return;

  const minHour = currentScheduleData.startHour || 7;
  const maxHour = currentScheduleData.endHour || 22;

  startHourSelect.innerHTML = '';
  for (let h = minHour; h < maxHour; h++) {
    const option = document.createElement('option');
    option.value = h;
    option.textContent = `${h}:00`;
    if (h === startHour) option.selected = true;
    startHourSelect.appendChild(option);
  }

  Array.from(startMinuteSelect.options).forEach(option => {
    option.selected = option.value === selectedMinute;
  });

  updateEndHourOptions();
}
}


// === ELIMINAR ACTIVIDAD ===
function deleteActivity() {
  if (!currentScheduleId || !editingActivityId) return;
  
  // Comprobar si se quiere eliminar todo el grupo o solo esta actividad
  const deleteAllHours = document.getElementById('deleteAllHours') && document.getElementById('deleteAllHours').checked;
  
  if (deleteAllHours) {
    // Buscar la actividad para obtener el groupId
    const activity = activitiesCache.find(a => a.id === editingActivityId);
    
    if (activity && activity.groupId) {
      // Eliminar todas las actividades del grupo
      if (confirm('¿Estás seguro de que quieres eliminar todas las horas de esta actividad?')) {
        deleteActivityGroup(activity.groupId);
      }
    } else {
      // Si no tiene groupId, eliminar solo esta actividad
      deleteActivitySingle(editingActivityId);
    }
  } else {
    // Eliminar solo esta actividad
    if (confirm('¿Estás seguro de que quieres eliminar esta actividad?')) {
      deleteActivitySingle(editingActivityId);
    }
  }
}

// Eliminar un grupo completo de actividades
function deleteActivityGroup(groupId) {
  return db.collection('schedules')
    .doc(currentScheduleId)
    .collection('activities')
    .where('groupId', '==', groupId)
    .get()
    .then(snapshot => {
      const batch = db.batch();
      
      snapshot.forEach(doc => {
        batch.delete(doc.ref);
      });
      
      return batch.commit();
    })
    .then(() => {
      showNotification('Actividades eliminadas correctamente', 'success');
      
      // Cerrar modal
      document.getElementById('activityModal').style.display = 'none';
      editingActivityId = null;
      
      // Recargar actividades
      loadActivities();
    })
    .catch(error => {
      console.error('Error al eliminar actividades del grupo:', error);
      showNotification('Error al eliminar las actividades', 'error');
    });
}

// Eliminar una sola actividad
function deleteActivitySingle(activityId) {
  return db.collection('schedules')
    .doc(currentScheduleId)
    .collection('activities')
    .doc(activityId)
    .delete()
    .then(() => {
      showNotification('Actividad eliminada correctamente', 'success');
      
      // Cerrar modal
      document.getElementById('activityModal').style.display = 'none';
      editingActivityId = null;
      
      // Recargar actividades
      loadActivities();
    })
    .catch(error => {
      console.error('Error al eliminar actividad:', error);
      showNotification('Error al eliminar la actividad', 'error');
    });
}

// === ACTUALIZAR TÍTULO DE LA SEMANA ===
function updateWeekTitle() {
  const weekTitle = document.getElementById('currentWeekTitle');
  if (!weekTitle) return;
  
  // Calcular fecha de fin de semana (domingo)
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
  // Formatear fechas
  const startStr = `${currentWeekStart.getDate()}/${currentWeekStart.getMonth() + 1}`;
  const endStr = `${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`;
  
  weekTitle.textContent = `${startStr} - ${endStr}`;
}

// === FUNCIÓN AUXILIAR: OBTENER PRIMER DÍA DE LA SEMANA (LUNES) ===
function getStartOfWeek(date) {
  const result = new Date(date);
  const day = result.getDay();
  
  // Si es domingo (0), restar 6 días para llegar al lunes anterior
  // Si es otro día, restar day - 1 días para llegar al lunes
  const diff = day === 0 ? 6 : day - 1;
  
  result.setDate(result.getDate() - diff);
  result.setHours(0, 0, 0, 0);
  
  return result;
}

// === FUNCIÓN AUXILIAR: OBTENER NOMBRE DE TIPO DE HORARIO ===
function getScheduleTypeName(type) {
  switch (type) {
    case 'school': return 'Escolar';
    case 'work': return 'Trabajo';
    case 'activities': return 'Actividades';
    case 'custom': return 'Personalizado';
    default: return 'Otro';
  }
}