
/* ===== 新品建檔／自動編號（共用品號 RD-0001 格式） ===== */
const KEY_PREFIX_='RD-';
function masterCols_(s){const h=s.getRange(1,1,1,s.getLastColumn()).getValues()[0],ix=n=>h.indexOf(n),u=ix('單位');return {w:h.length,seq:ix('原始序號'),sku:ix('料號'),cc:ix('分類代碼'),cat:ix('分類'),name:ix('品名'),unit:u>=0?u:12,key:ix('固定共用品號'),photo:ix('商品圖片'),thumb:ix('手機縮圖資料〔系統〕')};}
function keyNum_(k){const m=String(k).match(/^(?:KYX|RD)-(\d+)$/);return m?Number(m[1]):0;}
function cloneRow_(sh,from,to,w){if(sh.getMaxRows()<to)sh.insertRowsAfter(sh.getMaxRows(),to-sh.getMaxRows());else{const tr=sh.getRange(to,1,1,w),tv=tr.getValues()[0],tf=tr.getFormulas()[0];if(tv.some((x,i)=>!tf[i]&&x!==''))sh.insertRowAfter(to-1);}const src=sh.getRange(from,1,1,w),f=src.getFormulas()[0];src.copyTo(sh.getRange(to,1,1,w));f.forEach((x,c)=>{if(!x)sh.getRange(to,c+1).setValue('');});return f;}
function ensureBranchRows_(sh,b,keys){const n=sh.getLastRow(),w=sh.getLastColumn();if(n<2)return 0;const vals=sh.getRange(2,1,n-1,w).getValues(),have=new Set(vals.map(r=>String(r[8]).trim()).filter(String));const miss=keys.filter(k=>!have.has(k));if(!miss.length)return 0;
 let tpl=0,maxNo=0;const re=new RegExp('^'+b+'-(\\d+)');vals.forEach((r,i)=>{if(String(r[8]).trim())tpl=i+2;const m=String(r[0]).match(re);if(m)maxNo=Math.max(maxNo,Number(m[1]));});if(!tpl)throw Error(b+' 庫存表沒有範本列');
 let row=tpl;miss.forEach(k=>{row++;const f=cloneRow_(sh,tpl,row,w);maxNo++;const code=b+'-'+String(maxNo).padStart(4,'0');
  if(f[0])sh.getRange(row,1).setFormula('="'+code+' | "&D'+row);else sh.getRange(row,1).setValue(code);
  if(f[2])sh.getRange(row,3).setFormula(f[2].replace(/id=RD[1-6]-\d+/,'id='+code));
  sh.getRange(row,9).setValue(k);});return miss.length;}
