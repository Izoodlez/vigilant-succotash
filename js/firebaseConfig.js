// Firebase Configuration & Multiplayer Utilities
// Initialize Firebase (you'll need to get these values from Firebase Console)

  const firebaseConfig = {
    apiKey: "AIzaSyDbeF4kSs5OzcWURlY-UEIXQjIcF39Pw4g",
    authDomain: "zoodsroom.firebaseapp.com",
    databaseURL: "https://zoodsroom-default-rtdb.firebaseio.com",
    projectId: "zoodsroom",
    storageBucket: "zoodsroom.firebasestorage.app",
    messagingSenderId: "10996529836",
    appId: "1:10996529836:web:09e5480d22d7c181383d09",
    measurementId: "G-J18VPTZ28D"
  };

let db = null;
let auth = null;
let currentUser = null;
let playerUUID = null;

// Use window global for currentLobbyId to share across scripts
if (typeof window !== 'undefined' && typeof window.currentLobbyId === 'undefined') {
  window.currentLobbyId = null;
}

// Initialize Firebase (called after Firebase SDK is loaded)
function initializeFirebase() {
  try {
    if (typeof window.firebase === 'undefined') {
      console.error('window.firebase is undefined — wrong SDK loaded');
      return false;
    }
    // Avoid re-init if already initialized
    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(firebaseConfig);
    }
    // set services
    auth = firebase.auth();
    db = firebase.database();
    // anonymous sign-in (returns promise but we handle sync-friendly)
    auth.signInAnonymously().then((cred) => {
      currentUser = cred.user;
      // Persist a simple UUID for this browser session if not present
      playerUUID = sessionStorage.getItem('playerUUID') || generateUUID();
      sessionStorage.setItem('playerUUID', playerUUID);
      console.log('Firebase auth OK, uid:', currentUser ? currentUser.uid : 'anon', 'playerUUID:', playerUUID);
    }).catch((err) => {
      console.warn('Anonymous sign-in failed:', err);
    });
    return true;
  } catch (e) {
    console.error('initializeFirebase exception', e);
    return false;
  }
}

// Generate UUID for player (persists for this session)
function generateUUID() {
  // simple RFC4122 v4-ish
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
    return v.toString(16);
  });
}

// Generate a shareable lobby key (6 chars: A-Z0-9)
function generateLobbyKey() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let key = '';
  for (let i = 0; i < 6; i++) key += chars[Math.floor(Math.random() * chars.length)];
  return key;
}

// Create a new lobby
async function createLobby(gameType = 'unknown', isPrivate = true) {
  if (!db) throw new Error('Firebase not initialized');
  let lobbyKey = generateLobbyKey();

  // ensure uniqueness (retry a few times if collision)
  let attempts = 0;
  while (attempts < 6) {
    const snap = await db.ref('lobbies').orderByChild('key').equalTo(lobbyKey).once('value');
    if (!snap.exists()) break;
    lobbyKey = generateLobbyKey();
    attempts++;
  }

  const lobbyRef = db.ref('lobbies').push();
  const lobbyId = lobbyRef.key;
  const lobbyData = {
    key: lobbyKey,
    gameType: gameType || 'unknown',
    isPrivate: !!isPrivate,
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    players: {},
    state: {}
  };

  await lobbyRef.set(lobbyData);
  // return both so UI can display short key and also use lobbyId for joins
  return { lobbyId, lobbyKey };
}

// Join a lobby by ID or key
async function joinLobby(lobbyIdOrKey) {
  if (!db) throw new Error('Firebase not initialized');

  let lobbyId = null;

  // If looks like a short key (6 chars) try to resolve to lobbyId
  if (typeof lobbyIdOrKey === 'string' && lobbyIdOrKey.length === 6) {
    const snap = await db.ref('lobbies').orderByChild('key').equalTo(lobbyIdOrKey).once('value');
    if (!snap.exists()) throw new Error('Lobby key not found');
    snap.forEach(child => { lobbyId = child.key; }); // pick the first
  } else {
    lobbyId = lobbyIdOrKey;
  }

  if (!lobbyId) throw new Error('Invalid lobby identifier');

  const playerId = sessionStorage.getItem('playerUUID') || generateUUID();
  sessionStorage.setItem('playerUUID', playerId);

  const playerRef = db.ref(`lobbies/${lobbyId}/players/${playerId}`);
  await playerRef.set({
    id: playerId,
    joinedAt: firebase.database.ServerValue.TIMESTAMP,
    name: `Player-${playerId.slice(0,4)}`
  });

  window.currentLobbyId = lobbyId;
  sessionStorage.setItem('currentLobbyId', lobbyId);
  return lobbyId;
}

