# Zoods Room Multiplayer - System Overview

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                       GitHub Pages (Static)                      │
│                    (Your deployed website)                       │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       │ HTTPS Requests
                       ▼
        ┌──────────────────────────────┐
        │      index.html              │
        │  (Main entry page)           │
        │  Shows "Enter Lobby" button  │
        └──────────────┬───────────────┘
                       │
                       │ Click "Enter Lobby"
                       ▼
        ┌──────────────────────────────────────────┐
        │          lobby.html                      │
        │    (Multiplayer Lobby Hub)               │
        │  ┌────────────────────────────────────┐  │
        │  │ Create/Join/Find Matches           │  │
        │  │ Add Bots                           │  │
        │  │ Show Player List                   │  │
        │  └────────────────────────────────────┘  │
        └──────────────┬───────────────────────────┘
                       │
                       │ User clicks "Start Game"
                       ▼
        ┌─────────────────────────────────────────┐
        │  ShuttheBox-Multiplayer.html            │
        │  (or other game HTML files)             │
        │  ┌───────────────────────────────────┐  │
        │  │ Dice Rolling                      │  │
        │  │ Tile Selection                    │  │
        │  │ Score Calculation                 │  │
        │  │ All synced to Firebase            │  │
        │  └───────────────────────────────────┘  │
        └──────────────┬───────────────────────────┘
                       │
                       │ Game Syncing
                       │
                       ▼
        ┌─────────────────────────────────────────┐
        │     js/firebaseConfig.js (Library)      │
        │  - initializeFirebase()                 │
        │  - createLobby()                        │
        │  - joinLobby()                          │
        │  - syncGameMove()                       │
        │  - onLobbyUpdate() (Real-time listen)   │
        └──────────────┬───────────────────────────┘
                       │
                       │ Firebase SDK (CDN)
                       │ https://gstatic.com/firebasejs/
                       │
                       ▼
        ╔═════════════════════════════════════════╗
        ║   FIREBASE REALTIME DATABASE (Cloud)    ║
        ║  zoodsroom-default-rtdb.firebaseio.com  ║
        ║                                          ║
        ║  /lobbies/{lobbyId}                     ║
        ║    - id, key, currentGame               ║
        ║    - players: {uuid → playerData}       ║
        ║    - matchState: {lastMove, gameState}  ║
        ║                                          ║
        ║  /lobbies/{lobbyId2}                    ║
        ║  /lobbies/{lobbyId3}                    ║
        ║  ... (multiple concurrent lobbies)      ║
        ╚═════════════════════════════════════════╝
```

## Player Flow Diagram

```
Player A (Browser 1)              Player B (Browser 2)
     │                                   │
     ├─ Opens lobby.html                 │
     │                                   │
     ├─ Creates Private Match ─┐         │
     │  Gets key: "ABC123"     │         │
     │                         │         │
     │                         └─→ Firebase Stores:
     │                             lobbyId: xyz
     │                             key: "ABC123"
     │                             players: {A}
     │                             currentGame: "ShuttheBox"
     │                         
     │                         ← Player B opens lobby.html
     │                         ← Enters key "ABC123"
     │                         ← Joins lobby
     │
     ├──→ Firebase Updates ←──┤
     │   players: {A, B}      │
     │
     ├─ Sees Player B join ←──┤
     │  (real-time update)    │
     │                         ├─ Sees Player A's match
     │                         │  (real-time update)
     │                         │
     ├─ Clicks "Start Game" ──→ Firebase Updates
     │                         │   currentGame: "ShuttheBox"
     │                         │
     │ → Opens ShuttheBox-Multiplayer.html?lobbyId=xyz
     │                         
     │                         ← Opens ShuttheBox-Multiplayer.html?lobbyId=xyz
     │
     ├─ Rolls Dice (5, 3) ────→ Firebase Sync
     │  Dice Sum: 8            │  lastMove: {playerId: A, d1: 5, d2: 3}
     │
     │ ← Firebase Update ← ── ┤ Sees dice roll
     │   Sees Player B's rolls │
     │                         │
     ├─ Closes 2 tiles ───────→ Firebase Sync
     │  Score: 23              │  matchState: {shutTiles: [...]}
     │
     │ ← Firebase Update ← ── ┤ Sees score update
     │   Player B score: 23    │
     │
     └─ Return to Lobby ← ──→ Firebase Cleanup
        Click "Return"         Remove from players
        Leaves lobby
```

## Data Flow: Multiplayer Game State

```
Player 1 Browser                    Player 2 Browser
    │                                    │
    ├─ Roll Dice ──────┐                 │
    │  d1=4, d2=3      │                 │
    │                  │                 │
    │                  └─→ syncGameMove({
    │                       type: 'dice_roll',
    │                       d1: 4,
    │                       d2: 3,
    │                       sum: 7
    │                     })
    │                  │
    │                  └─→ Firebase Database Update
    │                       /lobbies/{id}/matchState/lastMove
    │                  │
    │                  ├─→ onLobbyUpdate() Listener (Real-time)
    │                  │                        │
    │    ┌─────────────┴────────────────────────┤
    │    │                                      │
    ▼    ▼                                      ▼
  Player 1                                   Player 2
  Updates UI:                                Updates UI:
  - Dice animation                          - Sees dice roll
  - Dice sum shows 7                        - Dice sum shows 7
  - Tiles still available                   - Tiles available
  - Ready to select                         - Watches Player 1
    │
    ├─ Select Tiles ──────┐
    │  2 + 5 = 7          │
    │  (matches sum)      │
    │                     └─→ syncGameMove({
    │                          type: 'tiles_shut',
    │                          shutTiles: [2, 5, ...],
    │                          score: 18
    │                        })
    │                     │
    │                     └─→ Firebase Update
    │                          /lobbies/{id}/matchState
    │                          /lobbies/{id}/players/P1/score = 18
    │                     │
    │    ┌────────────────┴────────────────────┤
    │    │                                     │
    ▼    ▼                                     ▼
 Player 1                               Player 2
 Updates UI:                            Updates UI:
 - Tiles 2,5 marked "shut"            - Sees tiles shut
 - Score updates to 18                - Sees Player 1 score: 18
 - Ready to roll again                - Waiting for next action
