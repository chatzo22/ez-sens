# Builds the single-file index.html from src.* and the vendored three.js (MIT, see vendor/THREE-LICENSE.txt)
import pathlib, base64
d=pathlib.Path(__file__).parent
three=(d/'vendor/three.module.min.js').read_text()
assert '</script' not in three.lower() and '<!--' not in three
jpg=(d/'assets'/'hook-botlane.jpg').read_bytes()
b64=base64.b64encode(jpg).decode('ascii')
assert '</' not in b64
geo=(d/'src.hook-map.json').read_text().strip()
assert '</' not in geo.lower()
hook_pre="const HK_MAP_DATAURL='data:image/jpeg;base64,"+b64+"';\nconst HK_MAP_GEO="+geo+";\n"
out=(d/'src.head.html').read_text()
out+='<!-- three.js r160, MIT License (c) 2010-2023 three.js authors, bundled so EZ Sens runs fully offline -->\n'
out+='<script type="text/plain" id="three-src">'+three+'</script>\n'
out+='<script id="ezmath">\n'+(d/'src.math.js').read_text()+'</script>\n'
out+='<script type="module">\n'+(d/'src.app.js').read_text()+'\n'+hook_pre+(d/'src.hook.js').read_text()+'</script>\n</body>\n</html>\n'
(d/'index.html').write_text(out); print('index.html', len(out)//1024, 'KB')
