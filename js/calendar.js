// Funciones para el calendario

document.addEventListener('DOMContentLoaded', function() {
  // Referencias a elementos del DOM
  const calendarGrid = document.getElementById('calendarGrid');
  const currentMonthYear = document.getElementById('currentMonthYear');
  const prevMonthBtn = document.getElementById('prevMonthBtn');
  const nextMonthBtn = document.getElementById('nextMonthBtn');
  const addEventBtn = document.getElementById('addEventBtn');
  const eventModal = document.getElementById('eventModal');
  const closeEventModal = document.getElementById('closeEventModal');
  const cancelEventBtn = document.getElementById('cancelEventBtn');
  const eventForm = document.getElementById('eventForm');
  const viewEventModal = document.getElementById('viewEventModal');
  const closeViewEventModal = document.getElementById('closeViewEventModal');
  const closeViewEventBtn = document.getElementById('closeViewEventBtn');
  const deleteEventBtn = document.getElementById('deleteEventBtn');
  
  // Estado para la fecha actual del calendario
  let currentDate = new Date();
  let currentMonth = currentDate.getMonth();
  let currentYear = currentDate.getFullYear();
  
  // Estado para eventos guardados
  let events = [];
  
  // ID del evento actual (para visualización/eliminación)
  let currentEventId = null;
  
  // Verificar autenticación
  checkAuth().then(user => {
    // Cargar miembros para el selector de participantes
    loadFamilyMembers();
    
    // Inicializar calendario
    updateCalendarTitle();
    renderCalendar();
    
    // Setup de eventos
    setupEventListeners();
  }).catch(error => {
    console.error("Error de autenticación:", error);
  });
  
  function setupEventListeners() {
    // Navegación del calendario
    prevMonthBtn.addEventListener('click', () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      updateCalendarTitle();
      renderCalendar();
    });
    
    nextMonthBtn.addEventListener('click', () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      updateCalendarTitle();
      renderCalendar();
    });
    
    // Botón para abrir modal de nuevo evento
    addEventBtn.addEventListener('click', () => {
      openEventModal();
    });
    
    // Botones para cerrar modales
    closeEventModal.addEventListener('click', () => {
      closeModal(eventModal);
    });
    
    cancelEventBtn.addEventListener('click', () => {
      closeModal(eventModal);
    });
    
    closeViewEventModal.addEventListener('click', () => {
      closeModal(viewEventModal);
    });
    
    closeViewEventBtn.addEventListener('click', () => {
      closeModal(viewEventModal);
    });
    
    // Escuchar clic fuera de los modales para cerrar
    eventModal.addEventListener('click', (e) => {
      if (e.target === eventModal) {
        closeModal(eventModal);
      }
    });
    
    viewEventModal.addEventListener('click', (e) => {
      if (e.target === viewEventModal) {
        closeModal(viewEventModal);
      }
    });
    
    // Envío del formulario de evento
    eventForm.addEventListener('submit', (e) => {
      e.preventDefault();
      addNewEvent();
    });
    
    // Eliminar evento
    deleteEventBtn.addEventListener('click', () => {
      if (currentEventId) {
        deleteEvent(currentEventId);
      }
    });
    
    // Eventos para el selector de fecha (preseleccionar fecha actual)
    const today = new Date();
    document.getElementById('eventDate').valueAsDate = today;
  }
  
  // Actualizar título del calendario
  function updateCalendarTitle() {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    currentMonthYear.textContent = `${months[currentMonth]} ${currentYear}`;
  }
  
  // Renderizar calendario
  function renderCalendar() {
    // Mostrar loader
    calendarGrid.innerHTML = '<div class="loader"></div>';
    
    const homeId = getCurrentHome();
    if (!homeId) {
      calendarGrid.innerHTML = '<p class="empty-message">No hay un hogar seleccionado</p>';
      showNotification('No hay un hogar seleccionado. Por favor, crea o únete a un hogar primero.', 'error');
      return;
    }
    
    console.log("Cargando calendario con homeId:", homeId);
    
    // Cargar eventos para este mes
    loadMonthEvents(homeId, currentYear, currentMonth)
      .then(() => {
        generateCalendarDays();
      })
      .catch(error => {
        console.error("Error al cargar eventos:", error);
        calendarGrid.innerHTML = '<p class="error-message">Error al cargar el calendario. Es posible que necesites crear un índice en Firebase.</p>';
        showNotification('Error al cargar eventos. Es posible que necesites crear un índice en Firebase.', 'error');
      });
  }
  
  // Generar los días del calendario
  // Generar los días del calendario
