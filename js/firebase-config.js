// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyAksXP3oRhnXKvp5TlugqsS8G_cLAcCJ0Q",
  authDomain: "casita-feliz-636c9.firebaseapp.com",
  projectId: "casita-feliz-636c9",
  storageBucket: "casita-feliz-636c9.firebasestorage.app",
  messagingSenderId: "662621506",
  appId: "1:662621506:web:5a7048e848badb06a10cdb",
  measurementId: "G-KR1NCVT4W7"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Referencias globales a servicios de Firebase
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();