function ensureItems_(){const db=db_(),s=db.getSheetById(251646983),c=masterCols_(s);if(c.key<0||c.name<0)return {keys:0,branchRows:0};let n=s.getLastRow();if(n<2)return {keys:0,branchRows:0};
 const filled=r=>String(r[c.name]).trim()&&(c.cc<0||String(r[c.cc]).trim());
 let v=s.getRange(2,1,n-1,c.w).getValues();
 // 0 分類代碼／分類空白時自動補：有分類名稱就對應代碼；兩者都空白就沿用上一列（插在哪一類就歸哪一類）
 if(c.cc>=0){const c2n={},n2c={};v.forEach(r=>{const cc=String(r[c.cc]).trim().toUpperCase(),cat=c.cat>=0?String(r[c.cat]).trim():'';if(cc&&cat){if(!(cc in c2n))c2n[cc]=cat;if(!(cat in n2c))n2c[cat]=cc;}});
  v.forEach((r,i)=>{if(!String(r[c.name]).trim())return;let cc=String(r[c.cc]).trim().toUpperCase(),cat=c.cat>=0?String(r[c.cat]).trim():'';
   if(!cc&&cat&&n2c[cat])cc=n2c[cat];
   if(!cc&&!cat){for(let j=i-1;j>=0&&!cc;j--){if(String(v[j][c.name]).trim()&&String(v[j][c.cc]).trim()){cc=String(v[j][c.cc]).trim().toUpperCase();cat=c.cat>=0?String(v[j][c.cat]).trim():'';}}for(let j=i+1;j<v.length&&!cc;j++){if(String(v[j][c.name]).trim()&&String(v[j][c.cc]).trim()){cc=String(v[j][c.cc]).trim().toUpperCase();cat=c.cat>=0?String(v[j][c.cat]).trim():'';}}}
   if(cc&&!cat&&c2n[cc])cat=c2n[cc];
   if(cc&&cc!==String(r[c.cc]).trim()){r[c.cc]=cc;s.getRange(i+2,c.cc+1).setValue(cc);}
   if(c.cat>=0&&cat&&cat!==String(r[c.cat]).trim()){r[c.cat]=cat;s.getRange(i+2,c.cat+1).setValue(cat);}});}
 let maxKey=0;v.forEach(r=>{maxKey=Math.max(maxKey,keyNum_(r[c.key]));});
 // 1 共用品號：補缺號、修正複製造成的重複號
 const seen={};let keys=0;v.forEach((r,i)=>{if(!filled(r))return;let k=String(r[c.key]).trim();if(k&&!seen[k]){seen[k]=1;return;}maxKey++;k=KEY_PREFIX_+String(maxKey).padStart(4,'0');seen[k]=1;s.getRange(i+2,c.key+1).setValue(k);r[c.key]=k;keys++;});
 // 2 依分類代碼歸位（同分類維持原先後順序；用移動整列，不破壞公式與圖片）
 let moved=0;if(c.cc>=0){const ccOf=i=>String(v[i][c.cc]).trim().toUpperCase(),slots=[],rank={};v.forEach((r,i)=>{if(filled(r)){slots.push(i);const k=ccOf(i);if(!(k in rank))rank[k]=Object.keys(rank).length;}});
  const want=slots.slice().sort((x,y)=>(rank[ccOf(x)]-rank[ccOf(y)])||(x-y)),target=v.map((_,i)=>i);slots.forEach((sl,j)=>{target[sl]=want[j];});
  const phys=v.map((_,i)=>i);for(let t=0;t<phys.length;t++){if(phys[t]===target[t])continue;const at=phys.indexOf(target[t]);s.moveRows(s.getRange((at+2)+':'+(at+2)),t+2);phys.splice(t,0,phys.splice(at,1)[0]);moved++;}
  if(moved){SpreadsheetApp.flush();n=s.getLastRow();v=s.getRange(2,1,n-1,c.w).getValues();}}
 // 3 原始序號 1..N、料號依分類流水重編（只改不同的格，並留紀錄）
 const fsA=c.seq>=0?s.getRange(2,c.seq+1,n-1,1).getFormulas():null,fsB=c.sku>=0?s.getRange(2,c.sku+1,n-1,1).getFormulas():null;let seq=0;const cnt={},log=[];
 v.forEach((r,i)=>{if(!filled(r))return;seq++;if(c.seq>=0&&!fsA[i][0]&&String(r[c.seq])!==String(seq))s.getRange(i+2,c.seq+1).setValue(seq);
  if(c.sku>=0&&c.cc>=0&&!fsB[i][0]){const p=String(r[c.cc]).trim().toUpperCase();if(/^[A-Z]{1,4}$/.test(p)){cnt[p]=(cnt[p]||0)+1;const sku=p+String(cnt[p]).padStart(4,'0');if(String(r[c.sku]).trim()!==sku){log.push([new Date(),String(r[c.key]),String(r[c.name]),String(r[c.sku]),sku]);s.getRange(i+2,c.sku+1).setValue(sku);r[c.sku]=sku;}}}});
 if(log.length){let lg=db.getSheetByName('料號變更紀錄');if(!lg){lg=db.insertSheet('料號變更紀錄');lg.getRange(1,1,1,5).setValues([['時間','共用品號','品名','原料號','新料號']]);}lg.getRange(lg.getLastRow()+1,1,log.length,5).setValues(log);}
 // 4 六個廠補列
 const all=v.filter(r=>filled(r)&&String(r[c.key]).trim()).map(r=>String(r[c.key]).trim());let branchRows=0;
 for(let k=1;k<=6;k++){const sh=branch_(db,'RD'+k);if(sh)branchRows+=ensureBranchRows_(sh,'RD'+k,all);}
 if(keys||moved||log.length||branchRows)SpreadsheetApp.flush();return {keys,moved,renumbered:log.length,branchRows};}

function isAdmin_(u){return u.grants.some(r=>r[2]==='管理員');}
function itemMeta(){const db=db_(),u=identity_(db);if(!isAdmin_(u))throw Error('僅管理員可新品建檔');const s=db.getSheetById(251646983),c=masterCols_(s),v=rows_(s);const cats={},units={},items=[];
 v.forEach(r=>{const cc=String(r[c.cc]||'').trim().toUpperCase(),sku=String(r[c.sku]||'').trim();if(cc){const m=sku.match(/^([A-Z]{1,4})(\d+)$/);cats[cc]=cats[cc]||{code:cc,name:String(r[c.cat]||''),next:0,count:0};cats[cc].count++;if(m&&m[1]===cc)cats[cc].next=Math.max(cats[cc].next,Number(m[2]));}
  const un=String(r[c.unit]||'').trim();if(un)units[un]=(units[un]||0)+1;if(String(r[c.name]).trim())items.push({sku,name:String(r[c.name]).trim(),key:String(r[c.key]||'')});});
 return {categories:Object.values(cats).map(x=>({code:x.code,name:x.name,count:x.count,nextSku:x.code+String(x.next+1).padStart(4,'0')})).sort((a,b)=>a.code<b.code?-1:1),units:Object.keys(units).sort((a,b)=>units[b]-units[a]),items};}
