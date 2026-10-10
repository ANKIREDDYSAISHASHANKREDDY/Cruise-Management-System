'use strict';

async function apiRequest(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type','application/json');
  const response = await fetch(path,{...options,headers,credentials:'same-origin'});
  const data = await response.json().catch(()=>({error:'The server returned an unreadable response.'}));
  if (!response.ok) { const error=new Error(data.error || 'Something went wrong.');error.status=response.status;throw error; }
  return data;
}

window.HarborlineAuth = {
  request: apiRequest,
  current: null,
  async me(){
    try{const r=await apiRequest('/api/me');this.current=r?.user||null;return this.current;}
    catch(error){
      if(error.status===401){try{localStorage.removeItem('harborline.offline.user');localStorage.removeItem('harborline.offline.snapshot.v1');}catch{}return this.current=null;}
      if(navigator.onLine===false||error instanceof TypeError){try{const cached=JSON.parse(localStorage.getItem('harborline.offline.user')||'null');if(cached?.id&&cached?.role){this.current={...cached,offline:true};return this.current;}}catch{}}
      return this.current=null;
    }
  },
  async signOut(){ await apiRequest('/api/auth/logout',{method:'POST',body:'{}'}); this.current=null;try{localStorage.removeItem('harborline.offline.user');localStorage.removeItem('harborline.offline.snapshot.v1');}catch{} },
  showWorkspace(user){
    this.current=user;
    try{localStorage.setItem('harborline.offline.user',JSON.stringify({id:user.id,name:user.name,email:user.email,role:user.role}));}catch{}
    document.getElementById('auth-screen').hidden=true;
    document.getElementById('app-shell').hidden=false;
    document.dispatchEvent(new CustomEvent('harborline:authenticated',{detail:{user}}));
  },
  showSignIn(){
    this.current=null;
    document.getElementById('app-shell').hidden=true;
    document.getElementById('auth-screen').hidden=false;
    setAuthMode('login');
  }
};

const authForms={login:document.getElementById('login-form'),register:document.getElementById('register-form'),resetRequest:document.getElementById('reset-request-form'),resetConfirm:document.getElementById('reset-confirm-form')};
const authCopy={
  login:['WELCOME ABOARD','Sign in to Harborline','Pick up where your next journey begins.'],
  register:['YOUR VOYAGE STARTS HERE','Create your account','A few details, then the planning can begin.'],
  'reset-request':['ACCOUNT ACCESS','Reset your password','We’ll help you get back to your voyage.'],
  'reset-confirm':['ACCOUNT ACCESS','Choose a new password','Enter the one-time reset token from the local server.']
};
function setAuthMode(mode){
  const key=mode==='reset-request'?'resetRequest':mode==='reset-confirm'?'resetConfirm':mode;
  Object.entries(authForms).forEach(([k,form])=>form.hidden=k!==key);
  const copy=authCopy[mode]||authCopy.login;
  document.getElementById('auth-eyebrow').textContent=copy[0];
  document.getElementById('auth-title').textContent=copy[1];
  document.getElementById('auth-subtitle').textContent=copy[2];
  document.getElementById('auth-tabs').hidden=mode==='reset-request'||mode==='reset-confirm';
  document.querySelectorAll('.auth-tab').forEach(tab=>tab.classList.toggle('active',tab.dataset.authMode===mode));
}
function authError(id,message=''){
  const el=document.getElementById(id);if(!el)return;
  el.textContent=message;el.classList.toggle('show',Boolean(message));
}
function busy(button,value){
  if(value){button.dataset.oldText=button.innerHTML;button.disabled=true;button.innerHTML='Please wait…';}
  else{button.disabled=false;if(button.dataset.oldText)button.innerHTML=button.dataset.oldText;delete button.dataset.oldText;}
}
async function submitAuth(button,errorId,operation){
  authError(errorId);busy(button,true);
  try{const result=await operation();if(result?.user)window.HarborlineAuth.showWorkspace(result.user);return result;}
  catch(err){authError(errorId,err.message);return null;}
  finally{busy(button,false);}
}

document.addEventListener('click',async event=>{
  const modeButton=event.target.closest('[data-auth-mode]');
  if(modeButton){event.preventDefault();setAuthMode(modeButton.dataset.authMode);return;}
  const demo=event.target.closest('[data-demo]');
  if(demo){
    const accounts={
      passenger:['passenger@harborline.test','SailAway2026!'],
      crew:['crew@harborline.test','CrewShift2026!'],
      captain:['captain@harborline.test','CaptainShift2026!'],
      manager:['manager@harborline.test','ShipOps2026!']
    };
    const [email,password]=accounts[demo.dataset.demo];
    document.getElementById('login-email').value=email;
    document.getElementById('login-password').value=password;
    const button=document.querySelector('#login-form .auth-submit');
    await submitAuth(button,'login-error',()=>apiRequest('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})}));
    return;
  }
  const info=event.target.closest('[data-static-info]');
  if(info){event.preventDefault();authError('login-error',info.dataset.staticInfo);}
});

document.getElementById('login-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const email=document.getElementById('login-email').value.trim(),password=document.getElementById('login-password').value;
  await submitAuth(event.submitter||event.target.querySelector('.auth-submit'),'login-error',()=>apiRequest('/api/auth/login',{method:'POST',body:JSON.stringify({email,password})}));
});
document.getElementById('register-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const name=document.getElementById('register-name').value.trim(),email=document.getElementById('register-email').value.trim(),password=document.getElementById('register-password').value;
  await submitAuth(event.submitter||event.target.querySelector('.auth-submit'),'register-error',()=>apiRequest('/api/auth/register',{method:'POST',body:JSON.stringify({name,email,password})}));
});
document.getElementById('reset-request-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.submitter||event.target.querySelector('.auth-submit');authError('reset-request-error');busy(button,true);
  try{
    const email=document.getElementById('reset-email').value.trim();
    const result=await apiRequest('/api/auth/reset-request',{method:'POST',body:JSON.stringify({email})});
    setAuthMode('reset-confirm');authError('reset-confirm-error',`${result.message} For this local edition, check the server terminal for a development reset token.`);
  }catch(err){authError('reset-request-error',err.message);}finally{busy(button,false);}
});
document.getElementById('reset-confirm-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.submitter||event.target.querySelector('.auth-submit');authError('reset-confirm-error');busy(button,true);
  try{
    const token=document.getElementById('reset-token').value.trim(),password=document.getElementById('reset-password').value;
    const result=await apiRequest('/api/auth/reset',{method:'POST',body:JSON.stringify({token,password})});
    authError('reset-confirm-error',result.message);setTimeout(()=>setAuthMode('login'),1200);
  }catch(err){authError('reset-confirm-error',err.message);}finally{busy(button,false);}
});
