
/* ===== 入庫／調撥：整單送出與總覽 ===== */
function transactBatch(list){if(!Array.isArray(list)||!list.length||list.length>60)throw Error('明細筆數需為 1～60 筆');const lock=LockService.getScriptLock();lock.waitLock(30000);try{const db=db_();return list.map(p=>{try{const r=post_(db,p);return {ok:true,id:r.id,quantity:r.quantity,message:r.message};}catch(e){return {ok:false,error:(e&&e.message)||String(e)};}});}finally{lock.releaseLock();}}
function movementOverview(b,days){const db=db_(),u=identity_(db);permit_(u,b,false);days=Math.min(Math.max(Number(days)||45,1),120);const since=Date.now()-days*86400000;
const a=rows_(db.getSheetByName('庫存流水帳')),s=db.getSheetById(251646983),h=s.getRange(1,1,1,s.getLastColumn()).getValues()[0],key=h.indexOf('固定共用品號'),sku=h.indexOf('料號'),name=h.indexOf('品名');const mm={};rows_(s).forEach(r=>{if(r[key])mm[r[key]]=r;});
const info=c=>{const m=mm[c];return {sku:m&&sku>=0?m[sku]:c,name:m&&name>=0?m[name]:c};};
const grp=r=>{const m=String(r[1]).match(/^(.{16,})-\d{1,3}$/);return m?m[1]:r[0];};
const closed={},rev={};a.forEach(r=>{if((r[4]==='調撥收貨'||r[4]==='調撥取消')&&r[10])closed[r[10]]={type:r[4],time:recordTime_(r),who:String(r[25]||r[3])};if(r[4]==='沖銷'&&r[10])rev[r[10]]=1;});
const transfers=[],inbound=[];
a.forEach(r=>{const t=recordTime_(r);if(r[4]==='調撥出貨'){const to=String(r[9]).replace(/^TO:/,'');if(r[5]!==b&&to!==b)return;const c=closed[r[0]];if(c&&t<since)return;const i=info(r[7]);transfers.push({id:r[0],group:grp(r),from:r[5],to,code:r[7],sku:i.sku,name:i.name,unit:r[12],qty:r[8],time:t,who:String(r[25]||r[3]),status:c?(c.type==='調撥收貨'?'done':'cancel'):'transit',closedAt:c?c.time:null,closedBy:c?c.who:''});}
 else if(r[4]==='入庫'&&r[6]===b&&t>=since){const i=info(r[7]);inbound.push({id:r[0],doc:String(r[9]),code:r[7],sku:i.sku,name:i.name,unit:r[12],qty:r[8],time:t,who:String(r[25]||r[3]),reversed:!!rev[r[0]]});}});
return {branch:b,days,now:Date.now(),transfers,inbound};}