function createItem(p){const db=db_(),u=identity_(db);if(!isAdmin_(u))throw Error('僅管理員可新品建檔');const clean=x=>String(x==null?'':x).trim();
 const name=clean(p.name),unit=clean(p.unit),cc=clean(p.catCode).toUpperCase(),cat=clean(p.catName);let sku=clean(p.sku).toUpperCase();
 if(!name||/^[=+@-]/.test(name))throw Error('請填品名規格');if(!unit||/^[=+@-]/.test(unit))throw Error('請填單位');if(!/^[A-Z]{1,4}$/.test(cc))throw Error('分類代碼需為 1～4 個英文字母');if(sku&&!/^[A-Z]{1,4}\d{3,6}$/.test(sku))throw Error('料號格式錯誤，例如 VL0031');
 const lock=LockService.getScriptLock();lock.waitLock(30000);try{const s=db.getSheetById(251646983),c=masterCols_(s),v=rows_(s);
  if(sku&&v.some(r=>String(r[c.sku]).trim().toUpperCase()===sku))throw Error('料號已存在：'+sku);
  if(!p.force&&v.some(r=>String(r[c.name]).trim()===name))throw Error('已有相同品名的料號，確定要新增請勾選「仍要新增」');
  let tpl=0;v.forEach((r,i)=>{if(String(r[c.key]).trim())tpl=i+2;});if(!tpl)throw Error('主檔沒有範本列');const row=tpl+1;
  const f=cloneRow_(s,tpl,row,c.w);const set=(col,val)=>{if(col>=0&&!f[col])s.getRange(row,col+1).setValue(val);};
  set(c.sku,sku);set(c.cc,cc);set(c.cat,cat);set(c.name,name);set(c.unit,unit);
  const ph=String(p.photo||'');if(/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(ph)&&ph.length<120000){set(c.thumb,ph);if(c.photo>=0&&!f[c.photo]){try{s.getRange(row,c.photo+1).setValue(SpreadsheetApp.newCellImage().setSourceUrl(ph).setAltTextTitle(name).build());}catch(e){}}}
  SpreadsheetApp.flush();const r1=ensureItems_();const out=s.getRange(row,1,1,c.w).getValues()[0],key=String(out[c.key]);
  if(p.branch&&/^RD[1-6]$/.test(p.branch)&&(clean(p.area)||p.safety!==''&&p.safety!=null)){const sh=branch_(db,p.branch),bv=rows_(sh);bv.forEach((r,i)=>{if(String(r[8]).trim()===key){if(clean(p.area))sh.getRange(i+2,5).setValue(clean(p.area));const sf=Number(p.safety);if(p.safety!==''&&Number.isFinite(sf)&&sf>=0)sh.getRange(i+2,7).setValue(sf);}});}
  const codes={};for(let k=1;k<=6;k++){const b='RD'+k,sh=branch_(db,b);rows_(sh).forEach(r=>{if(String(r[8]).trim()===key)codes[b]=String(r[0]).split('|')[0].trim();});}
  return {key,sku:String(out[c.sku]),name,unit,codes,branchRows:r1.branchRows};}finally{lock.releaseLock();}}
function migrateKeysToRD(){const lock=LockService.getScriptLock();lock.waitLock(30000);try{const db=db_(),map={},conv=x=>{const m=String(x).match(/^KYX-(\d+)$/);if(!m)return x;const y=KEY_PREFIX_+m[1];map[x]=y;return y;};let n=0;
 const fix=(sh,col)=>{const last=sh.getLastRow();if(last<2)return;const rg=sh.getRange(2,col,last-1,1),vals=rg.getValues(),fs=rg.getFormulas();let ch=false;const out=vals.map((r,i)=>{if(fs[i][0])return [fs[i][0]];const y=conv(r[0]);if(y!==r[0]){ch=true;n++;}return [y];});if(ch)rg.setValues(out);};
 const s=db.getSheetById(251646983),c=masterCols_(s);fix(s,c.key+1);for(let k=1;k<=6;k++)fix(branch_(db,'RD'+k),9);fix(db.getSheetByName('庫存流水帳'),8);
 let bk=db.getSheetByName('共用品號對照_KYX→RD');if(!bk)bk=db.insertSheet('共用品號對照_KYX→RD');bk.clear();const rows=[['原共用品號','新共用品號','轉換時間']].concat(Object.keys(map).sort().map(k=>[k,map[k],new Date()]));bk.getRange(1,1,rows.length,3).setValues(rows);
 SpreadsheetApp.flush();return {changedCells:n,keys:Object.keys(map).length};}finally{lock.releaseLock();}}