```

## File Dependencies

```
index.html
  └─ links to lobby.html

lobby.html
  ├─ includes Firebase SDK (CDN)
  ├─ includes js/firebaseConfig.js
  └─ links to:
      ├─ games/dice/ShuttheBox-Multiplayer.html
      ├─ games/card/Bullshit.html (future)
      ├─ games/card/UnoGarbage.html (future)
      └─ etc.

ShuttheBox-Multiplayer.html
  ├─ includes Firebase SDK (CDN)
  └─ includes js/firebaseConfig.js

js/firebaseConfig.js
  └─ uses Firebase SDK functions
      ├─ firebase.auth()
      ├─ firebase.database()
      └─ firebase.initializeApp()
```

## Real-Time Sync Example: Turn 1

**Timeline:**
```
T+0ms    Player A rolls dice (5,2) on their browser
T+100ms  syncGameMove() sends update
T+150ms  Firebase Realtime Database updated
T+200ms  Player B's onLobbyUpdate() listener fires
T+210ms  Player B's UI updates to show dice (5,2)

Note: Entire process takes ~200ms (human imperceptible)
```

## Lobby State JSON Example

```json
{
  "id": "lobby-1739046282-a1b2c",
  "key": "ABC123",
  "isPrivate": true,
  "currentGame": "ShuttheBox",
  "createdAt": 1739046282000,
  "createdBy": "player-xyz789def",
  
  "players": {
    "player-xyz789def": {
      "uuid": "player-xyz789def",
      "name": "Player",
      "isBot": false,
      "score": 23,
      "joinedAt": 1739046290000,
      "status": "playing"
    },
    "player-abc123456": {
      "uuid": "player-abc123456",
      "name": "Player",
      "isBot": false,
      "score": 18,
      "joinedAt": 1739046310000,
      "status": "playing"
    },
    "bot-lucky987": {
      "uuid": "bot-lucky987",
      "name": "Lucky",
      "isBot": true,
      "score": 15,
      "joinedAt": 1739046320000,
      "status": "playing"
    }
  },
  
  "matchState": {
    "status": "playing",
    "lastMove": {
      "playerId": "player-xyz789def",
      "moveData": {
        "type": "tiles_shut",
        "shutTiles": [2, 5, 1, 3],
        "score": 23
      },
      "timestamp": 1739046350000
    },
    "gameState": {}
  }
}
```

## Technology Stack

```
Frontend Layer (GitHub Pages)
├─ HTML5 (Structure)
├─ CSS3 (Styling, animations)
├─ JavaScript ES6+ (Game logic)
└─ Firebase SDK (Client-side)

Real-Time Sync Layer (Firebase)
├─ WebSocket connections
├─ JSON data format
└─ Automatic synchronization

Backend Layer (Firebase-managed)
├─ Realtime Database (NoSQL)
├─ Anonymous Authentication
└─ Cloud Functions (optional)

Hosting
└─ GitHub Pages (Free, Static)
```

## Scalability

**Free Firebase Tier Supports:**
- ✅ 100+ concurrent connections
- ✅ 1 GB total storage
- ✅ 10 GB/month bandwidth
- ✅ Unlimited reads/writes

**Real-World Numbers:**
- ~1-5 lobbies per connection (4-5 players each)
- ~50 concurrent lobbies = 200-250 players possible
- Each move = ~1 database write (small)
- Estimated: 100+ concurrent players on free tier

**Limitations:**
- No querying (can't search all lobbies easily)
- No complex filtering
- Security rules require manual setup

## Game Switching Flow

```
In Lobby (firebase/realtime-sync)
         │
         ├─ Choose ShuttheBox
         │                 │
         └─→ Open ShuttheBox-Multiplayer.html?lobbyId=xyz
             │
             ├─ Load game
             ├─ Connect to Firebase
             ├─ Show player list
             └─ Play synchronized game
                     │
                     ├─ Finish round
                     │
                     └─ Return to Lobby
                        (via "← Lobby" button)
                             │
                             └─→ Firebase cleans up game state
                                 Lobby resets for next game
```

## Security Model (Current)

```
Firebase Test Mode (Development)
├─ Anonymous auth (no password needed)
├─ Anyone can read all lobby data
├─ Anyone can modify any lobby
└─ ✅ Perfect for friends-only
    ⚠️ Not suitable for public leaderboards

Firebase Locked Mode (Production)
├─ Authentication required
├─ Specific read/write rules
├─ Prevents unauthorized access
└─ ✅ Recommended before public launch
```

---

**Total Implementation:**
- 💾 ~2000 lines of code (Firebase config + Lobby + Example game)
- 📚 3 comprehensive guides
- ✅ Ready to test and deploy
- 🚀 Scales to friend groups
- 💰 Completely free

**Next Step:** Follow QUICK_START.md to get Firebase running!
