// Fake auth shim for local mirror: adds Sign In UI and intercepts fetch
// Version: 2025-12-30-v3 - All debug messages removed
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
  function setUser(u){ 
    // Set expiration to 1 year from now
    const expiresAt = new Date().getTime() + (365 * 24 * 60 * 60 * 1000);
    u.expiresAt = expiresAt;
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    
    // Track this account as recently used
    addToRecentAccounts(u.email);
  }
  
  function addToRecentAccounts(email) {
    try {
      // Check if recent accounts list needs to be cleared (older than 30 days)
      const lastClearStr = localStorage.getItem('tricklist_recent_accounts_last_clear');
      const lastClear = lastClearStr ? parseInt(lastClearStr) : 0;
      const now = new Date().getTime();
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      
      let recent = [];
      
      // If more than 30 days have passed, clear the list
      if (now - lastClear > thirtyDays) {
        localStorage.setItem('tricklist_recent_accounts_last_clear', now.toString());
        localStorage.removeItem('tricklist_recent_accounts');
      } else {
        const recentStr = localStorage.getItem('tricklist_recent_accounts');
        recent = recentStr ? JSON.parse(recentStr) : [];
      }
      
      // Add email if not already in list, keep unique
      if (!recent.includes(email)) {
        recent.push(email);
      }
      
      // Keep only last 5 accounts
      if (recent.length > 5) {
        recent = recent.slice(-5);
      }
      
      localStorage.setItem('tricklist_recent_accounts', JSON.stringify(recent));
    } catch(e) {}
  }
  function clearUser(){ localStorage.removeItem(USER_KEY); }

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

  // Simple on-page logger for debugging inside Simple Browser
  function ensureDebugPanel(){
    // Debug panel completely disabled
    return null;
  }

  function debug(msg){
    // Debug completely disabled
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
    let modal = document.getElementById('fake-auth-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'fake-auth-modal';
      modal.style.position = 'fixed';
      modal.style.top = '0';
      modal.style.left = '0';
      modal.style.width = '100%';
      modal.style.height = '100%';
      modal.style.background = 'rgba(0,0,0,0.8)';
      modal.style.display = 'flex';
      modal.style.alignItems = 'center';
      modal.style.justifyContent = 'center';
      modal.style.zIndex = '99999';
      
      const content = document.createElement('div');
      content.style.background = '#0a0f1a';
      content.style.borderRadius = '8px';
      content.style.padding = '40px';
      content.style.maxWidth = '400px';
      content.style.width = '90%';
      content.style.color = 'white';
      content.style.border = '1px solid rgba(255,255,255,0.1)';
      
      let isSignUp = false;
      
      function renderAuthForm() {
        content.innerHTML = '';
        
        const title = document.createElement('h2');
        title.textContent = isSignUp ? 'Create Account' : 'Sign In';
        title.style.marginTop = '0';
        title.style.marginBottom = '24px';
        title.style.textAlign = 'center';
        content.appendChild(title);
        
        // Email input
        const emailLabel = document.createElement('label');
        emailLabel.textContent = 'Email:';
        emailLabel.style.display = 'block';
        emailLabel.style.fontSize = '12px';
        emailLabel.style.marginBottom = '4px';
        content.appendChild(emailLabel);
        
        const emailInput = document.createElement('input');
        emailInput.type = 'email';
        emailInput.placeholder = 'your@email.com';
        emailInput.style.width = '100%';
        emailInput.style.padding = '10px';
        emailInput.style.marginBottom = '16px';
        emailInput.style.borderRadius = '4px';
        emailInput.style.border = '1px solid rgba(255,255,255,0.2)';
        emailInput.style.background = '#0a0f1a';
        emailInput.style.color = 'white';
        emailInput.style.boxSizing = 'border-box';
        content.appendChild(emailInput);
        
        // Password input
        const passwordLabel = document.createElement('label');
        passwordLabel.textContent = 'Password:';
        passwordLabel.style.display = 'block';
        passwordLabel.style.fontSize = '12px';
        passwordLabel.style.marginBottom = '4px';
        content.appendChild(passwordLabel);
        
        const passwordInput = document.createElement('input');
        passwordInput.type = 'password';
        passwordInput.placeholder = 'password';
        passwordInput.style.width = '100%';
        passwordInput.style.padding = '10px';
        passwordInput.style.marginBottom = '8px';
        passwordInput.style.borderRadius = '4px';
        passwordInput.style.border = '1px solid rgba(255,255,255,0.2)';
        passwordInput.style.background = '#0a0f1a';
        passwordInput.style.color = 'white';
        passwordInput.style.boxSizing = 'border-box';
        content.appendChild(passwordInput);
        
        // Error message
        const msgDiv = document.createElement('div');
        msgDiv.style.fontSize = '12px';
        msgDiv.style.minHeight = '16px';
        msgDiv.style.color = '#ff8888';
        msgDiv.style.marginBottom = '16px';
        content.appendChild(msgDiv);
        
        // Submit button
        const submitBtn = document.createElement('button');
        submitBtn.textContent = isSignUp ? 'Create Account' : 'Sign In';
        submitBtn.style.width = '100%';
        submitBtn.style.padding = '10px';
        submitBtn.style.borderRadius = '4px';
        submitBtn.style.background = '#00f5ff';
        submitBtn.style.color = '#000';
        submitBtn.style.border = 'none';
        submitBtn.style.cursor = 'pointer';
        submitBtn.style.fontWeight = 'bold';
        submitBtn.style.marginBottom = '16px';
        submitBtn.onclick = function(e) {
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
            provider: 'email',
            isOwner: email.toLowerCase() === OWNER_EMAIL.toLowerCase()
          };
          setUser(newUser);
          debug((isSignUp ? 'Account created: ' : 'Signed in: ') + email);
          window.location.reload();
        };
        content.appendChild(submitBtn);
        
        // Google sign-in button
        const googleBtn = document.createElement('button');
        googleBtn.textContent = 'Recent Sign In';
        googleBtn.style.width = '100%';
        googleBtn.style.padding = '10px';
        googleBtn.style.borderRadius = '4px';
        googleBtn.style.background = '#4285F4';
        googleBtn.style.color = 'white';
        googleBtn.style.border = 'none';
        googleBtn.style.cursor = 'pointer';
        googleBtn.style.fontWeight = 'bold';
        googleBtn.style.marginBottom = '16px';
        googleBtn.type = 'button';
        googleBtn.onclick = function(e) {
          e.preventDefault();
          handleGoogleSignIn();
        };
        content.appendChild(googleBtn);
        
        // Toggle between sign in and sign up
        const toggleDiv = document.createElement('div');
        toggleDiv.style.fontSize = '12px';
        toggleDiv.style.textAlign = 'center';
        toggleDiv.style.borderTop = '1px solid rgba(255,255,255,0.1)';
        toggleDiv.style.paddingTop = '16px';
        
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
          renderAuthForm();
        };
        toggleDiv.appendChild(toggleLink);
        content.appendChild(toggleDiv);
      }
      
      renderAuthForm();
      modal.appendChild(content);
      document.body.appendChild(modal);
      modal.onclick = function(e) {
        if (e.target === modal) {
          closeAuthModal();
        }
      };
    } else {
      modal.style.display = 'flex';
    }
  }

  function closeAuthModal(){
    const modal = document.getElementById('fake-auth-modal');
    if (modal) modal.style.display = 'none';
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
                if (n.id === 'fake-signin-btn') { if (n.parentNode) n.parentNode.removeChild(n); continue; }
                // also check descendants
                if (n.querySelector){ const found = n.querySelector('#fake-signin-btn'); if (found && found.parentNode) found.parentNode.removeChild(found); }
              }catch(e){}
            }
          }
        }
      });
      try{ mo.observe(document.documentElement || document.body, { childList:true, subtree:true }); }catch(e){}
      
      // AGGRESSIVE DEBUG DIV REMOVAL - Remove "Owner check" divs
      function removeOwnerCheckDiv() {
        try {
          const allDivs = document.querySelectorAll('div');
          allDivs.forEach(div => {
            const text = div.textContent || '';
            if (text.includes('Owner check')) {
              if (div.parentNode) {
                div.parentNode.removeChild(div);
              }
            }
          });
        } catch(e) {}
      }
      
      // Run immediately
      removeOwnerCheckDiv();
      
      // Use MutationObserver to catch new divs being added
      const debugObserver = new MutationObserver(() => {
        removeOwnerCheckDiv();
      });
      try {
        debugObserver.observe(document.documentElement || document.body, { 
          childList: true, 
          subtree: true 
        });
      } catch(e) {}
      
      // Also poll as backup
      setInterval(()=>{ 
        removeFloatingBtn(); 
        const debugPanel = document.getElementById('fake-auth-debug');
        if (debugPanel) debugPanel.remove();
        removeOwnerCheckDiv();
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
          el.addEventListener('click', function(ev){ 
            ev.preventDefault(); 
            ev.stopPropagation(); 
            // Trigger the Google Sign-In button instead
            const gsiBtn = document.querySelector('#gsi-btn-container button, #gsi-btn-container div[role="button"]');
            if (gsiBtn) gsiBtn.click();
            return false;
          });
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
      
      createStyle(); removeFloatingBtn(); renderButton(); replaceExistingSignIns(); watchAndRemoveFloating(); observeLoginButton(); addAdminLink(); addTrickManagementButtons(); hideNonOwnerTrickControls(); 
      
      // Continuously remove debug elements and check admin link
      setInterval(() => {
        try {
          const debugPanel = document.getElementById('fake-auth-debug');
          if (debugPanel && debugPanel.parentNode) {
            debugPanel.parentNode.removeChild(debugPanel);
          }
          
          const allDivs = document.querySelectorAll('div');
          allDivs.forEach(div => {
            if ((div.textContent || '').includes('Owner check')) {
              if (div.parentNode) {
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
      
      // Keywords for trick management UI (expanded list)
      const mgmtKeywords = [
        'add trick', 'add', 'edit', 'delete', 'remove', 'import', 'export', 
        'upload', 'download', 'new trick', 'create', '+ trick', '+ add'
      ];
      
      // Find and hide/show trick management buttons
      const allElements = document.querySelectorAll('button, [role="button"], a, [data-testid*="button"]');
      allElements.forEach(el => {
        const text = (el.textContent || '').toLowerCase().trim();
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
        const title = (el.getAttribute('title') || '').toLowerCase();
        const testId = (el.getAttribute('data-testid') || '').toLowerCase();
        
        const isManagementBtn = mgmtKeywords.some(keyword => 
          text.includes(keyword) || 
          ariaLabel.includes(keyword) || 
          title.includes(keyword) ||
          testId.includes(keyword)
        );
        
        if (isManagementBtn) {
          if (!isOwnerUser) {
            // Not owner - hide the button
            el.style.display = 'none !important';
            el.style.visibility = 'hidden';
            el.style.pointerEvents = 'none';
          } else {
            // Is owner - make sure button is visible
            el.style.display = '';
            el.style.visibility = 'visible';
            el.style.pointerEvents = 'auto';
          }
        }
      });
    } catch(e) {}
  }
  
  function addAdminLink(){
    try {
      const user = getUser();
      if (!user || !user.email) return;
      
      const userEmailLower = user.email.toLowerCase().trim();
      const ownerEmailLower = (OWNER_EMAIL || '').toLowerCase().trim();
      
      // Only create link if user IS the owner
      if (userEmailLower !== ownerEmailLower) return;
      
      // Check if link already exists
      if (document.getElementById('fake-auth-admin-link')) return;
      
      // Wait for header to be ready
      setTimeout(() => {
        // Double-check ownership
        const currentUser = getUser();
        if (!currentUser || !currentUser.email) return;
        const currentUserEmailLower = currentUser.email.toLowerCase().trim();
        if (currentUserEmailLower !== ownerEmailLower) return;
        
        // Find header
        const header = document.querySelector('header, nav, [role="navigation"], [class*="header"], [class*="nav"]');
        if (!header) return;
        
        // Check again if link exists
        if (document.getElementById('fake-auth-admin-link')) return;
        
        // Create the link
        const adminLink = document.createElement('a');
        adminLink.id = 'fake-auth-admin-link';
        adminLink.href = '/feedback-dashboard.html';
        adminLink.style.cssText = `
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border: 1px solid rgba(34, 197, 94, 0.5);
          border-radius: 6px;
          color: #86efac;
          font-size: 13px;
          font-weight: 500;
          text-decoration: none;
          cursor: pointer;
          transition: all 0.3s ease;
          background: rgba(34, 197, 94, 0.1);
          margin-right: 12px;
        `;
        adminLink.textContent = 'Feedback Admin';
        
        adminLink.onmouseover = () => {
          adminLink.style.background = 'rgba(34, 197, 94, 0.2)';
          adminLink.style.borderColor = 'rgba(34, 197, 94, 0.8)';
        };
        adminLink.onmouseout = () => {
          adminLink.style.background = 'rgba(34, 197, 94, 0.1)';
          adminLink.style.borderColor = 'rgba(34, 197, 94, 0.5)';
        };
        
        // Insert before login button if possible
        const loginBtn = header.querySelector('a[href*="/api/login"], [data-testid*="login"]') || 
                        Array.from(header.querySelectorAll('button, a')).find(el => el.textContent && el.textContent.toLowerCase().includes('login'));
        if (loginBtn && loginBtn.parentNode) {
          loginBtn.parentNode.insertBefore(adminLink, loginBtn);
        } else {
          header.appendChild(adminLink);
        }
      }, 500);
    } catch(e) { }
  }
  
  function addTrickManagementButtons(){
    try {
      const user = getUser();
      if (!user || !user.email) return;
      
      const userEmailLower = user.email.toLowerCase().trim();
      const ownerEmailLower = (OWNER_EMAIL || '').toLowerCase().trim();
      
      // Only create buttons if user IS the owner
      if (userEmailLower !== ownerEmailLower) return;
      
      // Wait for header to be ready
      setTimeout(() => {
        // Double-check ownership
        const currentUser = getUser();
        if (!currentUser || !currentUser.email) return;
        const currentUserEmailLower = currentUser.email.toLowerCase().trim();
        if (currentUserEmailLower !== ownerEmailLower) return;
        
        // Find header
        const header = document.querySelector('header, nav, [role="navigation"], [class*="header"], [class*="nav"]');
        if (!header) return;
        
        // Define trick management buttons
        const buttons = [
          { id: 'add-trick-btn', text: '+ Add Trick', color: '#3b82f6' },
          { id: 'edit-trick-btn', text: 'Edit Tricks', color: '#f59e0b' },
          { id: 'delete-trick-btn', text: 'Delete Tricks', color: '#ef4444' },
          { id: 'import-trick-btn', text: 'Import', color: '#10b981' },
          { id: 'export-trick-btn', text: 'Export', color: '#8b5cf6' }
        ];
        
        // Create and add each button
        buttons.forEach(btnConfig => {
          // Check if button already exists
          if (document.getElementById(btnConfig.id)) return;
          
          const btn = document.createElement('button');
          btn.id = btnConfig.id;
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
            alert(`${btnConfig.text} feature - Coming soon! Admin only.`);
          };
          
          // Insert before login button if possible
          const loginBtn = header.querySelector('a[href*="/api/login"], [data-testid*="login"]') || 
                          Array.from(header.querySelectorAll('button, a')).find(el => el.textContent && el.textContent.toLowerCase().includes('login'));
          if (loginBtn && loginBtn.parentNode) {
            loginBtn.parentNode.insertBefore(btn, loginBtn);
          } else {
            header.appendChild(btn);
          }
        });
      }, 500);
    } catch(e) { }
  }
          text-decoration: none;
          cursor: pointer;
          transition: all 0.3s ease;
          background: rgba(34, 197, 94, 0.1);
          margin-right: 12px;
        `;
        adminLink.textContent = 'Feedback Admin';
        
        adminLink.onmouseover = () => {
          adminLink.style.background = 'rgba(34, 197, 94, 0.2)';
          adminLink.style.borderColor = 'rgba(34, 197, 94, 0.8)';
        };
        adminLink.onmouseout = () => {
          adminLink.style.background = 'rgba(34, 197, 94, 0.1)';
          adminLink.style.borderColor = 'rgba(34, 197, 94, 0.5)';
        };
        
        // Insert before login button if possible
        const loginBtn = header.querySelector('a[href*="/api/login"], [data-testid*="login"]') || 
                        Array.from(header.querySelectorAll('button, a')).find(el => el.textContent && el.textContent.toLowerCase().includes('login'));
        if (loginBtn) {
          loginBtn.parentNode.insertBefore(adminLink, loginBtn);
        } else {
          buttonContainer.appendChild(adminLink);
        }
      }, 500);
    } catch(e) {
      // On any error, remove the link to be safe
      if (existingLink && existingLink.parentNode) {
        existingLink.parentNode.removeChild(existingLink);
      }
    }
  }
  
  // Refresh admin link when user changes
  window.addEventListener('fake-auth-changed', () => {
    const oldLink = document.getElementById('fake-auth-admin-link');
    if (oldLink) oldLink.remove();
    addAdminLink();
  });
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
  
  // Initialize owner account on load
  initOwnerAccount();

})();


