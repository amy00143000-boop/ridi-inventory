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

p = (src/'PAGE.html').read_text()
p = must(p, '<style>', HEAD + '<style>', p.count('<style>')) if False else p.replace('<style>', HEAD + '<style>', 1)
p = re.sub(r"BASE='https://script\.google\.com/macros/s/[^']+/exec'", "BASE='ops.html'", p)
p = p.replace("Google 頁面不支援即時相機；可用手機內建相機掃標籤，或下方拍照／選照片。拍照時讓二維碼清晰佔畫面一半以上。",
              "按「掃碼辨識下一項」開啟相機，對準二維碼即可自動辨識；相機無法開啟時可改用拍照。")
(out/'index.html').write_text(p)

l = (src/'LEGACY.html').read_text()
l = l.replace('<style>', HEAD + '<style>', 1)
l = must(l, "$('scan').onclick=()=>{say(tr('cameraGoogleHint'));$('message').scrollIntoView({block:'nearest'});};",
         "$('scan').onclick=async()=>{say(tr('cameraStart'));$('stop').hidden=false;$('video').hidden=false;$('video').scrollIntoView({block:'center'});try{await qrScanner.start()}catch(e){$('stop').hidden=true;say((e&&e.message)||tr('cameraGoogleHint'))}};")
l = l.replace("Google 入口不提供即時相機。請用下方「拍照／選照片辨識」，或離開此頁用 iPhone 相機掃標籤再開啟連結。",
              "相機無法開啟，請允許相機權限，或改用下方「拍照／選照片辨識」。")
l = l.replace("'Cổng Google không hỗ trợ camera trực tiếp. Chụp/chọn ảnh bên dưới hoặc quét nhãn bằng camera iPhone.'","'Không mở được camera. Hãy cho phép camera hoặc dùng chụp/chọn ảnh bên dưới.'")
l = l.replace("此入口僅在 Apps Script 測試部署後可使用。現有正式庫存不受影響。", "請登入後選擇廠別與作業員工，再掃碼或輸入品號。")
l = l.replace("cameraGoogleHint:[", "cameraStart:['相機啟動中，請將二維碼對準畫面。','Đang mở camera, hãy hướng mã QR vào khung hình.'],cameraGoogleHint:[", 1)
(out/'ops.html').write_text(l)
print('ok', len(p), len(l))