function generateCalendarDays() {
  calendarGrid.innerHTML = '';
  
  // Obtener el primer día del mes
  const firstDay = new Date(currentYear, currentMonth, 1);
  
  // Ajustar para que la semana comience en lunes (0 = lunes, 6 = domingo)
  let firstDayIndex = firstDay.getDay() - 1;
  if (firstDayIndex < 0) firstDayIndex = 6; // Si es domingo (0), convertir a 6
  
  // Último día del mes
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  const totalDays = lastDay.getDate();
  
  // Último día del mes anterior
  const prevLastDay = new Date(currentYear, currentMonth, 0);
  const prevDaysCount = prevLastDay.getDate();
  
  // Fecha actual para resaltar el día de hoy
  const today = new Date();
  
  // Generar los días del mes anterior (a rellenar)
  for (let i = 0; i < firstDayIndex; i++) {
    const prevMonthDay = prevDaysCount - (firstDayIndex - i - 1);
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day prev-month';
    dayCell.innerHTML = `<div class="day-number">${prevMonthDay}</div>`;
    calendarGrid.appendChild(dayCell);
  }
  
  // Generar los días del mes actual
  for (let i = 1; i <= totalDays; i++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day';
    
    // Verificar si es hoy
    if (i === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear()) {
      dayCell.classList.add('today');
    }
    
    // Añadir número del día
    dayCell.innerHTML = `<div class="day-number">${i}</div>`;
    
    // Añadir eventos para este día si existen
    const dayEvents = getEventsForDay(i);
    if (dayEvents.length > 0) {
      // Añadir clase para destacar días con eventos
      dayCell.classList.add('has-events');
      
      const eventsContainer = document.createElement('div');
      eventsContainer.className = 'day-events';
      
      // Limitar a máximo 3 puntos para días con muchos eventos
      const maxDots = window.innerWidth <= 768 ? 3 : dayEvents.length;
      const dotsToShow = Math.min(maxDots, dayEvents.length);
      
      for (let j = 0; j < dotsToShow; j++) {
        const event = dayEvents[j];
        const eventDot = document.createElement('div');
        eventDot.className = 'event-dot';
        eventDot.style.backgroundColor = getCategoryColor(event.category);
        eventDot.setAttribute('data-event-id', event.id);
        eventsContainer.appendChild(eventDot);
      }
      
      dayCell.appendChild(eventsContainer);
      
      // Añadir evento click para mostrar detalles
      dayCell.addEventListener('click', () => {
        if (dayEvents.length === 1) {
          // Si solo hay un evento, mostrar directamente
          showEventDetails(dayEvents[0].id);
        } else {
          // Si hay múltiples eventos, mostrar selección
          showEventsForDay(i, dayEvents);
        }
      });
    } else {
      // Añadir evento click para crear nuevo evento en este día
      dayCell.addEventListener('click', () => {
        const selectedDate = new Date(currentYear, currentMonth, i);
        openEventModal(selectedDate);
      });
    }
    
    calendarGrid.appendChild(dayCell);
  }
  
  // Calcular cuántos días del siguiente mes necesitamos para completar la cuadrícula
  const totalCellsUsed = firstDayIndex + totalDays;
  const remainingCells = totalCellsUsed % 7 === 0 ? 0 : 7 - (totalCellsUsed % 7);
  
  // Generar los días del mes siguiente (a rellenar)
  for (let i = 1; i <= remainingCells; i++) {
    const dayCell = document.createElement('div');
    dayCell.className = 'calendar-day next-month';
    dayCell.innerHTML = `<div class="day-number">${i}</div>`;
    calendarGrid.appendChild(dayCell);
  }
}
  
  // Cargar eventos para el mes actual
  function loadMonthEvents(homeId, year, month) {
    // Primer día del mes
    const startDate = new Date(year, month, 1);
    // Primer día del mes siguiente
    const endDate = new Date(year, month + 1, 1);
    
    return db.collection('events')
      .where('homeId', '==', homeId)
      .where('startDate', '>=', startDate)
      .where('startDate', '<', endDate)
      .get()
      .then((snapshot) => {
        events = [];
        snapshot.forEach((doc) => {
          events.push({
            id: doc.id,
            ...doc.data()
          });
        });
      });
  }
  
  // Obtener eventos para un día específico
  function getEventsForDay(day) {
    return events.filter(event => {
      const eventDate = event.startDate instanceof Date ? 
                        event.startDate : 
                        event.startDate.toDate ? 
                            event.startDate.toDate() : 
                            new Date(event.startDate);
      return eventDate.getDate() === day;
    });
  }
  
  // Mostrar eventos para un día específico
  // Mostrar eventos para un día específico
