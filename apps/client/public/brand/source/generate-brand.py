"""Original geometric logo concepts for Sozvon. Run from the project root.
No font dependency, external assets, filters, masks, strokes or embedded bitmap.
"""
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
ORANGE = '#F59A53'
WHITE = '#F6F3EF'
BLACK = '#17191E'

# 64-unit drawing grid. One idea per silhouette; major strokes are 10–12 units.
CONCEPTS = [
    dict(id='replika', name='Реплика', type='Буквенный знак',
         description='Буква S с двумя встречными поворотами: разговор, который продолжается.',
         recommended=True,
         shape='<path d="M54 6H26C17.16 6 10 13.16 10 22C10 30.84 17.16 38 26 38H38C40.21 38 42 39.79 42 42C42 44.21 40.21 46 38 46H22L10 58H38C46.84 58 54 50.84 54 42C54 33.16 46.84 26 38 26H26C23.79 26 22 24.21 22 22C22 19.79 23.79 18 26 18H42Z"/>'),
    dict(id='vstrecha', name='Встреча', type='Абстрактный знак',
         description='Две открытые рамки собираются в одно пространство для встречи.',
         recommended=False,
         shape='<path d="M42 6H20C12.27 6 6 12.27 6 20V42H18V20C18 18.9 18.9 18 20 18H42Z M22 58H44C51.73 58 58 51.73 58 44V22H46V44C46 45.1 45.1 46 44 46H22Z"/>'),
    dict(id='sozvuchie', name='Созвучие', type='Ритмический знак',
         description='Точка и голос меняются местами: один говорит, другой отвечает.',
         recommended=False,
         shape='<circle cx="19" cy="14" r="7"/><rect x="12" y="29" width="14" height="28" rx="7"/><rect x="38" y="7" width="14" height="28" rx="7"/><circle cx="45" cy="50" r="7"/>'),
]

# Custom lowercase lettering. No live text, no third-party font.
GLYPHS = {
    's': ('M34 2H14C6.27 2 0 7.37 0 14C0 20.63 5.37 26 12 26H23C26.31 26 29 27.79 29 30C29 32.21 26.31 34 23 34H2V42H24C31.73 42 38 36.63 38 30C38 23.37 32.63 18 26 18H15C11.69 18 9 16.21 9 14C9 11.79 11.69 10 15 10H34Z', 38),
    'o': ('M20 0C8 0 0 8.8 0 22C0 35.2 8 44 20 44C32 44 40 35.2 40 22C40 8.8 32 0 20 0Z M20 8C27.2 8 31 13.3 31 22C31 30.7 27.2 36 20 36C12.8 36 9 30.7 9 22C9 13.3 12.8 8 20 8Z', 40),
    'z': ('M0 2H36V10L12 34H36V42H0V34L24 10H0Z', 36),
    'v': ('M0 2H9L20 31L31 2H40L24 42H16Z', 40),
    'n': ('M0 42V2H8V7C11 3 16 0 22 0C33 0 40 8 40 20V42H31V21C31 13 27 8 21 8C14 8 9 13 9 21V42Z', 40),
}

def svg(title, body, fill, width=64, height=64):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" width="{width}" height="{height}" role="img" aria-label="{title}"><title>{title}</title><g fill="{fill}">{body}</g></svg>\n'

def wordmark(fill):
    parts=[]
    x=0
    for letter in 'sozvon':
        data, advance=GLYPHS[letter]
        parts.append(f'<path transform="translate({x} 0)" fill-rule="evenodd" d="{data}"/>')
        x += advance+5
    return f'<g fill="{fill}" transform="translate(82 17) scale(.68)">{"".join(parts)}</g>'

for c in CONCEPTS:
    slug=c['id']
    (ROOT/f'{slug}-mark.svg').write_text(svg(f'Sozvon — {c["name"]}', c['shape'], ORANGE))
    (ROOT/f'{slug}-mono.svg').write_text(svg(f'Sozvon — {c["name"]}', c['shape'], 'currentColor'))
    (ROOT/f'{slug}-white.svg').write_text(svg(f'Sozvon — {c["name"]}', c['shape'], WHITE))
    (ROOT/f'{slug}-black.svg').write_text(svg(f'Sozvon — {c["name"]}', c['shape'], BLACK))
    (ROOT/'source'/f'{slug}-v2-black.svg').write_text(svg(f'Sozvon — {c["name"]}', c['shape'], BLACK))
    (ROOT/f'{slug}-lockup.svg').write_text(svg(f'Sozvon — {c["name"]}', c['shape']+wordmark(WHITE), ORANGE, 264))
    (ROOT/'source'/f'{slug}-lockup-black.svg').write_text(svg(f'Sozvon — {c["name"]}', c['shape']+wordmark(BLACK), BLACK, 264))

manifest = {'brand':'Sozvon','accent':ORANGE,'recommended':'replika','skill':'https://github.com/kaankiziltug/logo-design-skill','concepts':[]}
for c in CONCEPTS:
    manifest['concepts'].append({k:v for k,v in c.items() if k!='shape'}|{'mark':f'/brand/{c["id"]}-mark.svg','mono':f'/brand/{c["id"]}-mono.svg','lockup':f'/brand/{c["id"]}-lockup.svg'})
(ROOT/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')

brief={
    'name':'Sozvon','offering':'Browser-based video calls','audience':'Small teams, friends and communities',
    'adjectives':['calm','clear','approachable','modern'],
    'constraints':['dark graphite UI','warm orange accent','16px recognition','one-colour clarity'],
    'category_cliches_to_avoid':['literal video camera','telephone handset','generic chat bubble','blue gradients'],
    'word_map':['voice → reply → turn','room → open frame → shared space','call → response → rhythm'],
    'longlist':[
        'S with two reply turns — letterform; clarity 5, distinction 4, simplicity 5, small size 5',
        'Two open frames become one room — abstract; clarity 5, distinction 4, simplicity 5, small size 5',
        'Point and voice exchange places — rhythmic abstract; clarity 4, distinction 4, simplicity 5, small size 5',
        'Custom wordmark with connected o forms — wordmark; clarity 4, distinction 3, small size 2',
        'Diagonal lens cut into Z — letterform; clarity 3, distinction 3, small size 4',
        'Three seats around negative central table — pictorial; clarity 4, distinction 2, small size 3',
        'Two paths overlap into an infinity — abstract; clarity 4, distinction 1, small size 4',
        'Single beacon with matching echo — pictorial; clarity 4, distinction 2, small size 3',
        'Meeting point in O — letterform; clarity 3, distinction 2, small size 4',
        'Video aperture formed by S — negative space; clarity 2, distinction 4, small size 2'
    ],
    'construction':{
        'replika':'Continuous filled S ribbon; 12-unit stems; paired circular bends; 45° reply terminals.',
        'vstrecha':'Two 12-unit L frames, rotated 180°; 14-unit outer corner radii, 2-unit inner corners; 4-unit diagonal breathing gaps, widened after the first 16px inspection.',
        'sozvuchie':'Two opposite pairs of 14-unit circles and capsules; 180° rotational symmetry; 8-unit silence gap.'
    },
    'type':'Original outlined lowercase geometry; no third-party font files or live text.',
    'scope':'Three concepts for user selection. Full identity kit awaits chosen direction.'
}
(ROOT/'source'/'design-brief.json').write_text(json.dumps(brief,ensure_ascii=False,indent=2)+'\n')
