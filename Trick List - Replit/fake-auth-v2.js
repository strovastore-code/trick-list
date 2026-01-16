// Fake auth shim for local mirror: adds Sign In UI and intercepts fetch
// Version: 2025-12-30-v3 - All debug messages removed
// Suppress all console output to hide debug messages
(function() {
  // Disable all console methods - TEMPORARILY DISABLED FOR DEBUGGING
  const noop = () => {};
  // console.log = noop;
  // console.error = noop;
  // console.warn = noop;
  // console.info = noop;
  // console.debug = noop;
})();

(function(){
  const USER_KEY = 'tricklist_user';
  const LEARNED_KEY = 'tricklist_learned';
  const SCORES_KEY = 'tricklist_scores';
  const GOOGLE_USERS_KEY = 'tricklist_google_users';
  const OWNER_KEY = 'tricklist_owner_credentials';
  const RANDOM_HISTORY_KEY = 'tricklist_random_history';
  
  // Owner credentials - loaded from owner-config.js (gitignored)
  const OWNER_EMAIL = window.OWNER_EMAIL || 'owner@example.com';
  const OWNER_PASSWORD = window.OWNER_PASSWORD || 'change-me'; // Change this to your desired password
  
  function initOwnerAccount(){
    const accounts = getAccounts();
    const ownerEmailLower = OWNER_EMAIL.toLowerCase();
    if (!accounts[ownerEmailLower]) {
      accounts[ownerEmailLower] = OWNER_PASSWORD;
      saveAccounts(accounts);
    }
  }
  
  function isOwner(user){
    if (!user) return false;
    return (user.email && user.email.toLowerCase() === OWNER_EMAIL.toLowerCase()) || user.isOwner === true;
  }

  function getUser(){
    try { 
      const stored = localStorage.getItem(USER_KEY);
      const user = JSON.parse(stored || 'null');
      if (!user) return null;
      // Check if expired
      if (user.expiresAt && new Date().getTime() > user.expiresAt) {
        clearUser();
        return null;
      }
      return user;
    } catch(e){ return null }
  }

  // Persist the current user with an expiration and track recent accounts
  function setUser(u){
    // Expire in 30 days
    const expiresAt = Date.now() + (30 * 24 * 60 * 60 * 1000);
    u.expiresAt = expiresAt;
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    addToRecentAccounts(u.email);
  }

  function addToRecentAccounts(email) {
    try {
      const now = Date.now();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const lastClearStr = localStorage.getItem('tricklist_recent_accounts_last_clear');
      const lastClear = lastClearStr ? parseInt(lastClearStr) : 0;

      let recent = [];
      if (now - lastClear > thirtyDays) {
        localStorage.setItem('tricklist_recent_accounts_last_clear', String(now));
        localStorage.removeItem('tricklist_recent_accounts');
      } else {
        const recentStr = localStorage.getItem('tricklist_recent_accounts');
        recent = recentStr ? JSON.parse(recentStr) : [];
      }

      if (email && !recent.includes(email)) {
        recent.push(email);
      }
      if (recent.length > 5) {
        recent = recent.slice(-5);
      }
      localStorage.setItem('tricklist_recent_accounts', JSON.stringify(recent));
    } catch(e) {}
  }

  function clearUser(){
    try { localStorage.removeItem(USER_KEY); } catch(e) {}
  }

  // Learned tricks persistence
  function getLearned(){
    try { return JSON.parse(localStorage.getItem(LEARNED_KEY) || '[]'); } catch(e){ return [] }
  }
  function saveLearned(list){ localStorage.setItem(LEARNED_KEY, JSON.stringify(list)); }

  // Random trick history tracking (per session)
  function getRandomHistory(){
    try { return JSON.parse(sessionStorage.getItem(RANDOM_HISTORY_KEY) || '[]'); } catch(e){ return [] }
  }
  function saveRandomHistory(history){ sessionStorage.setItem(RANDOM_HISTORY_KEY, JSON.stringify(history)); }
  function addToRandomHistory(trickId){
    const history = getRandomHistory();
    if (!history.includes(trickId)) {
      history.push(trickId);
      saveRandomHistory(history);
    }
  }
  function clearRandomHistory(){ sessionStorage.removeItem(RANDOM_HISTORY_KEY); }

  // Trick scores
  function getScores(){
    try { return JSON.parse(localStorage.getItem(SCORES_KEY) || '{}'); } catch(e){ return {} }
  }
  function saveScores(scores){ localStorage.setItem(SCORES_KEY, JSON.stringify(scores)); }
  function getTotalScore(){
    const learned = getLearned();
    const scores = getScores();
    return learned.reduce((sum, id) => sum + (scores[id] || 0), 0);
  }

  const ACCOUNTS_KEY = 'tricklist_accounts';
  function getAccounts(){
    try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '{}'); } catch(e){ return {} }
  }
  function saveAccounts(accounts){ localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts)); }

  function createAccount(email, password){
    if (!email || !password) return { success: false, error: 'Email and password required' };
    const accounts = getAccounts();
    const emailLower = email.toLowerCase();
    if (accounts[emailLower]) return { success: false, error: 'Account already exists' };
    accounts[emailLower] = password;
    saveAccounts(accounts);
    return { success: true };
  }

  function validateLogin(email, password){
    const accounts = getAccounts();
    const emailLower = email.toLowerCase();
    if (accounts[emailLower] === password) return { success: true };
    return { success: false, error: 'Invalid email or password' };
  }

  function handleGoogleSignIn(){
    // Always recreate picker to show latest accounts
    let picker = document.getElementById('fake-google-picker');
    if (picker) {
      picker.remove();
    }
    
    picker = document.createElement('div');
    picker.id = 'fake-google-picker';
    picker.style.position = 'fixed';
    picker.style.top = '0';
    picker.style.left = '0';
    picker.style.width = '100%';
    picker.style.height = '100%';
    picker.style.background = 'rgba(0,0,0,0.8)';
    picker.style.display = 'flex';
    picker.style.alignItems = 'center';
    picker.style.justifyContent = 'center';
    picker.style.zIndex = '999999';
    
    const pickerBox = document.createElement('div');
    pickerBox.style.background = '#0a0f1a';
    pickerBox.style.borderRadius = '8px';
    pickerBox.style.padding = '30px';
    pickerBox.style.maxWidth = '350px';
    pickerBox.style.color = 'white';
    pickerBox.style.border = '1px solid rgba(255,255,255,0.1)';
    
    const title = document.createElement('h3');
    title.textContent = 'Select Account';
    title.style.marginTop = '0';
    title.style.marginBottom = '20px';
    title.style.textAlign = 'center';
    pickerBox.appendChild(title);
    
    // Get only accounts that the current user has previously signed into
    const recentAccountsStr = localStorage.getItem('tricklist_recent_accounts');
    const recentAccounts = recentAccountsStr ? JSON.parse(recentAccountsStr) : [];
    
    if (recentAccounts.length === 0) {
      const noAccounts = document.createElement('p');
      noAccounts.textContent = 'No previous sign-ins found.';
      noAccounts.style.textAlign = 'center';
      noAccounts.style.color = '#999';
      pickerBox.appendChild(noAccounts);
    } else {
      recentAccounts.forEach(email => {
        const accountBtn = document.createElement('button');
        accountBtn.style.width = '100%';
        accountBtn.style.padding = '12px';
        accountBtn.style.marginBottom = '10px';
        accountBtn.style.borderRadius = '4px';
        accountBtn.style.background = '#1a2538';
        accountBtn.style.border = '1px solid rgba(255,255,255,0.2)';
        accountBtn.style.color = 'white';
        accountBtn.style.cursor = 'pointer';
        accountBtn.style.textAlign = 'left';
        accountBtn.style.fontSize = '14px';
        
        accountBtn.innerHTML = '<strong>' + email.split('@')[0] + '</strong><br><small>' + email + '</small>';
        
        accountBtn.onmouseover = function() { this.style.background = '#2a3548'; };
        accountBtn.onmouseout = function() { this.style.background = '#1a2538'; };
        
        accountBtn.onclick = function(e) {
          e.preventDefault();
          
          // Ask for password before signing in
          const password = prompt('Enter password for ' + email + ':');
          if (!password) {
            picker.remove();
            return;
          }
          
          // Validate password
          const result = validateLogin(email, password);
          if (!result.success) {
            alert('Incorrect password');
            picker.remove();
            return;
          }
          
          // Sign in with selected account
          const newUser = {
            id: 'google_' + email.replace(/[^a-z0-9]/g, ''),
            name: email.split('@')[0],
            email: email,
            provider: 'google'
          };
          setUser(newUser);
          debug('Signed in with Google: ' + email);
          window.location.reload();
        };
        
        pickerBox.appendChild(accountBtn);
      });
    }
    
    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.width = '100%';
    cancelBtn.style.padding = '10px';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.background = '#444';
    cancelBtn.style.border = 'none';
    cancelBtn.style.color = 'white';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.style.marginTop = '10px';
    cancelBtn.onclick = function(e) {
      e.preventDefault();
      picker.style.display = 'none';
    };
    pickerBox.appendChild(cancelBtn);
    
    picker.appendChild(pickerBox);
    picker.onclick = function(e) {
      if (e.target === picker) {
        picker.style.display = 'none';
      }
    };
    document.body.appendChild(picker);
  }

  function handleGoogleCredential(response){
    try {
      // Decode the JWT (basic decode - doesn't verify signature for local use)
      const base64Url = response.credential.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const data = JSON.parse(jsonPayload);
      
      const newUser = {
        id: 'google_' + data.sub,
        name: data.name || data.email.split('@')[0],
        email: data.email,
        provider: 'google',
        picture: data.picture
      };
      
      setUser(newUser);
      debug('Signed in with Google: ' + data.email);
      window.location.reload();
    } catch(e) {
      debug('Error processing Google credential: ' + e.message);
      alert('Sign-in failed. Make sure localhost:8001 is authorized in Google Cloud Console.');
    }
  }

  // Helpers to create a popup anchored to an existing login button
  function ensurePopupForButton(anchor){
    let popup = document.getElementById('fake-auth-popup');
    if (!popup){
      popup = document.createElement('div');
      popup.id = 'fake-auth-popup';
      popup.style.position = 'absolute';
      popup.style.minWidth = '200px';
      popup.style.zIndex = 1000000;
      popup.style.background = '#0f1724';
      popup.style.color = 'white';
      popup.style.border = '1px solid rgba(255,255,255,0.06)';
      popup.style.padding = '8px';
      popup.style.borderRadius = '8px';
      popup.style.boxShadow = '0 6px 24px rgba(0,0,0,0.6)';
      document.body.appendChild(popup);
    }
    positionPopup(anchor, popup);
    return popup;
  }

  // Debug panel completely disabled
  function ensureDebugPanel(){
    return null;
  }

  function debug(msg){
    // Disabled
  }

  function positionPopup(anchor, popup){
    const rect = anchor.getBoundingClientRect();
    const top = window.scrollY + rect.bottom + 8;
    const left = window.scrollX + rect.left - 80; // Move more to the left
    popup.style.top = top + 'px';
    popup.style.left = left + 'px';
  }

  function closeAuthPopup(){
    const p = document.getElementById('fake-auth-popup');
    if (p) {
      p.style.display = 'none';
      p.style.visibility = 'hidden';
      p.style.pointerEvents = 'none';
    }
  }

  function toggleAuthPopup(anchor){
    debug('toggleAuthPopup called');
    const p = document.getElementById('fake-auth-popup') || ensurePopupForButton(anchor);
    if (p.style.display === 'block') { p.style.display = 'none'; return; }
    p.style.display = 'block';
    p.innerHTML = '';
    
    const user = getUser();
    
    // If already signed in, show sign out button
    if (user) {
      const userInfo = document.createElement('div');
      userInfo.style.padding = '8px';
      userInfo.style.marginBottom = '8px';
      userInfo.style.fontSize = '12px';
      userInfo.style.borderBottom = '1px solid rgba(255,255,255,0.1)';
      userInfo.textContent = 'Signed in as: ' + user.email;
      p.appendChild(userInfo);
      
      const signOutBtn = document.createElement('button');
      signOutBtn.textContent = 'Sign Out';
      signOutBtn.style.width = '100%';
      signOutBtn.style.padding = '8px';
      signOutBtn.style.borderRadius = '4px';
      signOutBtn.style.background = '#ff4444';
      signOutBtn.style.color = 'white';
      signOutBtn.style.border = 'none';
      signOutBtn.style.cursor = 'pointer';
      signOutBtn.style.fontWeight = 'bold';
      signOutBtn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        clearUser();
        debug('Signed out');
        // Reload the page
        window.location.reload();
        return false;
      };
      p.appendChild(signOutBtn);
      positionPopup(anchor, p);
      return;
    }
    
    // Create a container for mode switching
    let isSignUp = false;
    
    function renderForm() {
      p.innerHTML = '';
      
      const form = document.createElement('form');
      form.style.display = 'flex';
      form.style.flexDirection = 'column';
      form.style.gap = '8px';
      
      const title = document.createElement('div');
      title.textContent = isSignUp ? 'Create Account' : 'Sign In';
      title.style.fontWeight = 'bold';
      title.style.marginBottom = '8px';
      form.appendChild(title);
      
      const emailLabel = document.createElement('label');
      emailLabel.textContent = 'Email:';
      emailLabel.style.fontSize = '12px';
      form.appendChild(emailLabel);
      
      const emailInput = document.createElement('input');
      emailInput.type = 'email';
      emailInput.placeholder = 'your@email.com';
      emailInput.style.padding = '6px';
      emailInput.style.borderRadius = '4px';
      emailInput.style.border = '1px solid rgba(255,255,255,0.2)';
      emailInput.style.background = '#0a0f1a';
      emailInput.style.color = 'white';
      form.appendChild(emailInput);
      
      const passwordLabel = document.createElement('label');
      passwordLabel.textContent = 'Password:';
      passwordLabel.style.fontSize = '12px';
      passwordLabel.style.marginTop = '4px';
      form.appendChild(passwordLabel);
      
      const passwordInput = document.createElement('input');
      passwordInput.type = 'password';
      passwordInput.placeholder = 'password';
      passwordInput.style.padding = '6px';
      passwordInput.style.borderRadius = '4px';
      passwordInput.style.border = '1px solid rgba(255,255,255,0.2)';
      passwordInput.style.background = '#0a0f1a';
      passwordInput.style.color = 'white';
      form.appendChild(passwordInput);
      
      const msgDiv = document.createElement('div');
      msgDiv.style.fontSize = '11px';
      msgDiv.style.minHeight = '14px';
      msgDiv.style.color = '#ff8888';
      form.appendChild(msgDiv);
      
      const submitBtn = document.createElement('button');
      submitBtn.textContent = isSignUp ? 'Create Account' : 'Sign In';
      submitBtn.type = 'submit';
      submitBtn.style.padding = '8px';
      submitBtn.style.borderRadius = '4px';
      submitBtn.style.background = '#00f5ff';
      submitBtn.style.color = '#000';
      submitBtn.style.border = 'none';
      submitBtn.style.cursor = 'pointer';
      submitBtn.style.fontWeight = 'bold';
      submitBtn.style.marginTop = '8px';
      form.appendChild(submitBtn);
      
      const toggleDiv = document.createElement('div');
      toggleDiv.style.fontSize = '11px';
      toggleDiv.style.marginTop = '8px';
      toggleDiv.style.borderTop = '1px solid rgba(255,255,255,0.1)';
      toggleDiv.style.paddingTop = '8px';
      toggleDiv.style.textAlign = 'center';
      
      const toggleText = document.createElement('span');
      toggleText.textContent = isSignUp ? 'Already have an account? ' : "Don't have an account? ";
      toggleDiv.appendChild(toggleText);
      
      const toggleLink = document.createElement('a');
      toggleLink.textContent = isSignUp ? 'Sign In' : 'Create Account';
      toggleLink.style.color = '#00f5ff';
      toggleLink.style.cursor = 'pointer';
      toggleLink.style.textDecoration = 'underline';
      toggleLink.onclick = function(e) {
        e.preventDefault();
        isSignUp = !isSignUp;
        renderForm();
      };
      toggleDiv.appendChild(toggleLink);
      form.appendChild(toggleDiv);
      
      form.onsubmit = function(e) {
        e.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();
        
        if (!email || !password) {
          msgDiv.textContent = 'Please enter email and password';
          return;
        }
        
        if (isSignUp) {
          const result = createAccount(email, password);
          if (!result.success) {
            msgDiv.textContent = result.error;
            return;
          }
        } else {
          const result = validateLogin(email, password);
          if (!result.success) {
            msgDiv.textContent = result.error;
            return;
          }
        }
        
        const newUser = { 
          id: 'user_' + email.replace(/[^a-z0-9]/g, ''),
          name: email.split('@')[0],
          email: email,
          isOwner: email === OWNER_EMAIL
        };
        setUser(newUser);
        debug((isSignUp ? 'Account created and signed in: ' : 'Signed in as: ') + email);
        window.location.reload();
      };
      
      p.appendChild(form);
      positionPopup(anchor, p);
    }
    
    renderForm();
  }

  // Open full-page auth modal
  function openAuthModal(){
    ensureGoogleContainer();
    // Prevent re-opening if already open (even before DOM append)
    if (window.authModalOpen) return;
    window.authModalOpen = true;
    
    // Remove any existing stale modal (if not marked open)
    let oldModal = document.getElementById('fake-auth-modal');
    if (oldModal && !window.authModalOpen) oldModal.remove();
    
    console.log('[AUTH] Opening modal');
    
    // Create a host with Shadow DOM to isolate from app CSS
    let host = document.getElementById('fake-auth-host');
    if (!host) {
      host = document.createElement('div');
      host.id = 'fake-auth-host';
      host.className = 'fake-auth-modal-protect';
      host.style.cssText = 'position:fixed !important;top:0 !important;left:0 !important;width:100% !important;height:100% !important;z-index:2147483647 !important;pointer-events:auto !important;all: initial !important;';
      document.body.appendChild(host);
    }
    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
    // Add enforcer styles inside shadow
    const styleTag = document.createElement('style');
    styleTag.textContent = `
      :host { all: initial !important; position: fixed !important; inset: 0 !important; z-index: 2147483647 !important; }
      #fake-auth-modal { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.8); visibility: visible; pointer-events: auto; opacity: 1; }
      .box { background: #0a0f1a; border-radius: 8px; padding: 40px; max-width: 400px; width: 90%; color: white; border: 1px solid rgba(255,255,255,0.1); max-height: 90vh; overflow-y: auto; box-shadow: 0 0 30px rgba(0,245,255,0.3); }
      a, button { all: unset; cursor: pointer; }
    `;
    // Clear previous shadow content
    while (shadow.firstChild) shadow.removeChild(shadow.firstChild);
    shadow.appendChild(styleTag);

    // Create overlay inside shadow
    const overlay = document.createElement('div');
    overlay.id = 'fake-auth-modal';
    shadow.appendChild(overlay);
    
    // Create modal box inside shadow
    const box = document.createElement('div');
    box.className = 'box';
    overlay.appendChild(box);
    
    // Store globals for restoration
    window.authModalHost = host;
    window.authModalShadow = shadow;
    window.authModalOverlay = overlay;
    window.authModalBox = box;
    
    let isSignUp = true;
    
    function buildForm() {
      if (!box) return;
      box.innerHTML = '';
      
      // Title
      const title = document.createElement('h2');
      title.textContent = isSignUp ? 'Create Account' : 'Sign In';
      title.style.cssText = 'margin:0 0 24px 0;text-align:center;color:#00f5ff;font-size:24px;';
      box.appendChild(title);
      
      // Email
      const emailLbl = document.createElement('label');
      emailLbl.textContent = 'Email:';
      emailLbl.style.cssText = 'display:block;font-size:12px;margin-bottom:4px;color:#fff;';
      box.appendChild(emailLbl);
      
      const email = document.createElement('input');
      email.type = 'email';
      email.placeholder = 'your@email.com';
      email.style.cssText = 'width:100%;padding:10px;margin-bottom:16px;border-radius:4px;border:1px solid rgba(255,255,255,0.2);background:#0a0f1a;color:white;box-sizing:border-box;';
      box.appendChild(email);
      
      // Password
      const passLbl = document.createElement('label');
      passLbl.textContent = 'Password:';
      passLbl.style.cssText = 'display:block;font-size:12px;margin-bottom:4px;color:#fff;';
      box.appendChild(passLbl);
      
      const password = document.createElement('input');
      password.type = 'password';
      password.placeholder = 'password';
      password.style.cssText = 'width:100%;padding:10px;margin-bottom:8px;border-radius:4px;border:1px solid rgba(255,255,255,0.2);background:#0a0f1a;color:white;box-sizing:border-box;';
      box.appendChild(password);
      
      // Error message
      const msg = document.createElement('div');
      msg.style.cssText = 'font-size:12px;min-height:16px;color:#ff8888;margin-bottom:16px;';
      box.appendChild(msg);
      
      // Submit button
      const submit = document.createElement('button');
      submit.textContent = isSignUp ? 'Create Account' : 'Sign In';
      submit.style.cssText = 'width:100%;padding:10px;margin-bottom:16px;border-radius:6px;background:#00f5ff;color:#000;border:none;cursor:pointer;font-weight:bold;font-size:14px;transition:all 0.2s;display:block;box-sizing:border-box;';
      submit.onmouseover = () => submit.style.background = '#00cccc';
      submit.onmouseout = () => submit.style.background = '#00f5ff';
      submit.onclick = (e) => {
        e.preventDefault();
        const emailVal = email.value.trim();
        const passVal = password.value.trim();
        
        if (!emailVal || !passVal) {
          msg.textContent = 'Please enter email and password';
          return;
        }
        
        let result;
        if (isSignUp) {
          result = createAccount(emailVal, passVal);
        } else {
          result = validateLogin(emailVal, passVal);
        }
        
        if (!result.success) {
          msg.textContent = result.error;
          return;
        }
        
        const newUser = {
          id: 'user_' + emailVal.replace(/[^a-z0-9]/g, ''),
          name: emailVal.split('@')[0],
          email: emailVal,
          provider: 'email',
          isOwner: emailVal.toLowerCase() === OWNER_EMAIL.toLowerCase()
        };
        setUser(newUser);
        debug((isSignUp ? 'Account created: ' : 'Signed in: ') + emailVal);
        window.location.reload();
      };
      box.appendChild(submit);
      
      // Google button
      const google = document.createElement('button');
      google.textContent = 'Recent Sign In';
      google.style.cssText = 'width:100%;padding:10px;margin-bottom:16px;border-radius:6px;background:#4285F4;color:white;border:none;cursor:pointer;font-weight:bold;font-size:14px;transition:all 0.2s;display:block;box-sizing:border-box;';
      google.onmouseover = () => google.style.background = '#3367d6';
      google.onmouseout = () => google.style.background = '#4285F4';
      google.onclick = (e) => {
        e.preventDefault();
        // Close the auth modal before showing recent sign-ins
        try { closeAuthModal(); } catch(e) {}
        handleGoogleSignIn();
      };
      box.appendChild(google);
      
      // Toggle
      const toggleDiv = document.createElement('div');
      toggleDiv.style.cssText = 'font-size:12px;text-align:center;border-top:1px solid rgba(255,255,255,0.1);padding-top:16px;margin-top:16px;';
      
      const toggleText = document.createElement('span');
      toggleText.textContent = isSignUp ? 'Already have an account? ' : "Don't have an account? ";
      toggleText.style.cssText = 'color:#ccc;';
      toggleDiv.appendChild(toggleText);
      
      const toggleLink = document.createElement('a');
      toggleLink.textContent = isSignUp ? 'Sign In' : 'Create Account';
      toggleLink.style.cssText = 'color:#00f5ff;cursor:pointer;text-decoration:underline;font-weight:bold;';
      toggleLink.onclick = (e) => {
        e.preventDefault();
        isSignUp = !isSignUp;
        buildForm();
      };
      toggleDiv.appendChild(toggleLink);
      box.appendChild(toggleDiv);
    }
    
    buildForm();
    // Host is already appended; overlay and box are inside shadow

    // Global CSS enforcer to keep modal visible
    try {
      if (!document.getElementById('fake-auth-enforcer-style')) {
        const style = document.createElement('style');
        style.id = 'fake-auth-enforcer-style';
        style.textContent = `
          #fake-auth-modal { display:flex !important; visibility:visible !important; pointer-events:auto !important; opacity:1 !important; transform:none !important; filter:none !important; }
          #fake-auth-modal .fake-auth-modal-protect { display:block !important; visibility:visible !important; pointer-events:auto !important; opacity:1 !important; transform:none !important; filter:none !important; }
        `;
        document.head.appendChild(style);
      }
    } catch(e) {}

    // Keyboard shortcut: Ctrl+Shift+L opens modal
    if (!window.__fakeAuthKeybindAttached) {
      window.__fakeAuthKeybindAttached = true;
      window.addEventListener('keydown', function(e){
        try {
          if (e.ctrlKey && e.shiftKey && String(e.key).toLowerCase() === 'l') {
            e.preventDefault();
            openAuthModal();
          }
        } catch(err) {}
      });
    }
    
    // Aggressive watcher - check every 50ms and immediately restore if missing
    if (!window.authModalWatcher) {
      window.authModalWatcher = setInterval(() => {
        if (!window.authModalOpen) return; // Modal was closed
        
        const hostEl = document.getElementById('fake-auth-host');
        if (!hostEl && window.authModalHost) {
          try {
            document.body.appendChild(window.authModalHost);
          } catch(e) {}
        }
        // Enforce visibility
        try {
          const h = window.authModalHost;
          const ov = window.authModalOverlay;
          const bx = window.authModalBox;
          if (h) { h.style.display = 'block'; h.style.visibility = 'visible'; h.style.pointerEvents = 'auto'; }
          if (ov) { ov.style.display = 'flex'; ov.style.visibility = 'visible'; ov.style.pointerEvents = 'auto'; }
          if (bx) { bx.style.display = 'block'; bx.style.visibility = 'visible'; bx.style.pointerEvents = 'auto'; }
        } catch(e) {}
      }, 50);
    }

    // Attribute-level protection: revert any display/visibility changes (host + shadow children)
    try {
      if (!window.authModalAttrObserver) {
        const protect = (el, isOverlay=false) => {
          if (!el) return null;
          const obs = new MutationObserver(() => {
            try {
              const cs = getComputedStyle(el);
              const hidden = cs.display === 'none' || cs.visibility === 'hidden' || cs.pointerEvents === 'none' || cs.opacity === '0';
              if (hidden) {
                if (isOverlay) { el.style.display = 'flex'; el.style.visibility = 'visible'; el.style.pointerEvents = 'auto'; el.style.opacity = '1'; }
                else { el.style.display = 'block'; el.style.visibility = 'visible'; el.style.pointerEvents = 'auto'; el.style.opacity = '1'; }
              }
            } catch(e) {}
          });
          obs.observe(el, { attributes: true, attributeFilter: ['style', 'class'], attributeOldValue: true });
          return obs;
        };
        const oHost = protect(host);
        const oOverlay = protect(overlay, true);
        const oBox = protect(box);
        window.authModalAttrObserver = { oHost, oOverlay, oBox };
      }
    } catch(e) {}
    
    // Close on background click
    overlay.onclick = (e) => {
      if (e.target === overlay) closeAuthModal();
    };
  }

  function closeAuthModal(){
    window.authModalOpen = false;
    const host = document.getElementById('fake-auth-host');
    if (host && host.parentNode) host.parentNode.removeChild(host);
    if (window.authModalWatcher) {
      clearInterval(window.authModalWatcher);
      window.authModalWatcher = null;
    }
    if (window.authModalAttrObserver) {
      const { oHost, oOverlay, oBox } = window.authModalAttrObserver;
      try { oHost && oHost.disconnect(); } catch(e) {}
      try { oOverlay && oOverlay.disconnect(); } catch(e) {}
      try { oBox && oBox.disconnect(); } catch(e) {}
      window.authModalAttrObserver = null;
    }
  }

  // Hidden container for Google Sign-In button
  function ensureGoogleContainer(){
    let container = document.getElementById('fake-google-signin-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'fake-google-signin-container';
      container.style.display = 'none';
      document.body.appendChild(container);
    }
    return container;
  }

  // Replace the login button with full-page auth modal
  function renderButton(){
    const existingBtn = document.querySelector('[data-testid="button-login"]');
    if (existingBtn){
      // Update button text based on login state
      const user = getUser();
      const textNode = Array.from(existingBtn.childNodes).find(node => node.nodeType === 3 && node.textContent.trim());
      if (textNode) {
        textNode.textContent = user ? 'Logout' : 'Login';
      }
      
      // Just intercept clicks - don't modify DOM to avoid React conflicts
      if (!existingBtn.__fakeAuthAttached) {
        existingBtn.__fakeAuthAttached = true;
        existingBtn.addEventListener('click', function(e){ 
          e.preventDefault(); 
          e.stopPropagation(); 
          const user = getUser();
          if (user) {
            clearUser();
            debug('Signed out');
            // Reload the page
            window.location.reload();
          } else {
            openAuthModal();
          }
          return false; 
        }, true); // Use capture phase to catch before React
      }
      removeFloatingBtn();
      return;
    }
    // If no app login button, do not create a floating button; remove any existing one
    removeFloatingBtn();
  }

  function removeFloatingBtn(){
    try{
      const el = document.getElementById('fake-signin-btn');
      if (el && el.parentNode) el.parentNode.removeChild(el);
    }catch(e){}
  }

  function createStyle(){
    try{
      if (document.getElementById('fake-auth-style')) return;
      const s = document.createElement('style');
      s.id = 'fake-auth-style';
      s.textContent = `
        #fake-signin-btn{display:none !important; visibility:hidden !important; pointer-events:none !important;} 
        #fake-auth-debug{display:none !important; visibility:hidden !important; pointer-events:none !important; opacity:0 !important; position:absolute !important; left:-9999px !important; top:-9999px !important;}
        div[style*="fake-auth-debug"]{display:none !important; visibility:hidden !important; pointer-events:none !important; opacity:0 !important;}
      `;
      (document.head || document.documentElement).appendChild(s);
    }catch(e){}
  }

  // Aggressively watch for any floating button and remove it if it appears
  function watchAndRemoveFloating(){
    try{
      // immediate remove
      removeFloatingBtn();
      // persistent mutation observer: remove any node with id 'fake-signin-btn' immediately when added
      const mo = new MutationObserver((records)=>{
        for (const r of records){
          if (r.addedNodes && r.addedNodes.length){
            for (const n of r.addedNodes){
              try{
                if (!n) continue;
                // Don't touch modal elements
                if (n.classList && n.classList.contains('fake-auth-modal-protect')) continue;
                if (n.id === 'fake-auth-modal') continue;
                if (n.id === 'fake-signin-btn') { if (n.parentNode) n.parentNode.removeChild(n); continue; }
                // also check descendants
                if (n.querySelector){ const found = n.querySelector('#fake-signin-btn'); if (found && found.parentNode) found.parentNode.removeChild(found); }
              }catch(e){}
            }
          }
        }
      });
      try{ mo.observe(document.documentElement || document.body, { childList:true, subtree:true }); }catch(e){}
      
      // Poll to keep things clean
      setInterval(()=>{ 
        removeFloatingBtn(); 
        const debugPanel = document.getElementById('fake-auth-debug');
        if (debugPanel) debugPanel.remove();
        updateLoginButtonText();
      }, 50);
    }catch(e){}
  }
  
  // Update login button text based on user state
  function updateLoginButtonText() {
    try {
      const existingBtn = document.querySelector('[data-testid="button-login"]');
      if (existingBtn) {
        const user = getUser();
        const textNode = Array.from(existingBtn.childNodes).find(node => node.nodeType === 3 && node.textContent.trim());
        if (textNode) {
          const newText = user ? 'Logout' : 'Login';
          if (textNode.textContent !== newText) {
            textNode.textContent = newText;
          }
        }
      }
    } catch(e) {}
  }

  // Prevent other scripts from assigning id="fake-signin-btn" to elements
  try{
    const _origSetAttr = Element.prototype.setAttribute;
    Element.prototype.setAttribute = function(name, value){
      try{ if (name === 'id' && String(value) === 'fake-signin-btn') return; }catch(e){}
      return _origSetAttr.call(this, name, value);
    };
  }catch(e){}

  // Watch for the app rendering the login button asynchronously and attach our UI
  function observeLoginButton(){
    try{
      if (document.querySelector('[data-testid="button-login"]')) return; // already present
      const mo = new MutationObserver((records, obs)=>{
        if (document.querySelector('[data-testid="button-login"]')){
          renderButton();
          obs.disconnect();
        }
      });
      mo.observe(document.documentElement || document.body, { childList: true, subtree: true });
      // stop observing after 10s to avoid leaking
      setTimeout(()=>{ try{ mo.disconnect(); }catch(e){} }, 10000);
    }catch(e){/*ignore*/}
  }

  // Google Identity Services integration - removed
  // Using email/password login instead

  // User picker for local testing (no longer used): loads /users.json and lets you impersonate
  async function initUserPicker(){
    try{
      const res = await fetch('/users.json');
      if (!res.ok) return;
      const users = await res.json();
      if (!Array.isArray(users) || users.length === 0) return;

      const cont = document.getElementById('fake-user-picker-container');
      if (!cont) return;
      cont.innerHTML = '';

      const label = document.createElement('div');
      label.textContent = 'Local Test Users:';
      label.style.fontSize = '12px';
      label.style.marginBottom = '6px';
      label.style.opacity = '0.8';
      cont.appendChild(label);

      const sel = document.createElement('select');
      sel.style.width = '100%';
      sel.style.marginBottom = '6px';
      sel.style.padding = '6px';
      sel.style.borderRadius = '4px';
      sel.style.background = '#1a2332';
      sel.style.color = 'white';
      sel.style.border = '1px solid rgba(255,255,255,0.1)';
      
      const defaultOpt = document.createElement('option');
      defaultOpt.value = '';
      defaultOpt.textContent = 'Sign in as...';
      sel.appendChild(defaultOpt);

      users.forEach(u => {
        const opt = document.createElement('option');
        opt.value = u.id;
        opt.textContent = u.email || ((u.first_name || '') + (u.last_name ? (' ' + u.last_name) : ''));
        opt.dataset.email = u.email || '';
        opt.dataset.name = (u.first_name || '') + (u.last_name ? (' ' + u.last_name) : '');
        sel.appendChild(opt);
      });
      debug('loaded ' + users.length + ' users for picker');

      sel.onchange = function(){
        const id = sel.value;
        if (!id) return;
        const opt = sel.options[sel.selectedIndex];
        const user = { id: id, name: opt.dataset.name || opt.dataset.email, email: opt.dataset.email };
        setUser(user);
        closeAuthPopup();
        renderButton();
        window.dispatchEvent(new Event('fake-auth-changed'));
      };

      const clearBtn = document.createElement('button');
      clearBtn.textContent = 'Sign out';
      clearBtn.style.width = '100%';
      clearBtn.style.padding = '6px';
      clearBtn.style.marginTop = '6px';
      clearBtn.style.borderRadius = '4px';
      clearBtn.style.background = '#ff4444';
      clearBtn.style.color = 'white';
      clearBtn.style.border = 'none';
      clearBtn.style.cursor = 'pointer';
      clearBtn.style.fontSize = '14px';
      clearBtn.onclick = function(e){ 
        e.preventDefault();
        e.stopPropagation();
        debug('Sign out clicked');
        clearUser(); 
        closeAuthPopup(); 
        window.dispatchEvent(new Event('fake-auth-changed')); 
        return false;
      };
      
      cont.appendChild(sel);
      cont.appendChild(clearBtn);
    }catch(e){ debug('initUserPicker error: ' + e.message); }
  }

  // Monkeypatch fetch to respond to auth-related endpoints locally
  (function(){
    const originalFetch = window.fetch.bind(window);
    window.fetch = async function(input, init){
      try {
        // Remove debug panel if it exists
        const debugPanel = document.getElementById('fake-auth-debug');
        if (debugPanel) debugPanel.remove();
        
        const url = (typeof input === 'string') ? input : (input && input.url) || '';
        const method = (init && init.method) || 'GET';
        // Only intercept same-origin API routes
        if (url && url.indexOf('/api/auth/user') !== -1){
          const user = getUser();
          if (user) return new Response(JSON.stringify(user), { status: 200, headers: { 'Content-Type':'application/json' } });
          return new Response(JSON.stringify({ message: 'Unauthorized' }), { status: 401, headers: { 'Content-Type':'application/json' } });
        }
        if (url && url.indexOf('/api/logout') !== -1){
          localStorage.removeItem('tricklist_user');
          return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type':'application/json' } });
        }
        if (url && url.indexOf('/api/auth/is-owner') !== -1){
          const user = getUser();
          const ownerStatus = isOwner(user);
          return new Response(JSON.stringify({ isOwner: ownerStatus }), { status: 200, headers: { 'Content-Type':'application/json' } });
        }
        if (url && url.indexOf('/api/trick-ai') !== -1 && method === 'POST'){
          const user = getUser();
          if (!user) {
            
            // Send a friendly message to sign in
            const stream = new ReadableStream({
              start(controller) {
                const message = "Please sign in to use Trick AI! ??";
                const words = message.split(' ');
                let index = 0;
                
                function sendWord() {
                  if (index < words.length) {
                    const chunk = `data: ${JSON.stringify({ content: words[index] + ' ' })}\n`;
                    controller.enqueue(new TextEncoder().encode(chunk));
                    index++;
                    setTimeout(sendWord, 30);
                  } else {
                    controller.close();
                  }
                }
                
                sendWord();
              }
            });
            
            return new Response(stream, {
              status: 200,
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
              }
            });
          }
          
          try {
            const body = init && init.body ? JSON.parse(init.body) : {};
            const message = body.message || '';
            
            // Simple response for testing
            let responseText = "I'm your trampoline trick coach! ";
            
            if (message.toLowerCase().includes('front flip')) {
              responseText += "For a front flip, start with good height, set your arms up, tuck tight, spot your landing, and extend to land on your feet. Always practice with a spotter first!";
            } else if (message.toLowerCase().includes('back flip')) {
              responseText += "For a back flip, jump straight up (not back!), look up, tuck your knees to chest, and open up when you see the mat. Use a spotter until you're confident!";
            } else {
              responseText += "Ask me about specific tricks like front flips, back flips, progressions, or safety tips. What would you like to know?";
            }
            
            // Create a simple readable stream
            const encoder = new TextEncoder();
            const stream = new ReadableStream({
              start(controller) {
                try {
                  const words = responseText.split(' ');
                  let index = 0;
                  
                  const sendWord = () => {
                    if (index < words.length) {
                      const word = (index === 0 ? words[index] : ' ' + words[index]);
                      const chunk = 'data: ' + JSON.stringify({content: word}) + '\n';
                      controller.enqueue(encoder.encode(chunk));
                      index++;
                      setTimeout(sendWord, 30);
                    } else {
                      controller.close();
                    }
                  };
                  
                  sendWord();
                } catch (err) {
                  controller.error(err);
                }
              }
            });
            
            return new Response(stream, {
              status: 200,
              headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache'
              }
            });
            
          } catch(e) {
            return new Response(JSON.stringify({ error: e.message }), { 
              status: 500, 
              headers: {'Content-Type':'application/json'} 
            });
          }
        }
        if (url && String(url).indexOf('/api/feedback') !== -1 && method === 'POST'){
          const user = getUser();
          try {
            const body = init && init.body ? JSON.parse(init.body) : {};
            const feedback = {
              type: body.type || 'suggestion',
              message: body.message || '',
              userEmail: user ? user.email : 'anonymous',
              timestamp: new Date().toISOString()
            };
            
            // Get existing feedback or create new array
            let feedbackList = JSON.parse(localStorage.getItem('tricklist_feedback') || '[]');
            feedbackList.push(feedback);
            
            // Keep only last 100 feedback items
            if (feedbackList.length > 100) {
              feedbackList = feedbackList.slice(-100);
            }
            
            localStorage.setItem('tricklist_feedback', JSON.stringify(feedbackList));
            
            return new Response(JSON.stringify({ success: true, message: 'Feedback received! Thanks for helping us improve.' }), { 
              status: 200, 
              headers: {'Content-Type':'application/json'} 
            });
          } catch(e) {
            return new Response(JSON.stringify({ error: e.message }), { status:400, headers:{'Content-Type':'application/json'} });
          }
        }
        if (url && String(url).indexOf('/api/feedback') !== -1 && method === 'GET'){
          const user = getUser();
          if (!user || !isOwner(user)) {
            return new Response(JSON.stringify({ error: 'Owner only' }), { status: 401, headers: {'Content-Type':'application/json'} });
          }
          
          try {
            const feedbackList = JSON.parse(localStorage.getItem('tricklist_feedback') || '[]');
            return new Response(JSON.stringify(feedbackList), {
              status: 200,
            });
          } catch(e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: {'Content-Type':'application/json'} });
          }
        }
        if (url && String(url).indexOf('/api/feedback') !== -1 && method === 'DELETE'){
          const user = getUser();
          if (!user || !isOwner(user)) {
            return new Response(JSON.stringify({ message: 'Unauthorized - Owner only' }), { status: 401, headers: {'Content-Type':'application/json'} });
          }
          
          try {
            const body = init && init.body ? JSON.parse(init.body) : {};
            const index = body.index;
            if (index === undefined || index === null) {
              return new Response(JSON.stringify({ error: 'Index required' }), { status: 400, headers: {'Content-Type':'application/json'} });
            }
            
            let feedbackList = JSON.parse(localStorage.getItem('tricklist_feedback') || '[]');
            if (index >= 0 && index < feedbackList.length) {
              feedbackList.splice(index, 1);
              localStorage.setItem('tricklist_feedback', JSON.stringify(feedbackList));
              return new Response(JSON.stringify({ success: true }), { status: 200, headers: {'Content-Type':'application/json'} });
            } else {
              return new Response(JSON.stringify({ error: 'Invalid index' }), { status: 400, headers: {'Content-Type':'application/json'} });
            }
          } catch(e) {
            return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: {'Content-Type':'application/json'} });
          }
        }
        if (url && url.indexOf('/api/ai-settings') !== -1 && method === 'PATCH'){
          const user = getUser();
          if (!user) return new Response(JSON.stringify({ message:'Unauthorized' }), { status:401, headers:{'Content-Type':'application/json'} });
          
          try {
            const body = init && init.body ? JSON.parse(init.body) : {};
            localStorage.setItem('tricklist_ai_settings', JSON.stringify(body));
            return new Response(JSON.stringify({ success: true }), { status:200, headers:{'Content-Type':'application/json'} });
          } catch(e) {
            return new Response(JSON.stringify({ error: e.message }), { status:400, headers:{'Content-Type':'application/json'} });
          }
        }
        if (url && String(url).indexOf('/api/feedback') !== -1 && method === 'POST'){
          // This is a duplicate - feedback is now handled earlier
          // Fall through to original fetch
        }
        if (url && url.indexOf('/api/me/learned-tricks') !== -1){
          const user = getUser();
          if (method === 'GET'){
            if (!user) return new Response(JSON.stringify({ message:'Unauthorized' }), { status:401, headers:{'Content-Type':'application/json'} });
            const learnedIds = getLearned();
            return new Response(JSON.stringify({ learnedIds: learnedIds }), { status:200, headers:{'Content-Type':'application/json'} });
          }
          if (method === 'POST'){
            if (!user) return new Response(JSON.stringify({ message:'Unauthorized' }), { status:401, headers:{'Content-Type':'application/json'} });
            try {
              // Extract trick ID from URL path: /api/me/learned-tricks/{id}
              const urlParts = url.split('/');
              const id = parseInt(urlParts[urlParts.length - 1]);
              
              if (!id || isNaN(id)) return new Response(JSON.stringify({ message:'Bad Request - Invalid ID' }), { status:400, headers:{'Content-Type':'application/json'} });
              
              const list = getLearned();
              if (!list.includes(id)) {
                list.push(id);
                saveLearned(list);
              }
              return new Response(JSON.stringify({ success:true }), { status:200, headers:{'Content-Type':'application/json'} });
            } catch(e){ 
              return new Response(JSON.stringify({ message:'Bad Request' }), { status:400, headers:{'Content-Type':'application/json'} }); 
            }
          }
          if (method === 'DELETE'){
            if (!user) return new Response(JSON.stringify({ message:'Unauthorized' }), { status:401, headers:{'Content-Type':'application/json'} });
            try {
              // Extract trick ID from URL path: /api/me/learned-tricks/{id}
              const urlParts = url.split('/');
              const id = parseInt(urlParts[urlParts.length - 1]);
              
              if (!id || isNaN(id)) return new Response(JSON.stringify({ message:'Bad Request - Invalid ID' }), { status:400, headers:{'Content-Type':'application/json'} });
              
              let list = getLearned();
              list = list.filter(x => x !== id);
              saveLearned(list);
              return new Response(JSON.stringify({ success:true }), { status:200, headers:{'Content-Type':'application/json'} });
            } catch(e){ 
              return new Response(JSON.stringify({ message:'Bad Request' }), { status:400, headers:{'Content-Type':'application/json'} }); 
            }
          }
        }
      } catch(e){ /* fall through to original fetch */ }
      
      // Track random trick selections
      try {
        if (url.includes('/api/random/track') && opts.method === 'POST') {
          const body = JSON.parse(opts.body || '{}');
          if (body.trickId) {
            addToRandomHistory(body.trickId);
          }
          if (body.trickIds && Array.isArray(body.trickIds)) {
            body.trickIds.forEach(id => addToRandomHistory(id));
          }
          return new Response(JSON.stringify({ success: true }), { status: 200, headers: {'Content-Type': 'application/json'} });
        }
        
        if (url.includes('/api/random/history')) {
          if (opts.method === 'GET') {
            const history = getRandomHistory();
            return new Response(JSON.stringify({ history }), { status: 200, headers: {'Content-Type': 'application/json'} });
          }
          if (opts.method === 'DELETE') {
            clearRandomHistory();
            return new Response(JSON.stringify({ success: true }), { status: 200, headers: {'Content-Type': 'application/json'} });
          }
        }
        
        // Trick management - owner only
        if (url.includes('/api/tricks') && (opts.method === 'POST' || opts.method === 'PUT' || opts.method === 'DELETE')) {
          const user = getUser();
          if (!user || !isOwner(user)) {
            return new Response(JSON.stringify({ error: 'Owner only - authentication required' }), { status: 401, headers: {'Content-Type':'application/json'} });
          }
          // Let the request go through since we're owner
          return fetch(request);
        }
        
        // Import/Export tricks - owner only
        if ((url.includes('/api/tricks/import') || url.includes('/api/tricks/export')) && opts.method !== 'GET') {
          const user = getUser();
          if (!user || !isOwner(user)) {
            return new Response(JSON.stringify({ error: 'Owner only - authentication required' }), { status: 401, headers: {'Content-Type':'application/json'} });
          }
          // Let the request go through since we're owner
          return fetch(request);
        }
      } catch(e){ /* fall through to original fetch */ }
      
      // Fetch normally and pass through - don't intercept /api/tricks
      const response = await originalFetch(input, init);
      return response;
    };
  })();

  // Render button after DOM ready
  function replaceExistingSignIns(){
    try{
      const user = getUser();
      const all = Array.from(document.querySelectorAll('a,button'));
      all.forEach(el=>{
        const href = el.getAttribute && el.getAttribute('href');
        const text = (el.textContent||'').trim().toLowerCase();
        if ((href && (href.indexOf('/api/login')!==-1 || href.indexOf('/login')!==-1)) || text.includes('login') || text.includes('sign in') || text.includes('log in')){
          // Prevent navigation to /api/login
          el.removeAttribute('href'); // Remove href to prevent navigation
          el.addEventListener('click', function(ev){ 
            ev.preventDefault(); 
            ev.stopPropagation(); 
            // Open the auth modal directly
            openAuthModal();
            return false;
          }, true); // Use capture phase
          if (user) el.textContent = (user.name||user.email)+' (Sign out)'; else el.textContent = 'Sign in';
        }
      });
    }catch(e){/*ignore*/}
  }

  function initUI(){
    try{ 
      // Remove any debug panels immediately
      const debugPanel = document.getElementById('fake-auth-debug');
      if (debugPanel) debugPanel.remove();
      
      // Remove Owner check divs immediately
      const allDivs = document.querySelectorAll('div');
      allDivs.forEach(div => {
        if ((div.textContent || '').includes('Owner check')) {
          if (div.parentNode) div.parentNode.removeChild(div);
        }
      });
      
      createStyle(); removeFloatingBtn(); renderButton(); replaceExistingSignIns(); watchAndRemoveFloating(); observeLoginButton(); hideNonOwnerTrickControls(); addTrickManagementButtons(); 
      
      // Continuously remove debug elements and check admin link
      setInterval(() => {
        try {
          const debugPanel = document.getElementById('fake-auth-debug');
          if (debugPanel && debugPanel.parentNode) {
            debugPanel.parentNode.removeChild(debugPanel);
          }
          
          const allDivs = document.querySelectorAll('div');
          allDivs.forEach(div => {
            const text = (div.textContent || '').toLowerCase();
            if (text.includes('owner check') || 
                text.includes('debug') || 
                text.includes('logged in as') ||
                text.includes('email:') && text.length < 100) {
              if (div.parentNode && !div.querySelector('input') && !div.querySelector('button')) {
                div.parentNode.removeChild(div);
              }
            }
          });
          
          // Remove admin link if user is not owner
          const user = getUser();
          const adminLink = document.getElementById('fake-auth-admin-link');
          
          // Remove admin link if user logged out or is not owner
          if (adminLink) {
            if (!user || !user.email) {
              if (adminLink.parentNode) {
                adminLink.parentNode.removeChild(adminLink);
              }
            } else {
              const userEmailLower = user.email.toLowerCase().trim();
              const ownerEmailLower = (OWNER_EMAIL || '').toLowerCase().trim();
              if (userEmailLower !== ownerEmailLower) {
                if (adminLink.parentNode) {
                  adminLink.parentNode.removeChild(adminLink);
                }
              }
            }
          } else if (user && user.email) {
            // Link doesn't exist but user is owner - recreate it
            const userEmailLower = user.email.toLowerCase().trim();
            const ownerEmailLower = (OWNER_EMAIL || '').toLowerCase().trim();
            if (userEmailLower === ownerEmailLower) {
              addAdminLink();
            }
          }
          
          // Hide trick management buttons if user is not owner
          hideNonOwnerTrickControls();
          addTrickManagementButtons();
        } catch(e) {}
      }, 100);
    }catch(e){}
  }
  
  function hideNonOwnerTrickControls(){
    try {
      const user = getUser();
      const userEmailLower = user && user.email ? user.email.toLowerCase().trim() : '';
      const ownerEmailLower = OWNER_EMAIL ? OWNER_EMAIL.toLowerCase().trim() : '';
      const isOwnerUser = userEmailLower === ownerEmailLower;
      
      // Be specific - only target actual trick management buttons
      // Use more specific patterns to avoid false positives
      const mgmtKeywords = [
        'add trick', 'new trick', 'create trick',
        'edit trick', 'delete trick', 'remove trick',
        'import trick', 'export trick',
        'manage trick'
      ];
      
      // Find and hide/show trick management buttons
      const allElements = document.querySelectorAll('button, [role="button"], a, [data-testid*="button"], [data-testid*="trick"]');
      allElements.forEach(el => {
        const text = (el.textContent || '').toLowerCase().trim();
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
        const title = (el.getAttribute('title') || '').toLowerCase();
        const testId = (el.getAttribute('data-testid') || '').toLowerCase();
        
        // Check for trick management buttons specifically
        const isManagementBtn = mgmtKeywords.some(keyword => 
          text.includes(keyword) || 
          ariaLabel.includes(keyword) || 
          title.includes(keyword) ||
          testId.includes(keyword)
        );
        
        if (isManagementBtn) {
          if (!isOwnerUser) {
            // Not owner - hide the button
            el.style.display = 'none';
            el.style.visibility = 'hidden';
            el.style.pointerEvents = 'none';
          } else {
            // Is owner - make sure button is visible
            el.style.removeProperty('display');
            el.style.removeProperty('visibility');
            el.style.removeProperty('pointer-events');
          }
        }
      });
    } catch(e) {}
  }
  
  // Admin link disabled for public build
  function addAdminLink(){ return; }

  // Admin modal state
  let adminModalOpen = false;
  const API_URL = 'http://localhost:8000';

  // Handle admin button clicks
  function handleAdminButtonClick(buttonId, buttonText) {
    const user = getUser();
    if (!user || !isOwner(user)) {
      alert('Unauthorized: Only owner can access admin features');
      return;
    }

    switch(buttonId) {
      case 'owner-add-trick-btn':
        openAddTrickModal();
        break;
      case 'owner-edit-trick-btn':
        openEditTricksModal();
        break;
      case 'owner-delete-trick-btn':
        openDeleteTricksModal();
        break;
      case 'owner-import-trick-btn':
        handleImportTricks();
        break;
      case 'owner-export-trick-btn':
        handleExportTricks();
        break;
      default:
        alert('Unknown admin action');
    }
  }

  // Create admin modal HTML
  function createAdminModal(title, content, footer = '') {
    const modal = document.createElement('div');
    modal.className = 'admin-modal-overlay';
    modal.innerHTML = `
      <div class="admin-modal-content">
        <div class="admin-modal-header">
          <h2>${title}</h2>
          <button class="admin-modal-close">&times;</button>
        </div>
        <div class="admin-modal-body">
          ${content}
        </div>
        ${footer ? `<div class="admin-modal-footer">${footer}</div>` : ''}
      </div>
    `;

    // Close button handler
    modal.querySelector('.admin-modal-close').onclick = () => {
      modal.remove();
      adminModalOpen = false;
    };

    // Close on background click
    modal.onclick = (e) => {
      if (e.target === modal) {
        modal.remove();
        adminModalOpen = false;
      }
    };

    return modal;
  }

  // Inject admin modal styles
  function injectAdminStyles() {
    if (document.getElementById('admin-modal-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'admin-modal-styles';
    style.textContent = `
      .admin-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
        backdrop-filter: blur(4px);
      }
      .admin-modal-content {
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        max-width: 600px;
        width: 90%;
        max-height: 80vh;
        overflow-y: auto;
        animation: slideUp 0.3s ease-out;
      }
      @keyframes slideUp {
        from { transform: translateY(40px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      .admin-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid #e0e0e0;
      }
      .admin-modal-header h2 {
        margin: 0;
        font-size: 20px;
        color: #333;
      }
      .admin-modal-close {
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        color: #666;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .admin-modal-close:hover {
        color: #333;
      }
      .admin-modal-body {
        padding: 20px;
      }
      .admin-modal-footer {
        padding: 15px 20px;
        border-top: 1px solid #e0e0e0;
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }
      .admin-form-group {
        margin-bottom: 15px;
      }
      .admin-form-group label {
        display: block;
        font-weight: 500;
        margin-bottom: 5px;
        color: #333;
        font-size: 14px;
      }
      .admin-form-group input,
      .admin-form-group textarea,
      .admin-form-group select {
        width: 100%;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 14px;
        font-family: inherit;
      }
      .admin-form-group textarea {
        resize: vertical;
        min-height: 80px;
      }
      .admin-btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s;
      }
      .admin-btn-primary {
        background: #3b82f6;
        color: white;
      }
      .admin-btn-primary:hover {
        background: #2563eb;
      }
      .admin-btn-secondary {
        background: #e0e0e0;
        color: #333;
      }
      .admin-btn-secondary:hover {
        background: #d0d0d0;
      }
      .admin-btn-danger {
        background: #ef4444;
        color: white;
      }
      .admin-btn-danger:hover {
        background: #dc2626;
      }
      .admin-tricks-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        max-height: 400px;
        overflow-y: auto;
      }
      .admin-trick-item {
        padding: 12px;
        border: 1px solid #ddd;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }
      .admin-trick-item:hover {
        background: #f5f5f5;
        border-color: #3b82f6;
      }
      .admin-trick-item-name {
        font-weight: 600;
        color: #333;
      }
      .admin-trick-item-level {
        font-size: 12px;
        color: #666;
        margin-top: 4px;
      }
      .admin-loading {
        text-align: center;
        padding: 20px;
        color: #666;
      }
      .admin-error {
        padding: 12px;
        background: #fee;
        color: #c00;
        border: 1px solid #fcc;
        border-radius: 6px;
        margin-bottom: 15px;
      }
      .admin-success {
        padding: 12px;
        background: #efe;
        color: #060;
        border: 1px solid #cfc;
        border-radius: 6px;
        margin-bottom: 15px;
      }
    `;
    document.head.appendChild(style);
  }

  // Add trick modal
  function openAddTrickModal() {
    injectAdminStyles();
    if (adminModalOpen) return;
    adminModalOpen = true;

    const content = `
      <div class="admin-form-group">
        <label>Trick Name *</label>
        <input type="text" id="trick-name" placeholder="e.g., Kickflip" required>
      </div>
      <div class="admin-form-group">
        <label>Level</label>
        <select id="trick-level">
          <option>Beginner</option>
          <option>Novice</option>
          <option>Intermediate</option>
          <option>Advanced</option>
          <option>Elite</option>
        </select>
      </div>
      <div class="admin-form-group">
        <label>Description</label>
        <textarea id="trick-description" placeholder="Describe the trick..."></textarea>
      </div>
      <div class="admin-form-group">
        <label>Tips</label>
        <textarea id="trick-tips" placeholder="Tips for learning this trick..."></textarea>
      </div>
      <div class="admin-form-group">
        <label>Difficulty Score (0-10)</label>
        <input type="number" id="trick-score" min="0" max="10" step="0.1" value="5">
      </div>
    `;

    const footer = `
      <button class="admin-btn admin-btn-secondary" id="cancel-btn">Cancel</button>
      <button class="admin-btn admin-btn-primary" id="save-btn">Add Trick</button>
    `;

    const modal = createAdminModal('Add New Trick', content, footer);
    document.body.appendChild(modal);

    modal.querySelector('#cancel-btn').onclick = () => {
      modal.remove();
      adminModalOpen = false;
    };

    modal.querySelector('#save-btn').onclick = async () => {
      const name = modal.querySelector('#trick-name').value.trim();
      if (!name) {
        alert('Trick name is required');
        return;
      }

      const trickData = {
        name,
        level: modal.querySelector('#trick-level').value,
        description: modal.querySelector('#trick-description').value,
        tips: modal.querySelector('#trick-tips').value,
        score: parseFloat(modal.querySelector('#trick-score').value) || 0
      };

      try {
        const response = await fetch(`${API_URL}/api/tricks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(trickData)
        });

        const result = await response.json();
        if (result.success) {
          alert(`✓ Trick "${name}" added successfully!`);
          modal.remove();
          adminModalOpen = false;
        } else {
          alert('Error: ' + (result.error || 'Failed to add trick'));
        }
      } catch (err) {
        alert('Error connecting to API. Make sure admin server is running on port 3001');
      }
    };
  }

  // Edit tricks modal
  function openEditTricksModal() {
    injectAdminStyles();
    if (adminModalOpen) return;
    adminModalOpen = true;

    const content = '<div class="admin-loading">Loading tricks...</div>';
    const modal = createAdminModal('Edit Tricks', content);
    document.body.appendChild(modal);

    // Load tricks
    fetch(`${API_URL}/api/tricks`)
      .then(res => res.json())
      .then(data => {
        if (data.tricks && data.tricks.length > 0) {
          let html = '<div class="admin-tricks-list">';
          data.tricks.forEach(trick => {
            html += `
              <div class="admin-trick-item" data-id="${trick.id}">
                <div class="admin-trick-item-name">${trick.name}</div>
                <div class="admin-trick-item-level">${trick.level}</div>
              </div>
            `;
          });
          html += '</div>';

          const body = modal.querySelector('.admin-modal-body');
          body.innerHTML = html;

          // Add click handlers to tricks
          body.querySelectorAll('.admin-trick-item').forEach(item => {
            item.onclick = () => openEditSingleTrickModal(data.tricks.find(t => t.id === parseInt(item.dataset.id)), modal);
          });
        } else {
          modal.querySelector('.admin-modal-body').innerHTML = '<p>No tricks found</p>';
        }
      })
      .catch(err => {
        modal.querySelector('.admin-modal-body').innerHTML = '<div class="admin-error">Error loading tricks. Make sure admin server is running.</div>';
      });
  }

  // Edit single trick
  function openEditSingleTrickModal(trick, parentModal) {
    const content = `
      <div class="admin-form-group">
        <label>Trick Name *</label>
        <input type="text" id="trick-name" value="${trick.name}" required>
      </div>
      <div class="admin-form-group">
        <label>Level</label>
        <select id="trick-level">
          <option ${trick.level === 'Beginner' ? 'selected' : ''}>Beginner</option>
          <option ${trick.level === 'Novice' ? 'selected' : ''}>Novice</option>
          <option ${trick.level === 'Intermediate' ? 'selected' : ''}>Intermediate</option>
          <option ${trick.level === 'Advanced' ? 'selected' : ''}>Advanced</option>
          <option ${trick.level === 'Elite' ? 'selected' : ''}>Elite</option>
        </select>
      </div>
      <div class="admin-form-group">
        <label>Description</label>
        <textarea id="trick-description">${trick.description}</textarea>
      </div>
      <div class="admin-form-group">
        <label>Tips</label>
        <textarea id="trick-tips">${trick.tips}</textarea>
      </div>
      <div class="admin-form-group">
        <label>Difficulty Score (0-10)</label>
        <input type="number" id="trick-score" min="0" max="10" step="0.1" value="${trick.score}">
      </div>
    `;

    const footer = `
      <button class="admin-btn admin-btn-secondary" id="back-btn">Back</button>
      <button class="admin-btn admin-btn-danger" id="delete-btn">Delete</button>
      <button class="admin-btn admin-btn-primary" id="save-btn">Save Changes</button>
    `;

    const modal = createAdminModal(`Edit: ${trick.name}`, content, footer);
    document.body.appendChild(modal);

    modal.querySelector('#back-btn').onclick = () => {
      modal.remove();
      adminModalOpen = false;
    };

    modal.querySelector('#delete-btn').onclick = async () => {
      if (!confirm(`Delete "${trick.name}"?`)) return;

      try {
        const response = await fetch(`${API_URL}/api/tricks/${trick.id}`, { method: 'DELETE' });
        const result = await response.json();
        if (result.success) {
          alert('✓ Trick deleted successfully!');
          modal.remove();
          parentModal.remove();
          adminModalOpen = false;
        }
      } catch (err) {
        alert('Error deleting trick');
      }
    };

    modal.querySelector('#save-btn').onclick = async () => {
      const name = modal.querySelector('#trick-name').value.trim();
      if (!name) {
        alert('Trick name is required');
        return;
      }

      const trickData = {
        name,
        level: modal.querySelector('#trick-level').value,
        description: modal.querySelector('#trick-description').value,
        tips: modal.querySelector('#trick-tips').value,
        score: parseFloat(modal.querySelector('#trick-score').value) || 0
      };

      try {
        const response = await fetch(`${API_URL}/api/tricks/${trick.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(trickData)
        });

        const result = await response.json();
        if (result.success) {
          alert('✓ Trick updated successfully!');
          modal.remove();
          parentModal.remove();
          adminModalOpen = false;
        }
      } catch (err) {
        alert('Error updating trick');
      }
    };
  }

  // Delete tricks modal
  function openDeleteTricksModal() {
    injectAdminStyles();
    if (adminModalOpen) return;
    adminModalOpen = true;

    const content = '<div class="admin-loading">Loading tricks...</div>';
    const modal = createAdminModal('Delete Tricks', content);
    document.body.appendChild(modal);

    fetch(`${API_URL}/api/tricks`)
      .then(res => res.json())
      .then(data => {
        if (data.tricks && data.tricks.length > 0) {
          let html = '<div class="admin-tricks-list">';
          data.tricks.forEach(trick => {
            html += `
              <div class="admin-trick-item" style="border-color:#ef4444;" data-id="${trick.id}">
                <div class="admin-trick-item-name">${trick.name}</div>
                <div class="admin-trick-item-level">${trick.level}</div>
                <button class="admin-btn admin-btn-danger" style="margin-top:8px;width:100%;" data-id="${trick.id}">Delete</button>
              </div>
            `;
          });
          html += '</div>';

          const body = modal.querySelector('.admin-modal-body');
          body.innerHTML = html;

          // Add delete handlers
          body.querySelectorAll('.admin-btn-danger').forEach(btn => {
            btn.onclick = async (e) => {
              e.stopPropagation();
              const id = parseInt(btn.dataset.id);
              const trickName = data.tricks.find(t => t.id === id).name;
              if (!confirm(`Delete "${trickName}"?`)) return;

              try {
                const response = await fetch(`${API_URL}/api/tricks/${id}`, { method: 'DELETE' });
                const result = await response.json();
                if (result.success) {
                  btn.closest('.admin-trick-item').remove();
                  alert('✓ Trick deleted!');
                }
              } catch (err) {
                alert('Error deleting trick');
              }
            };
          });
        }
      })
      .catch(err => {
        modal.querySelector('.admin-modal-body').innerHTML = '<div class="admin-error">Error loading tricks</div>';
      });
  }

  // Import tricks from file
  function handleImportTricks() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const tricks = JSON.parse(event.target.result);
          if (!Array.isArray(tricks)) {
            alert('Invalid format: JSON must be an array of tricks');
            return;
          }

          const response = await fetch(`${API_URL}/api/tricks/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tricks })
          });

          const result = await response.json();
          if (result.success) {
            alert(`✓ Successfully imported ${result.imported} trick(s)!`);
          }
        } catch(err) {
          alert('Error: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // Export tricks to file
  function handleExportTricks() {
    fetch(`${API_URL}/api/tricks/export`)
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `tricks-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);
        alert('✓ Export complete!');
      })
      .catch(err => {
        alert('Error exporting tricks. Make sure admin server is running.');
      });
  }
  
  function addTrickManagementButtons(){
    try {
      console.log('[addTrickManagementButtons] Called');
      const user = getUser();
      console.log('[addTrickManagementButtons] User:', user);
      if (!user || !user.email) {
        console.log('[addTrickManagementButtons] No user or email, exiting');
        return;
      }
      
      const userEmailLower = user.email.toLowerCase().trim();
      const ownerEmailLower = (OWNER_EMAIL || '').toLowerCase().trim();
      console.log('[addTrickManagementButtons] User email:', userEmailLower);
      console.log('[addTrickManagementButtons] Owner email:', ownerEmailLower);
      
      // Only create buttons if user IS the owner
      if (userEmailLower !== ownerEmailLower) {
        console.log('[addTrickManagementButtons] User is NOT owner, exiting');
        return;
      }
      console.log('[addTrickManagementButtons] User IS owner, continuing...');
      
      // Find header - try multiple selectors
      let header = document.querySelector('header');
      console.log('[addTrickManagementButtons] header element:', header);
      if (!header) header = document.querySelector('[role="banner"]');
      console.log('[addTrickManagementButtons] [role="banner"] element:', header);
      if (!header) header = document.querySelector('nav');
      console.log('[addTrickManagementButtons] nav element:', header);
      if (!header) {
        // Try to find the parent of the login button
        const loginBtn = document.querySelector('[data-testid="button-login"]');
        console.log('[addTrickManagementButtons] login button:', loginBtn);
        if (loginBtn) header = loginBtn.closest('header, nav, div[class*="header"], div[class*="nav"]');
        console.log('[addTrickManagementButtons] header from login btn:', header);
      }
      if (!header) {
        console.log('[addTrickManagementButtons] No header found, exiting');
        return;
      }
      console.log('[addTrickManagementButtons] Using header:', header);
      
      // Define trick management buttons
      const buttons = [
        { id: 'owner-add-trick-btn', text: '+ Add Trick', color: '#3b82f6' },
        { id: 'owner-edit-trick-btn', text: 'Edit Tricks', color: '#f59e0b' },
        { id: 'owner-delete-trick-btn', text: 'Delete Tricks', color: '#ef4444' },
        { id: 'owner-import-trick-btn', text: 'Import', color: '#10b981' },
        { id: 'owner-export-trick-btn', text: 'Export', color: '#8b5cf6' }
      ];
      
      // Create and add each button
      console.log('[addTrickManagementButtons] Creating buttons...');
      buttons.forEach(btnConfig => {
        // Check if button already exists
        const existing = document.getElementById(btnConfig.id);
        if (existing) {
          console.log('[addTrickManagementButtons] Button already exists:', btnConfig.id);
          return;
        }
        console.log('[addTrickManagementButtons] Creating button:', btnConfig.id);
        
        const btn = document.createElement('button');
        btn.id = btnConfig.id;
        btn.className = 'owner-trick-mgmt-btn';
        btn.textContent = btnConfig.text;
        btn.style.cssText = `
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border: 1px solid rgba(${parseInt(btnConfig.color.slice(1,3), 16)}, ${parseInt(btnConfig.color.slice(3,5), 16)}, ${parseInt(btnConfig.color.slice(5,7), 16)}, 0.5);
          border-radius: 6px;
          color: ${btnConfig.color};
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.3s ease;
          background: rgba(${parseInt(btnConfig.color.slice(1,3), 16)}, ${parseInt(btnConfig.color.slice(3,5), 16)}, ${parseInt(btnConfig.color.slice(5,7), 16)}, 0.1);
          margin-right: 8px;
        `;
        
        // Hover effects
        btn.onmouseover = () => {
          btn.style.background = `rgba(${parseInt(btnConfig.color.slice(1,3), 16)}, ${parseInt(btnConfig.color.slice(3,5), 16)}, ${parseInt(btnConfig.color.slice(5,7), 16)}, 0.2)`;
          btn.style.borderColor = `rgba(${parseInt(btnConfig.color.slice(1,3), 16)}, ${parseInt(btnConfig.color.slice(3,5), 16)}, ${parseInt(btnConfig.color.slice(5,7), 16)}, 0.8)`;
        };
        btn.onmouseout = () => {
          btn.style.background = `rgba(${parseInt(btnConfig.color.slice(1,3), 16)}, ${parseInt(btnConfig.color.slice(3,5), 16)}, ${parseInt(btnConfig.color.slice(5,7), 16)}, 0.1)`;
          btn.style.borderColor = `rgba(${parseInt(btnConfig.color.slice(1,3), 16)}, ${parseInt(btnConfig.color.slice(3,5), 16)}, ${parseInt(btnConfig.color.slice(5,7), 16)}, 0.5)`;
        };
        
        // Click handlers
        btn.onclick = (e) => {
          e.preventDefault();
          e.stopPropagation();
          handleAdminButtonClick(btnConfig.id, btnConfig.text);
        };
        
        // Insert before login button if possible, otherwise append
        const loginBtn = header.querySelector('[data-testid="button-login"]') || 
                        header.querySelector('button, a');
        console.log('[addTrickManagementButtons] Login button for insertion:', loginBtn);
        if (loginBtn && loginBtn.parentNode === header) {
          console.log('[addTrickManagementButtons] Inserting before login button');
          header.insertBefore(btn, loginBtn);
        } else {
          console.log('[addTrickManagementButtons] Appending to header');
          header.appendChild(btn);
        }
        console.log('[addTrickManagementButtons] Button added:', btnConfig.id);
      });
      console.log('[addTrickManagementButtons] All buttons created successfully');
    } catch(e) {
      console.error('[addTrickManagementButtons] Error:', e);
    }
  }
  
  // Refresh admin link when user changes
  // No admin link in public build
  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initUI);
  } else { initUI(); }
  window.addEventListener('fake-auth-changed', replaceExistingSignIns);
  // close popup when clicking outside
  document.addEventListener('click', function(ev){
    const popup = document.getElementById('fake-auth-popup');
    if (!popup) return;
    if (popup.style.display !== 'block') return;
    const target = ev.target;
    if (!popup.contains(target) && !document.querySelector('[data-testid="button-login"]')?.contains(target)){
      popup.style.display = 'none';
    }
  });

  // Expose helpers for debugging
  window.__tricklist_local_auth = {
    getUser, setUser, clearUser, getLearned, saveLearned, getScores, saveScores, getTotalScore
  };
  
  // Expose openAuthModal globally for the React app
  window.openAuthModal = openAuthModal;
  
  // Initialize owner account on load
  initOwnerAccount();

})();


