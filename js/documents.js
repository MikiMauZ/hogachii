// Funciones para la gestión de documentos

document.addEventListener('DOMContentLoaded', function() {
  // Referencias a elementos del DOM
  const documentsGrid = document.getElementById('documentsGrid');
  const uploadDocBtn = document.getElementById('uploadDocBtn');
  const documentModal = document.getElementById('documentModal');
  const closeDocumentModal = document.getElementById('closeDocumentModal');
  const cancelDocumentBtn = document.getElementById('cancelDocumentBtn');
  const documentForm = document.getElementById('documentForm');
  const categoryFilters = document.querySelectorAll('.documents-filters .kawaii-filter');
  const viewDocumentModal = document.getElementById('viewDocumentModal');
  const closeViewDocumentModal = document.getElementById('closeViewDocumentModal');
  const closeViewDocumentBtn = document.getElementById('closeViewDocumentBtn');
  const deleteDocumentBtn = document.getElementById('deleteDocumentBtn');
  const downloadDocumentBtn = document.getElementById('downloadDocumentBtn');
  
  // Estado para el filtro actual
  let currentCategory = 'all';
  
  // ID del documento actual (para visualización/eliminación/descarga)
  let currentDocumentId = null;
  let currentDocumentUrl = null;
  
  // Verificar autenticación
  checkAuth().then(user => {
    // Cargar documentos iniciales
    loadDocuments('all');
    
    // Setup de eventos
    setupEventListeners();
  }).catch(error => {
    console.error("Error de autenticación:", error);
  });
  
  function setupEventListeners() {
    // Botón para abrir modal
    uploadDocBtn.addEventListener('click', () => {
      openDocumentModal();
    });
    
    // Botones para cerrar modales
    closeDocumentModal.addEventListener('click', () => {
      closeModal(documentModal);
    });
    
    cancelDocumentBtn.addEventListener('click', () => {
      closeModal(documentModal);
    });
    
    closeViewDocumentModal.addEventListener('click', () => {
      closeModal(viewDocumentModal);
    });
    
    closeViewDocumentBtn.addEventListener('click', () => {
      closeModal(viewDocumentModal);
    });
    
    // Escuchar clic fuera de los modales para cerrar
    documentModal.addEventListener('click', (e) => {
      if (e.target === documentModal) {
        closeModal(documentModal);
      }
    });
    
    viewDocumentModal.addEventListener('click', (e) => {
      if (e.target === viewDocumentModal) {
        closeModal(viewDocumentModal);
      }
    });
    
    // Filtros de categoría
    categoryFilters.forEach(filter => {
      filter.addEventListener('click', () => {
        // Actualizar UI
        categoryFilters.forEach(f => f.classList.remove('active'));
        filter.classList.add('active');
        
        // Actualizar filtro y cargar documentos
        currentCategory = filter.dataset.category;
        loadDocuments(currentCategory);
      });
    });
    
    // Envío del formulario
    documentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      uploadDocument();
    });
    
    // Eliminar documento
    deleteDocumentBtn.addEventListener('click', () => {
      if (currentDocumentId) {
        deleteDocument(currentDocumentId);
      }
    });
    
    // Descargar documento
    downloadDocumentBtn.addEventListener('click', () => {
      if (currentDocumentUrl) {
        window.open(currentDocumentUrl, '_blank');
      }
    });
  }
  
  // Cargar documentos según filtro
  function loadDocuments(category) {
    // Mostrar loader
    documentsGrid.innerHTML = '<div class="loader"></div>';
    
    const homeId = getCurrentHome();
    if (!homeId) {
      documentsGrid.innerHTML = '<p class="empty-message">No hay un hogar seleccionado</p>';
      return;
    }
    
    // Preparar query base
    let query = db.collection('documents').where('homeId', '==', homeId);
    
    // Aplicar filtro si no es 'all'
    if (category !== 'all') {
      query = query.where('category', '==', category);
    }
    
    // Ejecutar query
    query.orderBy('uploadedAt', 'desc')
      .get()
      .then((snapshot) => {
        if (snapshot.empty) {
  documentsGrid.innerHTML = `
    <div class="empty-state">
      <div class="emoji">😊</div>
      <div class="message">
        No hay documentos.<br>
        ¡Sube tu primer documento!
      </div>
    </div>
  `;
  return;
}
        
        let documentsHTML = '';
        
        snapshot.forEach((doc) => {
          const document = doc.data();
          const documentId = doc.id;
          
          // Determinar icono según tipo de archivo
          const fileIcon = getFileIcon(document.fileType);
          
          // Fecha de subida formateada
          let uploadDateStr = 'Fecha desconocida';
          if (document.uploadedAt) {
            const uploadDate = new Date(document.uploadedAt.seconds * 1000);
            uploadDateStr = uploadDate.toLocaleDateString();
          }
          
          // Crear tarjeta de documento
          documentsHTML += `
            <div class="document-card" data-id="${documentId}">
              <div class="document-icon">${fileIcon}</div>
              <div class="document-info">
                <div class="document-title">${document.title}</div>
                <div class="document-meta">${getCategoryName(document.category)} - ${uploadDateStr}</div>
              </div>
            </div>
          `;
        });
        
        documentsGrid.innerHTML = documentsHTML;
        
        // Añadir event listeners a las tarjetas
        setupDocumentCardListeners();
      })
      .catch((error) => {
        console.error("Error al cargar documentos:", error);
        documentsGrid.innerHTML = '<p class="error-message">Error al cargar los documentos</p>';
      });
  }
  
  // Añadir event listeners a las tarjetas de documentos
  function setupDocumentCardListeners() {
    document.querySelectorAll('.document-card').forEach(card => {
      card.addEventListener('click', () => {
        const documentId = card.dataset.id;
        showDocumentDetails(documentId);
      });
    });
  }
  
  // Mostrar detalles de un documento
  function showDocumentDetails(documentId) {
    // Buscar el documento en Firestore
    db.collection('documents').doc(documentId).get()
      .then((doc) => {
        if (!doc.exists) {
          showNotification('El documento no existe', 'error');
          return;
        }
        
        const documentData = doc.data();
        
        // Guardar ID y URL del documento actual
        currentDocumentId = documentId;
        currentDocumentUrl = documentData.fileUrl;
        
        // Actualizar el título del modal
        document.getElementById('viewDocumentTitle').textContent = documentData.title;
        
        // Formatear fecha
        let uploadDateStr = 'Fecha desconocida';
        if (documentData.uploadedAt) {
          const uploadDate = new Date(documentData.uploadedAt.seconds * 1000);
          uploadDateStr = uploadDate.toLocaleDateString();
        }
        
        // Contenido de detalles
        const documentDetails = document.getElementById('documentDetails');
        documentDetails.innerHTML = `
          <div class="document-detail-item">
            <strong>Categoría:</strong> ${getCategoryName(documentData.category)}
          </div>
          ${documentData.description ? `
            <div class="document-detail-item">
              <strong>Descripción:</strong> ${documentData.description}
            </div>
          ` : ''}
          <div class="document-detail-item">
            <strong>Subido:</strong> ${uploadDateStr}
          </div>
          <div class="document-detail-item">
            <strong>Tipo de archivo:</strong> ${documentData.fileType || 'Desconocido'}
          </div>
        `;
        
        // Mostrar modal
        openModal(viewDocumentModal);
      })
      .catch((error) => {
        console.error("Error al obtener documento:", error);
        showNotification('Error al cargar el documento', 'error');
      });
  }
  
  // Subir un nuevo documento
  function uploadDocument() {
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
    const title = document.getElementById('documentTitle').value.trim();
    const description = document.getElementById('documentDescription').value.trim();
    const category = document.getElementById('documentCategory').value;
    const fileInput = document.getElementById('documentFile');
    
    // Validación básica
    if (!title || !fileInput.files.length) {
      showNotification('El título y el archivo son obligatorios', 'error');
      return;
    }
    
    const file = fileInput.files[0];
    
    // Mostrar notificación de carga
    showNotification('Subiendo documento...', 'info');
    
    // Crear referencia en Storage
    const storageRef = storage.ref();
    const fileRef = storageRef.child(`documents/${homeId}/${new Date().getTime()}_${file.name}`);
    
    // Subir archivo
    fileRef.put(file)
      .then(snapshot => {
        // Obtener URL de descarga
        return snapshot.ref.getDownloadURL();
      })
      .then(downloadURL => {
        // Crear documento en Firestore
        return db.collection('documents').add({
          title,
          description,
          category,
          fileUrl: downloadURL,
          fileType: file.type,
          fileName: file.name,
          fileSize: file.size,
          uploadedBy: user.uid,
          uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
          homeId
        });
      })
      .then(() => {
        showNotification('Documento subido correctamente', 'success');
        closeModal(documentModal);
        loadDocuments(currentCategory);
      })
      .catch((error) => {
        console.error("Error al subir documento:", error);
        showNotification('Error al subir el documento', 'error');
      });
  }
  
  // Eliminar un documento
  function deleteDocument(documentId) {
    if (confirm('¿Estás seguro de que quieres eliminar este documento?')) {
      // Primero obtener la URL para borrar del Storage
      db.collection('documents').doc(documentId).get()
        .then((doc) => {
          if (!doc.exists) {
            showNotification('El documento no existe', 'error');
            return Promise.reject('Documento no encontrado');
          }
          
          const documentData = doc.data();
          
          // Eliminar de Firestore
          return db.collection('documents').doc(documentId).delete()
            .then(() => {
              // Intentar eliminar el archivo de Storage
              if (documentData.fileUrl) {
                // Extraer la ruta del archivo de la URL
                const fileRef = storage.refFromURL(documentData.fileUrl);
                return fileRef.delete();
              }
            });
        })
        .then(() => {
          showNotification('Documento eliminado', 'success');
          closeModal(viewDocumentModal);
          loadDocuments(currentCategory);
        })
        .catch((error) => {
          console.error("Error al eliminar documento:", error);
          showNotification('Error al eliminar el documento', 'error');
        });
    }
  }
  
  // Funciones para manejar modales
  
  function openDocumentModal() {
    // Limpiar formulario
    documentForm.reset();
    
    // Mostrar modal
    openModal(documentModal);
  }
  
  function openModal(modal) {
    modal.style.display = 'flex';
  }
  
  function closeModal(modal) {
    modal.style.display = 'none';
    
    // Si es el modal de ver documento, limpiar datos actuales
    if (modal === viewDocumentModal) {
      currentDocumentId = null;
      currentDocumentUrl = null;
    }
  }
  
  // Funciones auxiliares
  
  // Obtener icono según tipo de archivo
  function getFileIcon(fileType) {
    if (!fileType) return '📄';
    
    if (fileType.includes('pdf')) {
      return '📕';
    } else if (fileType.includes('image')) {
      return '🖼️';
    } else if (fileType.includes('word') || fileType.includes('document')) {
      return '📝';
    } else if (fileType.includes('excel') || fileType.includes('sheet')) {
      return '📊';
    } else if (fileType.includes('presentation') || fileType.includes('powerpoint')) {
      return '📊';
    } else if (fileType.includes('text')) {
      return '📄';
    } else {
      return '📦';
    }
  }
  
  // Obtener nombre de categoría
  function getCategoryName(category) {
    const names = {
      'bills': 'Facturas',
      'warranty': 'Garantías',
      'contract': 'Contratos',
      'manual': 'Manuales',
      'other': 'Otros'
    };
    
    return names[category] || 'Otro';
  }
});