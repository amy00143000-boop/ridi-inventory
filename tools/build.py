"""從 Apps Script 匯出的 PAGE/LEGACY 產生 GitHub Pages 版 index.html / ops.html"""
import sys, re, pathlib
src = pathlib.Path(sys.argv[1]); out = pathlib.Path(sys.argv[2])
HEAD = ('<link rel="manifest" href="manifest.webmanifest"><meta name="theme-color" content="#18394A">'
        '<link rel="icon" href="icon-192.png"><link rel="apple-touch-icon" href="icon-192.png">'
        '<meta name="apple-mobile-web-app-capable" content="yes">'
        '<script src="https://accounts.google.com/gsi/client" async></script>'
        '<script src="config.js?v=' + __import__('time').strftime('%Y%m%d%H%M') + '"></script><script src="shim.js?v=' + __import__('time').strftime('%Y%m%d%H%M') + '"></script>')
def must(s, a, b, n=1):
    c = s.count(a)
    if c != n: raise SystemExit(f'預期 {n} 次，找到 {c} 次：{a[:60]}')
    return s.replace(a, b)

OLD_TICK = "const tick=()=>{if(ticket!==generation)return;try{if(video.readyState>=2){const raw=decode(video,video.videoWidth,video.videoHeight);if(raw){found(raw);return;}}timer=setTimeout(tick,160);}catch(e){stop();onStatus(e.message);}};tick();"
NEW_TICK = ("let n=0,det=null;try{if('BarcodeDetector' in window)det=new BarcodeDetector({formats:['qr_code']});}catch(_){det=null}"
  "const tick=async()=>{if(ticket!==generation)return;try{if(video.readyState>=2){let raw=null;n++;"
  "if(det){try{const c=await det.detect(video);raw=c&&c[0]&&c[0].rawValue}catch(_){det=null}}"
  "if(!raw){const w=video.videoWidth,h=video.videoHeight;raw=n%4===0?decode(video,w,h,800):decodeFast(video,w,h);}"
  "if(ticket!==generation)return;if(raw){found(raw);return;}}timer=setTimeout(tick,40);}catch(e){stop();onStatus(e.message);}};tick();")
OLD_DEC = "function decode(source,w,h,max=960){"
NEW_DEC = ("function decodeFast(v,w,h){const side=Math.round(Math.min(w,h)*0.8),sx=Math.round((w-side)/2),sy=Math.round((h-side)/2),size=Math.min(560,side);"
  "canvas.width=size;canvas.height=size;ctx.drawImage(v,sx,sy,side,side,0,0,size,size);const p=ctx.getImageData(0,0,size,size);"
  "return jsQR(p.data,size,size,{inversionAttempts:'dontInvert'})?.data;}\n    function decode(source,w,h,max=960){")
def fastscan(x):
    x = x.replace("getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false})", "getUserMedia({video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:720}},audio:false})")
    if x.count(OLD_TICK)!=1 or x.count(OLD_DEC)!=1: raise SystemExit('掃碼程式碼結構不符')
    return x.replace(OLD_TICK,NEW_TICK).replace(OLD_DEC,NEW_DEC)
p = (src/'PAGE.html').read_text()
p = must(p, '<style>', HEAD + '<style>', p.count('<style>')) if False else p.replace('<style>', HEAD + '<style>', 1)
p = re.sub(r"BASE='https://script\.google\.com/macros/s/[^']+/exec'", "BASE='./'", p)
ROUTER = "<script>if(/[?&]type=/.test(location.search))location.replace('ops.html'+location.search);</script>"
p = p.replace('<link rel="manifest"', ROUTER + '<link rel="manifest"', 1)
p = p.replace("Google 頁面不支援即時相機；可用手機內建相機掃標籤，或下方拍照／選照片。拍照時讓二維碼清晰佔畫面一半以上。",
              "按「掃碼辨識下一項」開啟相機，對準二維碼即可自動辨識；相機無法開啟時可改用拍照。")
p = fastscan(p)
(out/'index.html').write_text(p)

l = (src/'LEGACY.html').read_text()
l = fastscan(l)
l = l.replace('<style>', HEAD + '<style>', 1)
# 同一網址：網址列顯示首頁；按「盤點」回首頁盤點畫面
OPS_JS = ("<script>try{history.replaceState(null,'','./'+location.search+location.hash)}catch(e){}"
  "document.addEventListener('click',function(e){var b=e.target.closest&&e.target.closest('[data-action=\"盤點提報\"]');if(!b)return;"
  "e.preventDefault();e.stopImmediatePropagation();var q=new URLSearchParams();var br=document.getElementById('branch'),em=document.getElementById('employee'),cd=document.getElementById('code');"
  "if(br&&br.value)q.set('branch',br.value);if(em&&em.value)q.set('employee',em.value);if(cd&&cd.value.trim())q.set('id',cd.value.trim());"
  "location.href='./'+(q.toString()?'?'+q:'')},true);</script>")
l = l.replace('<link rel="manifest"', OPS_JS + '<link rel="manifest"', 1)
l = must(l, "$('scan').onclick=()=>{say(tr('cameraGoogleHint'));$('message').scrollIntoView({block:'nearest'});};",
         "$('scan').onclick=async()=>{say(tr('cameraStart'));$('stop').hidden=false;$('video').hidden=false;$('video').scrollIntoView({block:'center'});try{await qrScanner.start()}catch(e){$('stop').hidden=true;say((e&&e.message)||tr('cameraGoogleHint'))}};")
l = l.replace("Google 入口不提供即時相機。請用下方「拍照／選照片辨識」，或離開此頁用 iPhone 相機掃標籤再開啟連結。",
              "相機無法開啟，請允許相機權限，或改用下方「拍照／選照片辨識」。")
l = l.replace("'Cổng Google không hỗ trợ camera trực tiếp. Chụp/chọn ảnh bên dưới hoặc quét nhãn bằng camera iPhone.'","'Không mở được camera. Hãy cho phép camera hoặc dùng chụp/chọn ảnh bên dưới.'")
l = l.replace("此入口僅在 Apps Script 測試部署後可使用。現有正式庫存不受影響。", "請登入後選擇廠別與作業員工，再掃碼或輸入品號。")
l = l.replace("cameraGoogleHint:[", "cameraStart:['相機啟動中，請將二維碼對準畫面。','Đang mở camera, hãy hướng mã QR vào khung hình.'],cameraGoogleHint:[", 1)
l = l.replace('<title>日帝六廠｜測試掃碼入庫</title>', '<title>日帝汽車｜入庫調撥</title>')
(out/'ops.html').write_text(l)
print('ok', len(p), len(l))
