// Funciones de autenticación

// Registrar un nuevo usuario
function registerUser(email, password, displayName) {
  return firebase.auth().createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Actualizar perfil con el nombre
      return userCredential.user.updateProfile({
        displayName: displayName
      }).then(() => {
        // Crear un hogar para el nuevo usuario
        return createNewHome(userCredential.user.uid, displayName + "'s Home");
      });
    })
    .then((homeId) => {
      // Guardar el ID del hogar en localStorage
      localStorage.setItem('currentHomeId', homeId);
      showNotification('¡Registro exitoso! ¡Bienvenido a CasitaFeliz!', 'success');
      
      // Redirigir al dashboard
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    })
    .catch((error) => {
      console.error("Error en registro:", error);
      let errorMessage = 'Error al crear cuenta';
      
      switch(error.code) {
        case 'auth/email-already-in-use':
          errorMessage = 'Este correo ya está registrado';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Correo electrónico inválido';
          break;
        case 'auth/weak-password':
          errorMessage = 'La contraseña es demasiado débil';
          break;
      }
      
      showNotification(errorMessage, 'error');
      throw error;
    });
}

// Iniciar sesión
function loginUser(email, password) {
  return firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      // Buscar el hogar del usuario
      return getUserHomes(userCredential.user.uid);
    })
    .then((homes) => {
      if (homes.length > 0) {
        // Guardar el ID del primer hogar en localStorage
        localStorage.setItem('currentHomeId', homes[0].id);
      }
      
      showNotification('¡Inicio de sesión exitoso!', 'success');
      
      // Redirigir al dashboard
      setTimeout(() => {
        window.location.href = 'index.html';
      }, 1000);
    })
    .catch((error) => {
      console.error("Error en login:", error);
      let errorMessage = 'Error al iniciar sesión';
      
      switch(error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Usuario no encontrado';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Contraseña incorrecta';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Correo electrónico inválido';
          break;
      }
      
      showNotification(errorMessage, 'error');
      throw error;
    });
}

// Cerrar sesión
function logoutUser() {
  return firebase.auth().signOut()
    .then(() => {
      // Limpiar datos locales
      localStorage.removeItem('currentHomeId');
      showNotification('Sesión cerrada', 'info');
      
      // Redirigir al login
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 1000);
    })
    .catch((error) => {
      console.error("Error al cerrar sesión:", error);
      showNotification('Error al cerrar sesión', 'error');
      throw error;
    });
}

// Crear un nuevo hogar
function createNewHome(userId, homeName) {
  return db.collection('homes').add({
    name: homeName,
    members: [userId],
    createdBy: userId,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  })
  .then((docRef) => {
    return docRef.id;
  })
  .catch((error) => {
    console.error("Error al crear hogar:", error);
    showNotification('Error al crear hogar', 'error');
    throw error;
  });
}

// Obtener los hogares de un usuario
function getUserHomes(userId) {
  return db.collection('homes')
    .where('members', 'array-contains', userId)
    .get()
    .then((snapshot) => {
      const homes = [];
      snapshot.forEach((doc) => {
        homes.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return homes;
    })
    .catch((error) => {
      console.error("Error al obtener hogares:", error);
      showNotification('Error al cargar los hogares', 'error');
      throw error;
    });
}

// Unirse a un hogar existente
function joinHome(homeId, userId) {
  return db.collection('homes').doc(homeId).update({
    members: firebase.firestore.FieldValue.arrayUnion(userId)
  })
  .then(() => {
    localStorage.setItem('currentHomeId', homeId);
    showNotification('Te has unido al hogar correctamente', 'success');
    
    // Redirigir al dashboard
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1000);
  })
  .catch((error) => {
    console.error("Error al unirse al hogar:", error);
    showNotification('Error al unirse al hogar', 'error');
    throw error;
  });
}

// Obtener datos del perfil de usuario
function getUserProfile(userId) {
  return db.collection('users').doc(userId).get()
    .then((doc) => {
      if (doc.exists) {
        return {
          id: doc.id,
          ...doc.data()
        };
      } else {
        // Si no existe el documento, crear uno nuevo con datos básicos
        const user = firebase.auth().currentUser;
        const newProfile = {
          displayName: user.displayName || 'Usuario',
          email: user.email,
          avatar: 'default',
          color: '#ff6b9d',
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };
        
        return db.collection('users').doc(userId).set(newProfile)
          .then(() => {
            return {
              id: userId,
              ...newProfile
            };
          });
      }
    })
    .catch((error) => {
      console.error("Error al obtener perfil:", error);
      showNotification('Error al cargar el perfil', 'error');
      throw error;
    });
}

// Actualizar perfil de usuario
function updateUserProfile(userId, profileData) {
  return db.collection('users').doc(userId).update(profileData)
    .then(() => {
      // Actualizar displayName en Auth si se proporciona
      if (profileData.displayName) {
        return firebase.auth().currentUser.updateProfile({
          displayName: profileData.displayName
        });
      }
    })
    .then(() => {
      showNotification('Perfil actualizado correctamente', 'success');
      updateUserMenu();
    })
    .catch((error) => {
      console.error("Error al actualizar perfil:", error);
      showNotification('Error al actualizar el perfil', 'error');
      throw error;
    });
}