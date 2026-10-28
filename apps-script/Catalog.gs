
/* ===== 手機預載物料清單（掃碼即時顯示用） ===== */
function catalog(b){const db=db_(),u=identity_(db);permit_(u,b,false);
const ms=typeof db.getSheetById==='function'?db.getSheetById(251646983):db.getSheetByName('「庫存表」的副本');if(!ms)throw Error('找不到物料主檔');
const width=ms.getLastColumn(),last=ms.getLastRow(),headers=ms.getRange(1,1,1,width).getValues()[0]||[],modern=headers.includes('料號')&&headers.includes('品名'),index=(n,f)=>{const i=headers.indexOf(n);return i<0?f:i};
const keyCol=index('固定共用品號',modern?13:9),nameCol=index(modern?'品名':'商品名稱',3),unitCol=index('單位',modern?12:8),photoCol=index('商品圖片',modern?5:1),cacheCol=index('手機縮圖資料〔系統〕',modern?14:10),skuCol=modern?index('料號',0):-1,catCol=modern?index('分類',2):-1;
const mrows=last<2?[]:ms.getRange(2,1,last-1,width).getValues(),pv=last<2?[]:ms.getRange(2,photoCol+1,last-1,1).getValues(),pf=last<2?[]:ms.getRange(2,photoCol+1,last-1,1).getFormulas();
const mm={},cnt={};mrows.forEach((r,i)=>{[r[keyCol],modern?r[skuCol]:null].forEach(k=>{if(k===''||k==null)return;cnt[k]=(cnt[k]||0)+1;mm[k]=i;});});
const pic=i=>{const c=mrows[i][cacheCol];if(typeof c==='string'&&c.startsWith('data:image/jpeg;base64,'))return c;const v=pv[i][0];try{if(v&&typeof v.getContentUrl==='function')return v.getContentUrl();}catch(e){}if(typeof v==='string'&&/^https:\/\//.test(v))return v;const m=String(pf[i][0]||'').match(/IMAGE\(\s*"(https:\/\/[^"\s]+)"/i);return m?m[1]:'';};
const ledger=rows_(db.getSheetByName('庫存流水帳')),week=countWeek_(),sum={},init={},latest={},ret={},appr={};
ledger.forEach(r=>{const c=r[7],q=Number(r[8]);if(r[6]===b)sum[c]=(sum[c]||0)+q;if(r[5]===b)sum[c]=(sum[c]||0)-q;if(r[4]==='盤點調整'){appr[r[10]]=1;if(r[6]===b&&r[13]==='INITIAL_COUNT')init[c]=1;}if(r[4]==='盤點退回')ret[r[10]]=1;if(r[4]==='盤點提報'&&r[9]==='COUNT:'+b){const t=recordTime_(r);if(t>=week.start&&t<week.end)latest[c]=r;}});
const brows=rows_(branch_(db,b)),seen={};brows.forEach(r=>{[String(r[0]).split('|')[0].trim(),r[8]].forEach(k=>{if(k!==''&&k!=null)seen[k]=(seen[k]||0)+1;});});
const items=[];brows.forEach(r=>{const code=r[8];if(code===''||code==null||seen[code]!==1||cnt[code]!==1)return;const i=mm[code],mr=mrows[i],lr=latest[code];if(mr[keyCol]!==code)return;
 let balance=null;if(init[code])balance=sum[code]||0;else if(typeof r[10]==='number'&&Number.isFinite(r[10])&&r[10]>=0)balance=r[10]+(sum[code]||0);
 const legacy=String(r[0]).split('|')[0].trim();
 items.push({code,sku:modern?mr[skuCol]:mr[keyCol],legacy,category:modern?mr[catCol]:'',common:code,name:mr[nameCol],unit:mr[unitCol]||'',image:pic(i),location:r[4]||'',balance,
  countState:{week:week.id,latest:lr?{id:lr[0],quantity:lr[8],unit:lr[12],employee:lr[25]||lr[3],time:new Date(recordTime_(lr)).toISOString(),returned:!!ret[lr[0]],approved:!!appr[lr[0]]}:null},
  keys:[code,/^(RD[1-6]-|RD-|KYX-)/.test(legacy)&&seen[legacy]===1?legacy:null,modern&&cnt[mr[skuCol]]===1&&!/^(RD[1-6]-|RD-|KYX-)/.test(String(mr[skuCol]))?mr[skuCol]:null].filter(k=>k!==''&&k!=null).map(String)});});
return {branch:b,week:week.id,at:Date.now(),items};}
