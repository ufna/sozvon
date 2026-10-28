"""Three shared, original identity concepts. FontTools + Noto Sans Medium needed only to rebuild the outlined lettering."""
from pathlib import Path
import json
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT=Path(__file__).resolve().parents[1]
ORANGE='#FF9A00'
WHITE='#F5F7FA'
BLACK='#0E0E14'
FONT=Path('/usr/share/fonts/noto/NotoSans-Medium.ttf')
font=TTFont(FONT)
glyphs=font.getGlyphSet()
cmap=font.getBestCmap()
scale=26/font['OS/2'].sCapHeight

CONCEPTS=[
 {'id':'zov','name':'Зов','recommended':True,'shape':'<path d="M17 8.91L55 30.85C56.33 31.62 56.33 33.54 55 34.31L17 56.25C13 58.56 8 55.67 8 51.05V42A10 10 0 0 0 8 22V14.11C8 9.49 13 6.6 17 8.91Z"/>'},
 {'id':'most','name':'Мост','recommended':False,'shape':'<path d="M28 8A22 24 0 0 0 28 56V44A10 12 0 0 1 28 20Z M36 8A22 24 0 0 1 36 56V44A10 12 0 0 0 36 20Z"/>'},
 {'id':'dialog','name':'Диалог','recommended':False,'shape':'<path d="M28 8H18C11.37 8 6 13.37 6 20C6 26.63 11.37 32 18 32V40C18 44.42 14.42 48 10 48V58C19.94 58 28 49.94 28 40Z"/><path transform="rotate(180 32 32)" d="M28 8H18C11.37 8 6 13.37 6 20C6 26.63 11.37 32 18 32V40C18 44.42 14.42 48 10 48V58C19.94 58 28 49.94 28 40Z"/>'},
]

def wrap(title,body,width=64):
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} 64" width="{width}" height="64" role="img" aria-label="{title}"><title>{title}</title>{body}</svg>\n'

def lettering(name,color=WHITE):
 x=80
 paths=[]
 for char in name:
  if char=='.':
   paths.append(f'<circle fill="{ORANGE}" cx="{x+2.5:.2f}" cy="40" r="2.5"/>')
   x+=8
   continue
  glyphname=cmap[ord(char)]
  pen=SVGPathPen(glyphs,ntos=lambda v:f'{v:.2f}'.rstrip('0').rstrip('.'))
  transformed=TransformPen(pen,(scale,0,0,-scale,x,44))
  glyphs[glyphname].draw(transformed)
  paths.append(f'<path fill="{color}" d="{pen.getCommands()}"/>')
  x+=font['hmtx'].metrics[glyphname][0]*scale-.35
 return ''.join(paths),round(x+8,2)

for c in CONCEPTS:
 slug=c['id']
 for suffix,color in [('mark',ORANGE),('white',WHITE),('black',BLACK),('mono','currentColor')]:
  (ROOT/f'{slug}-{suffix}.svg').write_text(wrap(c['name'],f'<g fill="{color}">{c["shape"]}</g>'))
 for brand,key in [('Sozvon','sozvon'),('GoVoice','govoice')]:
  letters,width=lettering(brand)
  art=wrap(brand,f'<g fill="{ORANGE}">{c["shape"]}</g>'+letters,width)
  (ROOT/f'{slug}-{key}-lockup.svg').write_text(art)
  if key=='govoice':
   (ROOT/f'{slug}-{key}-lockup-mono.svg').write_text(art.replace(ORANGE,WHITE))
   (ROOT/f'{slug}-{key}-lockup-blue.svg').write_text(art.replace(ORANGE,'#4D98FF'))
  blackletters,width=lettering(brand,BLACK)
  (ROOT/'source'/f'{slug}-{key}-black.svg').write_text(wrap(brand,f'<g fill="{BLACK}">{c["shape"]}</g>'+blackletters,width))

manifest={'brands':['Sozvon','GoVoice'],'recommended':'zov','accent':ORANGE,'white':WHITE,'black':BLACK,'concepts':[]}
for c in CONCEPTS:
 slug=c['id']
 manifest['concepts'].append({'id':slug,'name':c['name'],'recommended':c['recommended'],'mark':f'/brand/v2/{slug}-mark.svg','mono':f'/brand/v2/{slug}-mono.svg','white':f'/brand/v2/{slug}-white.svg','black':f'/brand/v2/{slug}-black.svg','lockup':f'/brand/v2/{slug}-sozvon-lockup.svg','govoiceLockup':f'/brand/v2/{slug}-govoice-lockup.svg','download':f'/brand/v2/{slug}-mark.svg'})
(ROOT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')

spec={'scope':'Shared mark for Sozvon and GoVoice','colours':[ORANGE,WHITE,BLACK],
 'lettering':'Noto Sans Medium, converted to vector paths. GoVoice wordmark; domain govoice.now remains separate.',
 'font_license':'SIL Open Font License 1.1',
 'safe_space':{'symbol_viewbox':'64 × 64','symbol_padding':'6 units typical','lockup':'height 64, icon at origin, lettering x80, cap height26, baseline44, right padding8'},
 'construction':{
  'zov':'Rounded direction wedge, concave semicircle. Speech leaving its source.',
  'most':'Two facing elliptical channels; 12-unit stems, 8-unit gap. Paired arcs frame common space.',
  'dialog':'Two opposed, connected comma silhouettes. Alternating turns.'},
 'longlist':['voice wedge with concave source','paired circular channels','opposing filled commas','notched orbit with point','interlocking wave ribbons','split arch','shared meeting aperture','paired teardrops','rounded start chevron','shared-room square'],
 'selected':['zov','most','dialog'],
 'excluded':['brand initials','telephone receiver','microphone','three-dot bubble','audio equalizer','literal camera'],
 'status':'Concept selection, before full identity kit'}
(ROOT/'source'/'spec.json').write_text(json.dumps(spec,ensure_ascii=False,indent=2)+'\n')
licenses=[]
for record in font['name'].names:
 if record.nameID in [0,13,14]:
  value=record.toUnicode()
  if value not in licenses: licenses.append(value)
(ROOT/'source'/'font-license.txt').write_text('\n\n'.join(licenses)+'\n')
