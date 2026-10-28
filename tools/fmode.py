"""版本 F：相機常駐＋數字鍵，黑黃高對比配色（套用於盤點頁）"""
CSS = """<style id="fmode">
body,#app{background:#fff}header{background:#111;padding:8px 16px 6px}.headline select{background:#262626;border-color:#525252}
.contextLine button{background:#333}.tabs{background:#111;padding:6px 14px 10px}.tabs a,.tabs button{color:#d4d4d4}
.tabs .active{background:#FACC15;color:#111;font-weight:700}
main{padding:0 16px 12px}.progress{background:#f0f0f0;margin-top:10px}.track{background:#d4d4d4}.track span{background:#111}
.product{margin:8px 0;padding:8px 10px;border-color:#e5e5e5}#productPhoto{width:54px;height:54px}.product h1{font-size:17px;line-height:1.3;margin:0 0 2px}.product .pills{margin-top:3px}
.pill{background:#f0f0f0;color:#262626}#area{background:#FEF08A;color:#111}
#quantityLabel{display:none}.qtyBox{border-color:#111;height:62px}.qtyBox input{color:#111;font-size:36px;font-weight:700}
.step{width:56px;border-color:#d4d4d4;color:#111}.primary{background:#111;color:#FACC15;font-size:18px;min-height:54px}
.status{background:#FACC15;color:#111}.preview{background:#fef9c3;color:#111}
.listFilters button.active{background:#111;color:#FACC15}.listItem>span:first-child{color:#111}
#scanButton{display:none}
#camDock{position:relative;height:140px;margin:0 -16px;background:#262626;overflow:hidden;cursor:pointer}
#camDock video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;border:0;border-radius:0;max-height:none}
.camFrame{position:absolute;left:50%;top:50%;width:220px;height:118px;transform:translate(-50%,-50%);border:3px solid #FACC15;border-radius:14px;pointer-events:none}
#camDock video[hidden]~.camFrame{display:none}
#camIdle{position:absolute;left:0;right:0;top:50%;transform:translateY(-50%);color:#d4d4d4;font-size:14px;text-align:center;pointer-events:none}
#camMsg{position:absolute;left:8px;right:8px;bottom:6px;margin:0;color:#FACC15;font-size:12px;text-align:center;white-space:pre-wrap;text-shadow:0 1px 2px #000;pointer-events:none}
#camDock .photoLink{position:absolute;right:8px;top:8px;margin:0;min-height:32px;line-height:32px;padding:0 10px;background:rgba(0,0,0,.55);border-radius:8px;color:#fff;text-decoration:none;font-size:12px}
#keypad{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:10px}
#keypad button{min-height:48px;font-size:26px;font-weight:700;background:#f0f0f0;color:#111;border-radius:12px;padding:0}
#keypad button[data-k=C],#keypad button[data-k=B]{background:#e5e5e5;font-size:17px}
#keypad.off button{opacity:.35}
@media(max-height:760px){#camDock{height:118px}#keypad{gap:6px;margin-top:8px}#keypad button{min-height:42px;font-size:22px}.qtyBox{height:50px}.step{height:50px}.product{margin:6px 0}}
</style>"""

DOCK = '<div id="camDock" role="button" aria-label="相機掃碼區，點一下重新掃描"><div id="camIdle">點此開啟相機掃碼　Chạm để quét</div><div class="camFrame"></div><p id="camMsg"></p></div>'

