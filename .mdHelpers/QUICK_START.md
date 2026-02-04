# Multiplayer Quick Start Checklist

## 🚀 Get Running in 15 Minutes

### Phase 1: Firebase Setup (5 min)

- [ ] Visit [Firebase Console](https://console.firebase.google.com/)
- [ ] Create new project named `ZoodsRoom`
- [ ] Create Realtime Database (Test mode)
- [ ] Enable Anonymous Authentication
- [ ] Copy Firebase config from Project Settings
- [ ] Open `js/firebaseConfig.js`
- [ ] Replace placeholder config with your credentials
- [ ] Save and commit changes

### Phase 2: Test Locally (5 min)

- [ ] Open terminal in project folder
- [ ] Run: `python -m http.server 8000`
- [ ] Open: `http://localhost:8000/lobby.html`
- [ ] Click **"Create Private Match"**
- [ ] Select any game
- [ ] See lobby key appear (e.g., `ABC123`)
- [ ] View yourself in player list

### Phase 3: Deploy (3 min)

- [ ] Terminal: `git add .`
- [ ] Terminal: `git commit -m "Add multiplayer"`
- [ ] Terminal: `git push`
- [ ] Wait 30 seconds
- [ ] Visit: `https://YOUR_USERNAME.github.io/Zoods-Room/lobby.html`

### Phase 4: Test with Friend (2 min)

- [ ] Create a private match with a game
- [ ] Copy the lobby key
- [ ] Send URL + key to friend
- [ ] Friend opens same URL
- [ ] Friend enters your lobby key
- [ ] Both see each other in player list
- [ ] Click **"Start Game"** together

---

## 📋 Reference: New Files

| File | Purpose | Edit? |
|------|---------|-------|
| `js/firebaseConfig.js` | Firebase utilities | ✏️ **UPDATE** with credentials |
| `lobby.html` | Main lobby UI | ✅ Ready to use |
| `games/dice/ShuttheBox-Multiplayer.html` | Example multiplayer game | 🔍 Reference template |
| `FIREBASE_SETUP.md` | Detailed setup guide | 📖 Read if stuck |
| `MULTIPLAYER_IMPLEMENTATION.md` | Full documentation | 📖 Reference |

---

## 🎮 Testing Scenarios

### Scenario 1: Solo + Bot
1. Create private match
2. Add bot by clicking **"Add Bot"**
3. Start game
4. You vs AI

### Scenario 2: Public Matchmaking
1. Create public match
2. Share link with friend
3. Both click **"Find Public Match"**
4. System matches you together

### Scenario 3: Private Key Join
1. You create private match → get key `ABC123`
2. Friend clicks **"Join by Key"**
3. Friend enters `ABC123`
4. Both in same lobby

---

## ✅ Firebase Verification Checklist

After Firebase setup, verify:

- [ ] Realtime Database shows in Firebase Console
- [ ] Anonymous Authentication shows 1 provider enabled
- [ ] Can see database URL in config (ends with `.firebaseio.com`)
- [ ] `firebaseConfig.js` updated with real values
- [ ] No placeholder values like "Demo" or "Placeholder" remain
- [ ] Browser console (F12) shows no "Firebase SDK not loaded" error

---

## 🛠️ Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| "Firebase SDK not loaded" | Hard refresh (Ctrl+Shift+R), check internet |
| "No players showing" | Check Firebase Console → Database has data |
| "Lobby key doesn't work" | Verify exact spelling/case, recreate key |
| "GitHub Pages 404" | Wait 60 sec, hard refresh, check branch is `main` |
| "Teammate can't join" | Both must be on same URL, check key copied exactly |

---

## 📱 Future: Add More Games

Once lobby is working, add other games:

1. Copy `games/dice/ShuttheBox-Multiplayer.html`
2. Rename and modify game logic
3. Update game map in `lobby.html`
4. Test locally then deploy

---

## 💡 Pro Tips

✅ **Test on phone**: Open same URL on phone + laptop to simulate friend  
✅ **Keep browser dev tools open** (F12) while testing for errors  
✅ **Check Firebase Console's Database tab** to see real-time data  
✅ **Bots have instant moves** - feel free to play against them  
✅ **Lobby persists 30 min** - can switch games mid-session  

---

## 🎯 Success Criteria

You're done when:

- ✅ Can create a private match and get shareable key
- ✅ Can see yourself in the player list
- ✅ Can add a bot and see it update
- ✅ Can switch between games while in lobby
- ✅ Deployed and friend can join your key
- ✅ Both see real-time score updates while playing

**Estimated time: 20-30 minutes first time, 5 min on repeat**

---

## 📞 Need Help?

1. **Read FIREBASE_SETUP.md** for detailed steps
2. **Check browser console** (F12 → Console) for error messages
3. **Verify Firebase config** matches your project settings
4. **Test with bot first** before inviting friend

---

**Ready? Start with Phase 1 above!** 🚀
