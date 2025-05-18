const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;
let currentBoardId = null;
let currentBoardData = null;
let unsubscribeActivities = null;

// === INICIO DE SESIÓN ===
auth.onAuthStateChanged(user => {
  if (user) {
    currentUser = user;
    loadBoardsRealtime();
  } else {
    window.location.href = 'login.html';
  }
});

// === TABLEROS ===
function loadBoardsRealtime() {
  db.collection('boards')
    .where('members', 'array-contains', currentUser.uid)
    .orderBy('createdAt', 'desc')
    .onSnapshot(snapshot => {
      const boardsList = document.getElementById('boardsList');
      boardsList.innerHTML = '';
      snapshot.forEach(doc => {
        const board = doc.data();
        const div = document.createElement('div');
        div.classList.add('board-item');
        div.dataset.id = doc.id;
        div.innerHTML = `
          <div class="board-item-icon">📋</div>
          <div>
            <div class="board-item-title">${board.name}</div>
            <div class="board-item-meta">${board.type}</div>
          </div>`;
        div.addEventListener('click', () => selectBoard(doc.id, board));
        boardsList.appendChild(div);
      });
    });
}

function selectBoard(boardId, boardData) {
  currentBoardId = boardId;
  currentBoardData = boardData;
  document.getElementById('boardTitle').textContent = boardData.name;

  document.querySelectorAll('.board-item').forEach(el => el.classList.remove('active'));
  const selected = document.querySelector(`.board-item[data-id="${boardId}"]`);
  if (selected) selected.classList.add('active');

  renderSchedule();
  if (unsubscribeActivities) unsubscribeActivities();
  unsubscribeActivities = db.collection('boards').doc(boardId).collection('activities')
    .onSnapshot(snapshot => {
      renderActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
}

// === RENDER HORARIO ===
function renderSchedule() {
  const container = document.getElementById('scheduleViewContainer');
  container.innerHTML = '';

  const grid = document.createElement('div');
  grid.classList.add('schedule-view');

  const slotCount = Math.floor((currentBoardData.endHour - currentBoardData.startHour) * (60 / currentBoardData.timeSlot));
  const timeSlots = document.createElement('div');
  timeSlots.classList.add('time-slots');

  for (let i = 0; i < slotCount; i++) {
    const minutes = currentBoardData.startHour * 60 + i * currentBoardData.timeSlot;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    const slot = document.createElement('div');
    slot.classList.add('time-slot');
    slot.textContent = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    timeSlots.appendChild(slot);
  }

  const daysGrid = document.createElement('div');
  daysGrid.classList.add('days-grid');
  daysGrid.classList.add('grid-day');

  for (let d = 0; d < 7; d++) {
    for (let i = 0; i < slotCount; i++) {
      const cell = document.createElement('div');
      cell.classList.add('grid-cell');
      if (d >= 5) cell.classList.add('weekend');
      daysGrid.appendChild(cell);
    }
  }

  grid.appendChild(timeSlots);
  grid.appendChild(daysGrid);
  container.appendChild(grid);
}

// === ACTIVIDADES ===
function renderActivities(activities) {
  const container = document.querySelector('.days-grid');
  container.innerHTML = '';

  const slotCount = Math.floor((currentBoardData.endHour - currentBoardData.startHour) * (60 / currentBoardData.timeSlot));
  const filterMine = document.getElementById('filterMineBtn').classList.contains('active');

  activities.forEach(act => {
    if (filterMine && act.assignee !== currentUser.uid) return;

    const top = calculateTop(act.start, currentBoardData);
    const height = calculateHeight(act.start, act.end, currentBoardData);
    const left = (100 / 7) * act.day;

    const div = document.createElement('div');
    div.classList.add('schedule-activity');
    div.style.top = `${top}px`;
    div.style.height = `${height}px`;
    div.style.left = `calc(${left}% + 2px)`;
    div.style.width = `calc(${100 / 7}% - 4px)`;
    div.style.backgroundColor = act.color || '#ffaea3';

    div.innerHTML = `
      <div class="activity-title">${act.title}</div>
      <div class="activity-time">${act.start} - ${act.end}</div>
      <div class="activity-location">${act.location || ''}</div>
    `;

    div.addEventListener('click', () => openEditActivityModal(act));
    container.appendChild(div);
  });
}

function calculateTop(time, board) {
  const [h, m] = time.split(':').map(Number);
  const total = (h * 60 + m) - (board.startHour * 60);
  return (total / board.timeSlot) * 30;
}

function calculateHeight(start, end, board) {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const minutes = (eh * 60 + em) - (sh * 60 + sm);
  return (minutes / board.timeSlot) * 30;
}

// === CREAR / EDITAR ACTIVIDAD ===
document.getElementById('activityForm').addEventListener('submit', e => {
  e.preventDefault();
  const id = document.getElementById('activityId').value;
  const data = {
    title: document.getElementById('activityTitle').value,
    day: parseInt(document.getElementById('activityDay').value),
    assignee: document.getElementById('activityAssignee').value,
    start: document.getElementById('activityStartTime').value,
    end: document.getElementById('activityEndTime').value,
    location: document.getElementById('activityLocation').value,
    color: document.querySelector('.color-option.selected')?.dataset.color || '#ffaea3',
    notes: document.getElementById('activityNotes').value,
    recurring: document.getElementById('activityRecurring').checked,
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  const ref = db.collection('boards').doc(currentBoardId).collection('activities');

  if (id) {
    ref.doc(id).update(data).then(() => {
      closeActivityModal();
    });
  } else {
    ref.add(data).then(() => {
      closeActivityModal();
    });
  }
});

function openEditActivityModal(activity) {
  document.getElementById('activityId').value = activity.id;
  document.getElementById('activityTitle').value = activity.title;
  document.getElementById('activityDay').value = activity.day;
  document.getElementById('activityAssignee').value = activity.assignee;
  document.getElementById('activityStartTime').value = activity.start;
  document.getElementById('activityEndTime').value = activity.end;
  document.getElementById('activityLocation').value = activity.location || '';
  document.getElementById('activityNotes').value = activity.notes || '';
  document.getElementById('activityRecurring').checked = activity.recurring || false;
  document.querySelectorAll('.color-option').forEach(opt => {
    opt.classList.toggle('selected', opt.dataset.color === activity.color);
  });

  document.getElementById('deleteActivityBtn').style.display = 'inline-block';
  document.getElementById('activityModal').style.display = 'flex';
}

document.getElementById('deleteActivityBtn').addEventListener('click', () => {
  const id = document.getElementById('activityId').value;
  if (id) {
    db.collection('boards').doc(currentBoardId).collection('activities').doc(id).delete().then(() => {
      closeActivityModal();
    });
  }
});

function closeActivityModal() {
  document.getElementById('activityForm').reset();
  document.getElementById('activityId').value = '';
  document.getElementById('activityModal').style.display = 'none';
  document.getElementById('deleteActivityBtn').style.display = 'none';
}

// === FILTROS ===
document.getElementById('filterAllBtn').addEventListener('click', () => {
  document.getElementById('filterAllBtn').classList.add('active');
  document.getElementById('filterMineBtn').classList.remove('active');
});

document.getElementById('filterMineBtn').addEventListener('click', () => {
  document.getElementById('filterAllBtn').classList.remove('active');
  document.getElementById('filterMineBtn').classList.add('active');
});
