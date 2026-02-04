# Firebase Setup Guide for Zoods Room Multiplayer

## Overview
This guide walks you through setting up Firebase Realtime Database for the multiplayer lobby system. Firebase provides free real-time synchronization for player lobbies, games, and state updates.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** (or sign in first if needed)
3. Enter project name: `ZoodsRoom` (or your choice)
4. Disable Google Analytics (optional)
5. Click **"Create project"**
6. Wait for project creation to complete

## Step 2: Create a Realtime Database

1. In Firebase Console, go to **"Build"** → **"Realtime Database"**
2. Click **"Create Database"**
3. Choose region (closest to you for lower latency)
4. Start in **"Test mode"** (allows reads/writes without authentication for development)
   - ⚠️ Later: Switch to **"Locked mode"** with proper security rules for production
5. Click **"Enable"**

## Step 3: Enable Anonymous Authentication

1. Go to **"Build"** → **"Authentication"**
2. Click **"Get Started"**
3. Click **"Anonymous"** provider
4. Toggle **"Enable"**
5. Click **"Save"**

## Step 4: Get Your Firebase Configuration

1. In Firebase Console, click the **Settings gear icon** → **"Project settings"**
2. Scroll to **"Your apps"** section
3. Click the **"Web"** icon (looks like `</>`), or click **"Add app"** if no apps exist
4. Copy the `firebaseConfig` object (includes `apiKey`, `projectId`, `databaseURL`, etc.)

Example:
```javascript
const firebaseConfig = {
    apiKey: "AIzaSyDemoKey...",
    authDomain: "zoodsroom.firebaseapp.com",
    databaseURL: "https://zoodsroom-default-rtdb.firebaseio.com",
    projectId: "zoodsroom",
    storageBucket: "zoodsroom.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcd1234efgh5678"
};
```

## Step 5: Update `js/firebaseConfig.js`

1. Open `/workspaces/Zoods-Room/js/firebaseConfig.js`
2. Replace the placeholder `firebaseConfig` object with your actual config from Step 4:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_ACTUAL_API_KEY",
    authDomain: "YOUR_ACTUAL_AUTH_DOMAIN",
    databaseURL: "YOUR_ACTUAL_DATABASE_URL",
    projectId: "YOUR_ACTUAL_PROJECT_ID",
    storageBucket: "YOUR_ACTUAL_STORAGE_BUCKET",
    messagingSenderId: "YOUR_ACTUAL_MESSAGING_ID",
    appId: "YOUR_ACTUAL_APP_ID"
};
```

## Step 6: Test Your Setup Locally

1. Open your local development server (e.g., `http://localhost:8000`)
2. Navigate to `lobby.html`
3. Click **"Create Private Match"**
4. Select a game from the dropdown
5. You should see:
   - A private match key generated (e.g., `ABC123`)
   - Your player listed in the lobby
   - Real-time updates when you add bots

If you see errors in the browser console, check:
- Firebase SDK loaded (check Network tab)
- Config values are correct (no typos)
- Realtime Database and Anonymous Auth are enabled

## Step 7: Deploy to GitHub Pages

1. Commit your changes:
   ```bash
   git add .
   git commit -m "Add multiplayer lobby system with Firebase"
   git push
   ```

2. GitHub Pages automatically deploys from your `main` branch
3. Access your site at `https://YOUR_USERNAME.github.io/Zoods-Room/`
4. Test multiplayer from two different browsers/devices

## Step 8: Security Rules (Important for Production)

⚠️ **Test mode allows anyone to read/write all data.** Before going public, add security rules:

1. In Firebase Console, go to **"Realtime Database"** → **"Rules"** tab
2. Replace default rules with:

```json
{
  "rules": {
    "lobbies": {
      "$lobbyId": {
        ".read": true,
        ".write": true,
        "players": {
          "$playerId": {
            ".validate": "newData.hasChildren(['uuid', 'name', 'isBot', 'score', 'joinedAt'])"
          }
        }
      }
    }
  }
}
```

3. Click **"Publish"**

This allows:
- Anyone to read/write lobbies (fine for friends)
- Prevents malformed data structure
- Later: Add authentication checks for production

## Troubleshooting

**"Firebase SDK not loaded"**
- Check browser console (F12 → Console)
- Verify CDN scripts load in Network tab
- Ensure internet connection works

**"CORS Error"**
- Firebase handles CORS automatically
- If persists, check firebaseConfig domain matches your hosting domain

**"Database permission denied"**
- Verify Realtime Database is in Test mode
- Check Anonymous Auth is enabled
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)

**Lobby data not syncing**
- Check Firebase Console → "Database" → see if data appears in real-time
- Verify `firebaseConfig.databaseURL` is correct
- Check browser console for error messages

## Next Steps

1. **Test with a friend**: Share your deployed URL, both join the same lobby key
2. **Add more games**: Use `ShuttheBox-Multiplayer.html` as a template
3. **Add leaderboards**: Store match results in Firebase
4. **Mobile optimization**: Test on phone screens
5. **Add chat**: Real-time messaging while in lobby

## Firebase Console Monitoring

- Monitor active lobbies: **"Realtime Database"** → Data tab
- View authentication: **"Authentication"** → Users tab
- Check usage: **"Firestore"** → Usage tab (free tier included)

---

**Questions?** Check [Firebase Realtime Database docs](https://firebase.google.com/docs/database).