function showEventsForDay(day, dayEvents) {
  // Crear un modal para mostrar todos los eventos del día
  const modalContent = document.createElement('div');
  modalContent.className = 'modal-content';
  
  // Título del modal
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                     'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const dateTitle = `${day} de ${monthNames[currentMonth]} de ${currentYear}`;
  
  modalContent.innerHTML = `
    <button class="modal-close" id="closeEventsListModal">&times;</button>
    <h2 class="modal-title">Eventos del ${dateTitle}</h2>
    <div class="events-list">
      ${dayEvents.map(event => `
        <div class="event-item" data-id="${event.id}">
          <div class="event-color" style="background-color: ${getCategoryColor(event.category)}"></div>
          <div class="event-info">
            <div class="event-title">${event.title}</div>
            <div class="event-time">${getEventTime(event)}</div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="modal-actions">
      <button id="addNewEventForDayBtn" class="kawaii-btn">Añadir Evento</button>
    </div>
  `;
  
  // Crear el modal y añadirlo al DOM
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'eventsListModal';
  modal.style.display = 'flex';
  modal.appendChild(modalContent);
  document.body.appendChild(modal);
  
  // Añadir event listeners
  const closeBtn = modal.querySelector('#closeEventsListModal');
  closeBtn.addEventListener('click', () => {
    document.body.removeChild(modal);
  });
  
  // Click fuera del modal para cerrar
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      document.body.removeChild(modal);
    }
  });
  
  // Botón para añadir nuevo evento
  const addBtn = modal.querySelector('#addNewEventForDayBtn');
  addBtn.addEventListener('click', () => {
    document.body.removeChild(modal);
    const selectedDate = new Date(currentYear, currentMonth, day);
    openEventModal(selectedDate);
  });
  
  // Click en un evento para ver detalles
  const eventItems = modal.querySelectorAll('.event-item');
  eventItems.forEach(item => {
    item.addEventListener('click', () => {
      const eventId = item.dataset.id;
      document.body.removeChild(modal);
      showEventDetails(eventId);
    });
  });
}

// Función auxiliar para formatear la hora del evento
function getEventTime(event) {
  if (event.allDay) {
    return "Todo el día";
  }
  
  const eventDate = event.startDate instanceof Date ? 
                    event.startDate : 
                    event.startDate.toDate ? 
                        event.startDate.toDate() : 
                        new Date(event.startDate);
  
  let hours = eventDate.getHours();
  let minutes = eventDate.getMinutes();
  
  // Formatear como HH:MM
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}
  
  // Mostrar detalles de un evento
  function showEventDetails(eventId) {
    // Buscar el evento
    const event = events.find(e => e.id === eventId);
    if (!event) return;
    
    // Guardar ID del evento actual
    currentEventId = eventId;
    
    // Actualizar el título del modal
    document.getElementById('viewEventTitle').textContent = event.title;
    
    // Formatear fecha
    const eventDate = event.startDate instanceof Date ? 
                      event.startDate : 
                      event.startDate.toDate ? 
                          event.startDate.toDate() : 
                          new Date(event.startDate);
    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = eventDate.toLocaleDateString('es-ES', dateOptions);
    
    // Formatear hora si existe
    let timeStr = '';
    if (event.allDay !== true && eventDate.getHours() > 0) {
      timeStr = ` a las ${eventDate.getHours()}:${eventDate.getMinutes().toString().padStart(2, '0')}`;
    }
    
    // Contenido de detalles
    const eventDetails = document.getElementById('eventDetails');
    eventDetails.innerHTML = `
      <div class="event-detail-item">
        <strong>Fecha:</strong> ${formattedDate}${timeStr}
      </div>
      ${event.description ? `
        <div class="event-detail-item">
          <strong>Descripción:</strong> ${event.description}
        </div>
      ` : ''}
      <div class="event-detail-item">
        <strong>Categoría:</strong> ${getCategoryName(event.category)}
      </div>
    `;
    
    // Mostrar modal
    openModal(viewEventModal);
  }
  
  // Cargar miembros del hogar para el selector de participantes
  function loadFamilyMembers() {
    const participantsContainer = document.getElementById('eventParticipants');
    if (!participantsContainer) return;
    
    const homeId = getCurrentHome();
    if (!homeId) {
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
        // Generar checkboxes para cada miembro
        participantsContainer.innerHTML = '';
        
        members.forEach(member => {
          const label = document.createElement('label');
          label.className = 'participant-checkbox';
          
          label.innerHTML = `
            <input type="checkbox" name="participant" value="${member.id}">
            <span>${member.displayName}</span>
          `;
          
          participantsContainer.appendChild(label);
        });
      })
      .catch((error) => {
        console.error("Error al cargar miembros:", error);
      });
  }
  
  // Añadir nuevo evento
  function addNewEvent() {
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
    const title = document.getElementById('eventTitle').value.trim();
    const description = document.getElementById('eventDescription').value.trim();
    const dateInput = document.getElementById('eventDate').value;
    const timeInput = document.getElementById('eventTime').value;
    const category = document.getElementById('eventCategory').value;
    
    // Obtener participantes seleccionados
    const participantsCheckboxes = document.querySelectorAll('input[name="participant"]:checked');
    const participants = Array.from(participantsCheckboxes).map(cb => cb.value);
    
    // Validación básica
    if (!title || !dateInput) {
      showNotification('El título y la fecha son obligatorios', 'error');
      return;
    }
    
    // Crear objeto de fecha
    let eventDate = new Date(dateInput);
    
    // Añadir hora si está presente
    if (timeInput) {
      const [hours, minutes] = timeInput.split(':');
      eventDate.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    }
    
    // Preparar objeto de evento
    const eventData = {
      title,
      description,
      startDate: eventDate,
      allDay: !timeInput,
      category,
      participants,
      homeId,
      createdBy: user.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };
    
    console.log("Guardando evento:", eventData);
    
    // Guardar en Firestore
    db.collection('events').add(eventData)
      .then(() => {
        showNotification('Evento creado correctamente', 'success');
        closeModal(eventModal);
        renderCalendar();
      })
      .catch((error) => {
        console.error("Error al crear evento:", error);
        showNotification('Error al crear el evento', 'error');
      });
  }
  
  // Eliminar un evento
  function deleteEvent(eventId) {
    if (confirm('¿Estás seguro de que quieres eliminar este evento?')) {
      db.collection('events').doc(eventId).delete()
        .then(() => {
          showNotification('Evento eliminado', 'success');
          closeModal(viewEventModal);
          renderCalendar();
        })
        .catch((error) => {
          console.error("Error al eliminar evento:", error);
          showNotification('Error al eliminar el evento', 'error');
        });
    }
  }
  
  // Funciones para manejar modales
  
  function openEventModal(date) {
    // Limpiar formulario
    eventForm.reset();
    
    // Si se proporciona una fecha, establecerla en el selector
    if (date) {
      // Formatear fecha a YYYY-MM-DD para el input date
      const dateString = date.toISOString().split('T')[0];
      document.getElementById('eventDate').value = dateString;
    } else {
      // Si no hay fecha seleccionada, usar la fecha actual
      const today = new Date();
      const dateString = today.toISOString().split('T')[0];
      document.getElementById('eventDate').value = dateString;
    }
    
    // Mostrar modal
    openModal(eventModal);
  }
  
  function openModal(modal) {
    modal.style.display = 'flex';
  }
  
  function closeModal(modal) {
    modal.style.display = 'none';
    
    // Si es el modal de ver evento, limpiar ID actual
    if (modal === viewEventModal) {
      currentEventId = null;
    }
  }
  
  // Funciones auxiliares
  
  // Obtener color según categoría
  function getCategoryColor(category) {
    const colors = {
      'family': '#ff6b9d',
      'home': '#2d9cdb',
      'social': '#27ae60',
      'personal': '#9b51e0',
      'work': '#f2c94c',
      'other': '#828282'
    };
    
    return colors[category] || '#ff6b9d';
  }
  
  // Obtener nombre de categoría
  function getCategoryName(category) {
    const names = {
      'family': 'Familia',
      'home': 'Hogar',
      'social': 'Social',
      'personal': 'Personal',
      'work': 'Trabajo',
      'other': 'Otros'
    };
    
    return names[category] || 'Otro';
  }
});