// Find a public lobby with waiting players (random matchmaking)
async function findPublicLobby(gameType) {
    if (!db) {
        console.error("Firebase not initialized");
        return null;
    }

    try {
        const snapshot = await db.ref('lobbies')
            .orderByChild('isPrivate')
            .equalTo(false)
            .limitToLast(50)
            .once('value');

        if (!snapshot.exists()) {
            console.log("No public lobbies found");
            return null;
        }

        // Find a lobby that's waiting and has room
        const lobbies = snapshot.val();
        for (const [lobbyId, lobbyData] of Object.entries(lobbies)) {
            if (lobbyData.currentGame === gameType && 
                lobbyData.matchState.status === 'waiting' &&
                Object.keys(lobbyData.players).length < 4) {
                
                // Join this lobby
                const result = await joinLobby(lobbyId);
                return result;
            }
        }

        // No suitable lobby found, create a new one
        console.log("No suitable lobby found, creating new public lobby");
        const newLobby = await createLobby(gameType, false);
        return newLobby;
    } catch (error) {
        console.error("Error finding public lobby:", error);
        return null;
    }
}

// Get current lobby state
async function getLobbyState(lobbyId = null) {
    if (!db) {
        console.error("Firebase not initialized");
        return null;
    }

    const id = lobbyId || window.currentLobbyId;
    if (!id) return null;

    try {
        const snapshot = await db.ref(`lobbies/${id}`).once('value');
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error("Error getting lobby state:", error);
        return null;
    }
}

// Listen for real-time lobby updates
function onLobbyUpdate(callback, lobbyId = null) {
    if (!db) {
        console.error("Firebase not initialized");
        return null;
    }

    const id = lobbyId || window.currentLobbyId;
    if (!id) return null;

    const ref = db.ref(`lobbies/${id}`);
    ref.on('value', snapshot => {
        if (snapshot.exists()) {
            callback(snapshot.val());
        }
    });

    return ref; // Return ref for cleanup
}

// Stop listening to lobby updates
function offLobbyUpdate(ref) {
    if (ref) {
        ref.off('value');
    }
}

// Update lobby game
async function switchGame(newGameType, lobbyId = null) {
    if (!db) {
        console.error("Firebase not initialized");
        return false;
    }

    const id = lobbyId || window.currentLobbyId;
    if (!id) return false;

    try {
        await db.ref(`lobbies/${id}/currentGame`).set(newGameType);
        console.log("Switched game to:", newGameType);
        return true;
    } catch (error) {
        console.error("Error switching game:", error);
        return false;
    }
}

// Add a bot to the lobby
async function addBotPlayer(botName = "Bot", lobbyId = null) {
    if (!db) {
        console.error("Firebase not initialized");
        return null;
    }

    const id = lobbyId || window.currentLobbyId;
    if (!id) return null;

    const botUUID = 'bot-' + Math.random().toString(36).substr(2, 9);

    try {
        await db.ref(`lobbies/${id}/players/${botUUID}`).set({
            uuid: botUUID,
            name: botName,
            joinedAt: Date.now(),
            isBot: true,
            score: 0,
            status: "lobby"
        });

        console.log("Bot added:", botName);
        return botUUID;
    } catch (error) {
        console.error("Error adding bot:", error);
        return null;
    }
}

// Update player score
async function updatePlayerScore(score, lobbyId = null) {
    if (!db) {
        console.error("Firebase not initialized");
        return false;
    }

    const id = lobbyId || window.currentLobbyId;
    if (!id) return false;

    try {
        await db.ref(`lobbies/${id}/players/${playerUUID}/score`).set(score);
        return true;
    } catch (error) {
        console.error("Error updating player score:", error);
        return false;
    }
}

// Update match state (game-specific state)
async function updateMatchState(newState, lobbyId = null) {
    if (!db) {
        console.error("Firebase not initialized");
        return false;
    }

    const id = lobbyId || window.currentLobbyId;
    if (!id) return false;

    try {
        await db.ref(`lobbies/${id}/matchState`).update(newState);
        return true;
    } catch (error) {
        console.error("Error updating match state:", error);
        return false;
    }
}

// Sync a game move to Firebase
async function syncGameMove(moveData, lobbyId = null) {
    if (!db) {
        console.error("Firebase not initialized");
        return false;
    }

    const id = lobbyId || window.currentLobbyId;
    if (!id) return false;

    try {
        const timestamp = Date.now();
        await db.ref(`lobbies/${id}/matchState/lastMove`).set({
            playerId: playerUUID,
            moveData: moveData,
            timestamp: timestamp
        });
        return true;
    } catch (error) {
        console.error("Error syncing move:", error);
        return false;
    }
}

// Leave lobby
async function leaveLobby(lobbyId = null) {
    if (!db) {
        console.error("Firebase not initialized");
        return false;
    }

    const id = lobbyId || window.currentLobbyId;
    if (!id) return false;

    try {
        await db.ref(`lobbies/${id}/players/${playerUUID}`).remove();
        window.currentLobbyId = null;
        sessionStorage.removeItem('currentLobbyId');
        console.log("Left lobby:", id);
        return true;
    } catch (error) {
        console.error("Error leaving lobby:", error);
        return false;
    }
}

// Check if player is in a lobby
function isInLobby() {
    return window.currentLobbyId !== null;
}

// Get current lobby ID
function getCurrentLobbyId() {
    return window.currentLobbyId || sessionStorage.getItem('currentLobbyId') || null;
}

// Get current player UUID
function getPlayerUUID() {
    return playerUUID || sessionStorage.getItem('playerUUID') || null;
}
