// EZ Sens desktop shell (Electron). Loads the bundled single-file app fully offline.
const { app, BrowserWindow, Menu, protocol, session, ipcMain, dialog, shell } = require('electron');
const path = require('path'), fs = require('fs');

const cfgFile = () => path.join(app.getPath('userData'), 'ezsens-desktop.json');
function readCfg(){ try { return Object.assign({ unlockFps:false, borderless:false }, JSON.parse(fs.readFileSync(cfgFile(),'utf8'))); } catch { return { unlockFps:false, borderless:false }; } }
function writeCfg(c){ fs.mkdirSync(path.dirname(cfgFile()),{recursive:true}); fs.writeFileSync(cfgFile(), JSON.stringify(c,null,2)); }
let cfg = readCfg();

// GPU / frame pacing switches must be set before 'ready'
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
if (cfg.unlockFps) {
  app.commandLine.appendSwitch('disable-frame-rate-limit');
  app.commandLine.appendSwitch('disable-gpu-vsync');
}

// Serve the app from a privileged, secure custom scheme (keeps localStorage stable and enables secure-context APIs)
protocol.registerSchemesAsPrivileged([{ scheme:'ezsens', privileges:{ standard:true, secure:true, supportFetchAPI:true, corsEnabled:true } }]);
const WEB = path.join(__dirname, 'web');

let win;
function relaunchPrompt(){
  dialog.showMessageBox(win,{ type:'info', buttons:['Restart now','Later'], defaultId:0, title:'EZ Sens',
    message: cfg.unlockFps ? 'FPS will be unlocked (no vsync, no frame-rate limit) after a restart.' : 'FPS will follow your monitor refresh rate again after a restart.' })
  .then(r=>{ if(r.response===0){ app.relaunch(); app.exit(0); } });
}
function setUnlock(on){ cfg.unlockFps=!!on; writeCfg(cfg); buildMenu(); relaunchPrompt(); }
function buildMenu(){
  const tpl=[
    { label:'EZ Sens', submenu:[ { label:'Reload', accelerator:'CmdOrCtrl+R', click:()=>win&&win.reload() }, { type:'separator' }, { role:'quit', label:'Quit EZ Sens' } ] },
    { label:'View', submenu:[
      { label:'Toggle Fullscreen', accelerator:'F11', click:()=>win&&win.setFullScreen(!win.isFullScreen()) },
      { label:'Start in borderless fullscreen', type:'checkbox', checked:cfg.borderless, click:(m)=>{ cfg.borderless=m.checked; writeCfg(cfg); if(win) win.setFullScreen(m.checked); } },
      { type:'separator' },
      { label:'Unlock FPS (beyond monitor refresh, restart)', type:'checkbox', checked:cfg.unlockFps, click:(m)=>setUnlock(m.checked) },
      { type:'separator' },
      { label:'Zoom In', role:'zoomIn' }, { label:'Zoom Out', role:'zoomOut' }, { label:'Actual Size', role:'resetZoom' },
      { label:'Developer Tools', accelerator:'CmdOrCtrl+Shift+I', click:()=>win&&win.webContents.toggleDevTools() } ] },
    { label:'Help', submenu:[ { label:'Project page', click:()=>shell.openExternal('https://github.com/chatzo22/ez-sens') } ] }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(tpl));
}

app.whenReady().then(()=>{
  protocol.handle('ezsens', req=>{
    const u=new URL(req.url); let p=decodeURIComponent(u.pathname); if(p==='/'||p==='') p='/index.html';
    const f=path.normalize(path.join(WEB,p)); if(!f.startsWith(WEB)) return new Response('forbidden',{status:403});
    try{ const type=f.endsWith('.html')?'text/html; charset=utf-8':f.endsWith('.png')?'image/png':'application/octet-stream';
      return new Response(fs.readFileSync(f),{status:200,headers:{'content-type':type}}); }catch{ return new Response('not found',{status:404}); }
  });
  // Allow pointer lock (raw input) and fullscreen; deny everything else
  session.defaultSession.setPermissionRequestHandler((wc,perm,cb)=>cb(['pointerLock','fullscreen','clipboard-sanitized-write'].includes(perm)));
  session.defaultSession.setPermissionCheckHandler((wc,perm)=>['pointerLock','fullscreen','clipboard-sanitized-write'].includes(perm));
  // Block all network requests except our own scheme / blob / data (fully offline)
  session.defaultSession.webRequest.onBeforeRequest((d,cb)=>cb({ cancel: !/^(ezsens|blob|data|devtools|chrome-extension):/.test(d.url) }));

  ipcMain.handle('ezsens:get', ()=>({ unlockFps:cfg.unlockFps, borderless:cfg.borderless, version:app.getVersion() }));
  ipcMain.handle('ezsens:setUnlock', (e,on)=>{ setUnlock(on); return true; });
  ipcMain.handle('ezsens:fullscreen', ()=>{ if(win) win.setFullScreen(!win.isFullScreen()); return win&&win.isFullScreen(); });

  win=new BrowserWindow({ width:1400, height:900, minWidth:900, minHeight:600, title:'EZ Sens', backgroundColor:'#0a0d12', show:false,
    icon:path.join(__dirname,'build','icon.png'), fullscreen:!!cfg.borderless, autoHideMenuBar:false,
    webPreferences:{ preload:path.join(__dirname,'preload.js'), contextIsolation:true, nodeIntegration:false, sandbox:true, backgroundThrottling:false, spellcheck:false } });
  win.webContents.setWindowOpenHandler(({url})=>{ if(/^https:\/\//.test(url)) shell.openExternal(url); return { action:'deny' }; });
  win.webContents.on('will-navigate',(e,url)=>{ if(!url.startsWith('ezsens://')){ e.preventDefault(); if(/^https:\/\//.test(url)) shell.openExternal(url); } });
  win.once('ready-to-show',()=>win.show());
  buildMenu();
  win.loadURL('ezsens://app/index.html');
  if(process.env.EZSENS_SMOKE){ // CI / headless smoke test: report and quit
    win.webContents.on('console-message',(e)=>{ if(e.level==='error') console.log('RENDERER ERROR:',e.message); });
    win.webContents.once('did-finish-load',()=>setTimeout(async()=>{
      try{ const r=await win.webContents.executeJavaScript(`({ready:document.documentElement.dataset.ready,tab:document.querySelector('#nav button.on').textContent,games:document.querySelectorAll('#conv tr').length,desktop:!!window.ezsensDesktop,hz:window.EZ&&EZ.frame.hz,perf:document.querySelector('#perfInfo').innerText})`);
        console.log('SMOKE', JSON.stringify(r)); }catch(err){ console.log('SMOKE FAIL', err.message); }
      app.quit(); }, +process.env.EZSENS_SMOKE||4000));
  }
});
app.on('window-all-closed',()=>app.quit());