JS = r"""<script>(function(){
var $=function(i){return document.getElementById(i)};var dock=$('camDock');
var pl=document.querySelector('.photoLink');if(pl)dock.appendChild(pl);
var work=$('work');work.appendChild($('progressButton'));
window.ridiAutoScan=function(){if(!$('contextPanel').hidden||!$('confirmPanel').hidden)return;if($('video').hidden)$('scanButton').click();};
dock.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.photoLink'))return;window.ridiAutoScan();});
var kp=document.createElement('div');kp.id='keypad';
['1','2','3','4','5','6','7','8','9','C','0','B'].forEach(function(k){var b=document.createElement('button');b.type='button';b.dataset.k=k;b.textContent=k==='C'?'清除':k==='B'?'⌫':k;b.setAttribute('aria-label',k==='C'?'清除數量':k==='B'?'刪除一位':k);kp.appendChild(b);});
document.querySelector('.qtyRow').insertAdjacentElement('afterend',kp);
kp.addEventListener('click',function(e){var b=e.target.closest('button');if(!b||kp.classList.contains('off'))return;var q=$('quantity'),v=q.value,k=b.dataset.k;
 if(k==='C')v='';else if(k==='B')v=v.slice(0,-1);else v=(v==='0'?'':v)+k;q.value=v.slice(0,9);q.dispatchEvent(new Event('input',{bubbles:true}));});
function sync(){var has=!!$('quantityUnit').textContent.trim();kp.classList.toggle('off',!has);$('camIdle').textContent=has?'已辨識　點此掃下一項 · Chạm để quét tiếp':'點此開啟相機掃碼　Chạm để quét';if(has&&$('video').hidden)$('camMsg').textContent='';}
new MutationObserver(sync).observe($('quantityUnit'),{childList:true,characterData:true,subtree:true});sync();
$('submit').addEventListener('click',function(){setTimeout(function(){if(!$('confirmPanel').hidden&&!$('recountNote').textContent.trim()){$('confirmPanel').hidden=true;$('confirmSubmit').click();}},0);});
var tries=0,t=setInterval(function(){tries++;var ready=$('contextPanel').hidden&&!/驗證|…$/.test($('contextText').textContent)&&!$('quantityUnit').textContent.trim();if(ready){clearInterval(t);window.ridiAutoScan();}if(tries>100)clearInterval(t);},300);
})();</script>"""

def apply(p):
    def must(s, a, b):
        if s.count(a) != 1: raise SystemExit('F 模式結構不符：' + a[:50])
        return s.replace(a, b)
    p = must(p, '</style></head>', '</style>' + CSS + '</head>')
    p = must(p, '<section id="work">', '<section id="work">' + DOCK)
    p = must(p, "$('scanVideoHost').appendChild($('video'));", "$('camDock').insertBefore($('video'),$('camDock').firstChild);")
    p = must(p, "const scanMsg=m=>{$('scanMsg').textContent=m||''};", "const scanMsg=m=>{$('camMsg').textContent=m||''};")
    p = must(p, "$('scanButton').onclick=async()=>{scanMsg('');$('scanOverlay').hidden=false;", "$('scanButton').onclick=async()=>{scanMsg('');")
    p = must(p, "$('confirmPanel').hidden=true;$('quantity').value='';", "$('confirmPanel').hidden=true;$('quantity').value='';setTimeout(function(){window.ridiAutoScan&&ridiAutoScan()},0);")
    p = must(p, "submit:['送出前確認','Kiểm tra trước khi gửi']", "submit:['送出 → 繼續掃描','Gửi → Quét tiếp']")
    p = p.replace("可按下方「改用拍照辨識」。", "可按右上「拍照辨識」。")
    p = must(p, "scanPhoto:['相機無法開啟？改用拍照辨識','Không mở được camera? Chụp ảnh QR']", "scanPhoto:['拍照辨識','Chụp ảnh']")
    i = p.rfind('</body>')
    return p[:i] + JS + p[i:]

OPS_CSS = """<style id="fmode-ops">
body{background:#f5f5f5}header{background:#111}.tag{color:#FACC15}
button{background:#111;color:#FACC15}button.secondary,.secondary{background:#f0f0f0;color:#111}
.actions button{background:#f0f0f0;color:#111}.actions button.active{background:#FACC15;color:#111;font-weight:700}
#message{background:#FEF9C3;color:#111}.photoPicker{background:#f0f0f0!important;color:#111!important}video{border:3px solid #FACC15}small{color:#404040}
</style>"""
def apply_ops(l):
    if l.count('</style><header>') != 1: raise SystemExit('ops 結構不符')
    return l.replace('</style><header>', '</style>' + OPS_CSS + '<header>')
