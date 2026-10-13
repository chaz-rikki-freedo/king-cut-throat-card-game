import os, sys
OUT = sys.argv[1]
SK, K = '#fff2e0', '#111'
HEAD = 'M51,44 C51,20 109,20 109,44 L109,64 C109,84 97,99 82,101 C66,101 51,86 51,66 Z'

def torso(jacket, shirt, style):
    s = '<defs><clipPath id="b"><circle cx="80" cy="80" r="80"/></clipPath></defs><g clip-path="url(#b)">'
    if style == 'hoodie':
        s += f'<path d="M30,118 C30,92 130,92 130,118 Z" fill="{jacket}"/>'
    s += f'<path d="M-6,170 C-2,128 26,110 54,104 L106,104 C134,110 162,128 166,170 Z" fill="{jacket}"/>'
    if style == 'v':
        s += f'<path d="M58,104 L102,104 L80,152 Z" fill="{shirt}"/><path d="M56,105 L80,152 M104,105 L80,152" stroke="{SK}" stroke-width="2.6" fill="none"/>'
    elif style == 'vest':
        s += f'<path d="M50,104 L110,104 L96,170 L64,170 Z" fill="{SK}"/><path d="M60,104 L80,140 L100,104" stroke="{K}" stroke-width="2.4" fill="none"/>'
        s += f'<path d="M72,112 L80,118 L88,112 L88,124 L80,118 L72,124 Z" fill="{shirt}"/>'
    elif style == 'turtle':
        s += f'<path d="M60,96 L100,96 L104,116 C90,122 70,122 56,116 Z" fill="{jacket}" stroke="{K}" stroke-width="2.4"/>'
    elif style == 'hoodie':
        s += f'<path d="M62,104 C66,118 94,118 98,104" stroke="{K}" stroke-width="3" fill="none"/><path d="M70,114 L68,140 M90,114 L92,140" stroke="{SK}" stroke-width="2.6" stroke-linecap="round"/>'
    elif style == 'bowtie':
        s += f'<path d="M60,104 L100,104 L80,150 Z" fill="{SK}"/><path d="M68,106 L80,112 L92,106 L92,120 L80,114 L68,120 Z" fill="{shirt}" stroke="{K}" stroke-width="1.6"/>'
    s += f'<path d="M22,128 C30,124 38,124 44,128" stroke="{SK}" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".7"/></g>'
    return s

def neck(style):
    s = f'<path d="M64,84 L96,84 L97,108 L80,124 L63,108 Z" fill="{SK}"/><path d="M80,98 C90,98 96,94 97,90 L97,104 C92,104 86,102 80,98 Z" fill="{K}"/>'
    return s

HAIR_BACK = {
 'bob': f'<path d="M42,44 C40,10 120,10 118,44 L120,96 C112,100 104,98 100,94 L60,94 C56,98 48,100 40,96 Z" fill="{K}"/>',
 'long': f'<path d="M44,40 C40,6 120,6 116,40 C122,62 118,80 126,104 C132,120 120,130 110,126 L104,96 L56,96 L50,126 C40,130 28,120 34,104 C42,80 38,62 44,40 Z" fill="{K}"/>',
 'afro': ''.join(f'<circle cx="{x}" cy="{y}" r="{r}" fill="{K}"/>' for x,y,r in [(80,30,34),(52,40,18),(108,40,18),(60,16,18),(100,16,18),(80,8,18),(44,60,12),(116,60,12)]),
 'pony': f'<path d="M104,30 C126,30 132,60 124,90 C120,106 112,112 106,108 C114,90 116,60 104,44 Z" fill="{K}"/>',
 'bun': f'<circle cx="80" cy="12" r="13" fill="{K}"/>',
}
HAIR_FRONT = {
 'tousled': f'<path d="M47,60 C42,44 44,28 54,18 L49,9 L62,13 C68,6 78,2 88,4 L93,0 L98,6 C108,8 116,16 118,25 L126,25 L119,35 C121,44 119,52 114,60 C113,52 111,46 107,41 C100,46 90,45 83,39 C77,45 67,47 59,43 C55,47 53,53 52,60 Z" fill="{K}"/>',
 'bob': f'<path d="M50,54 L50,36 C52,14 108,14 110,36 L110,54 C96,46 64,46 50,54 Z" fill="{K}"/>',
 'long': f'<path d="M50,58 C46,26 70,14 90,16 C110,18 114,36 110,58 C106,44 98,36 90,34 C80,42 64,44 50,58 Z" fill="{K}"/>',
 'afro': f'<path d="M51,46 C52,30 108,30 109,46 C100,38 60,38 51,46 Z" fill="{K}"/>',
 'pony': f'<path d="M50,50 C48,18 112,18 110,50 C100,36 80,34 66,40 C60,42 54,44 50,50 Z" fill="{K}"/>',
 'bun': f'<path d="M50,50 C48,18 112,18 110,50 C100,36 80,34 66,40 C60,42 54,44 50,50 Z" fill="{K}"/>',
 'buzz': f'<path d="M51,46 C50,18 110,18 109,46 C102,36 92,32 80,32 C68,32 58,36 51,46 Z" fill="{K}"/>',
 'side': f'<path d="M49,58 C44,26 70,12 92,14 C112,16 118,34 111,58 C108,46 104,40 96,36 C84,42 66,42 56,42 C52,46 50,52 49,58 Z" fill="{K}"/>',
 'curly': ''.join(f'<circle cx="{x}" cy="{y}" r="9" fill="{K}"/>' for x,y in [(52,46),(56,32),(66,22),(80,18),(94,22),(104,32),(108,46),(70,32),(90,32),(80,28)]),
 'bald': f'<path d="M51,56 C50,50 50,48 52,46 L54,58 Z M109,56 C110,50 110,48 108,46 L106,58 Z" fill="{K}"/>',
}
HAT = {
 'visor': f'<path d="M50,42 C60,36 100,36 110,42 L110,48 C100,42 60,42 50,48 Z" fill="{K}"/><path d="M42,46 C60,38 100,38 118,46 L128,60 C100,52 60,52 32,60 Z" fill="#2fa36b" opacity=".92"/>',
 'crown': f'<path d="M58,26 L56,2 L68,14 L80,-2 L92,14 L104,2 L102,26 Z" fill="#f2c14e" stroke="#3a2a00" stroke-width="2" stroke-linejoin="round"/><circle cx="80" cy="18" r="3" fill="#d94a4a"/>',
 'beanie': f'<path d="M48,48 C46,6 114,6 112,48 Z" fill="#c0392b"/><rect x="46" y="38" width="68" height="12" rx="4" fill="#8e2a20"/><circle cx="80" cy="6" r="8" fill="{SK}"/>',
 'phones': f'<path d="M46,62 C40,14 120,14 114,62" stroke="{K}" stroke-width="6" fill="none"/><rect x="38" y="52" width="14" height="24" rx="5" fill="#2fc7b0" stroke="{K}" stroke-width="2.4"/><rect x="108" y="52" width="14" height="24" rx="5" fill="#2fc7b0" stroke="{K}" stroke-width="2.4"/>',
 'cap': f'<path d="M50,44 C48,8 112,8 110,44 Z" fill="#2fc7b0"/><path d="M50,40 C70,36 110,36 132,44 C120,50 100,48 50,46 Z" fill="#1a8f7f"/><circle cx="80" cy="12" r="3" fill="{K}"/>',
}
def face(expr, extras):
    s = ''
    brows = {'smirk': ('M60,54 C64,49 72,49 76,52 L75,56 C71,54 65,54 61,57 Z','M85,51 C90,47 98,48 102,53 L100,56 C97,52 91,52 86,55 Z'),
             'grin': ('M60,52 C64,47 72,47 76,50 L75,54 C71,52 65,52 61,55 Z','M85,50 C89,46 97,46 101,50 L100,54 C96,51 90,51 86,54 Z'),
             'calm': ('M61,56 L76,55 L76,58 L61,59 Z','M85,55 L100,56 L100,59 L85,58 Z'),
             'sly':  ('M60,57 L76,56 L76,59 L60,60 Z','M85,50 C90,45 98,46 102,51 L100,54 C97,50 91,50 86,53 Z')}[expr]
    s += f'<path d="{brows[0]}" fill="{K}"/><path d="{brows[1]}" fill="{K}"/>'
    if expr == 'calm':
        s += f'<path d="M62,64 C65,61 71,61 74,64 M87,64 C90,61 96,61 99,64" stroke="{K}" stroke-width="3" fill="none" stroke-linecap="round"/>'
    else:
        s += f'<ellipse cx="68" cy="63" rx="3.6" ry="4.6" fill="{K}"/><ellipse cx="93" cy="63" rx="3.6" ry="4.6" fill="{K}"/>'
    s += f'<path d="M83,62 C84,69 88,75 86,78 C84,80 80,80 77,78" stroke="{K}" stroke-width="2.6" fill="none" stroke-linecap="round"/>'
    if 'beard' in extras:
        s += f'<path d="M51,66 C51,86 66,101 82,101 C97,99 109,84 109,64 L105,70 C103,82 96,90 82,90 C68,90 58,82 55,70 Z" fill="{K}"/>'
    if 'stache' in extras:
        s += f'<path d="M68,84 C72,79 78,80 81,82 C84,80 90,79 94,84 C90,85 86,84 81,85 C76,84 72,85 68,84 Z" fill="{K}"/>'
    mouth = {'smirk': f'<path d="M68,87 C76,91 88,90 96,82" stroke="{K}" stroke-width="3.4" fill="none" stroke-linecap="round"/>',
             'grin': f'<path d="M66,84 C74,86 90,86 98,82 C96,94 86,98 80,98 C72,98 66,92 66,84 Z" fill="{K}"/><path d="M69,86 C76,88 88,88 95,85 L94,88 C88,90 76,90 70,89 Z" fill="{SK}"/>',
             'calm': f'<path d="M72,88 C77,90 85,90 90,88" stroke="{K}" stroke-width="3" fill="none" stroke-linecap="round"/>',
             'sly': f'<path d="M72,88 C80,90 88,88 95,84" stroke="{K}" stroke-width="3.2" fill="none" stroke-linecap="round"/>'}[expr]
    s += mouth
    if 'round' in extras:
        s += f'<g stroke="{K}" stroke-width="3" fill="none"><circle cx="68" cy="63" r="9"/><circle cx="93" cy="63" r="9"/><path d="M77,62 C79,60 82,60 84,62 M59,61 L51,58 M102,61 L109,58"/></g>'
    if 'square' in extras:
        s += f'<g stroke="#f2c14e" stroke-width="3.2" fill="none" stroke-linejoin="round"><rect x="57" y="56" width="22" height="14" rx="3"/><rect x="82" y="56" width="22" height="14" rx="3"/><path d="M79,61 L82,61 M57,60 L51,58 M104,60 L109,58"/></g>'
    if 'shades' in extras:
        s += f'<path d="M56,56 L104,56 L102,68 C96,72 88,70 84,62 L77,62 C73,70 64,72 58,68 Z" fill="{K}"/>'
    if 'rings' in extras:
        s += '<circle cx="49" cy="76" r="3.4" fill="#f2c14e"/><circle cx="111" cy="76" r="3.4" fill="#f2c14e"/>'
    return s

def hands_cards(card):
    shades = card
    s = f'<g stroke="{SK}" stroke-width="3" stroke-linejoin="round">'
    for a, c in zip((-26, -4, 18), shades):
        s += f'<rect x="-14" y="-44" width="28" height="40" rx="3" fill="{c}" transform="translate(102,152) rotate({a})"/>'
    s += '</g>'
    s += f'<path d="M84,160 C80,146 86,132 98,128 C108,125 120,130 122,140 C124,148 122,156 120,160 Z" fill="{SK}"/>'
    s += f'<path d="M92,136 C100,133 110,134 117,138 M91,144 C99,141 109,142 117,146 M92,152 C99,150 108,151 115,154" stroke="{K}" stroke-width="3" fill="none" stroke-linecap="round"/>'
    s += f'<path d="M86,132 C88,124 94,118 100,120" stroke="{SK}" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M83,138 C84,130 88,124 93,122" stroke="{K}" stroke-width="2.4" fill="none" stroke-linecap="round"/>'
    return s

TEAL = ('#1a8f7f', '#22a893', '#2cc2aa')
def bust(hair, hat=None, expr='smirk', extras=(), jacket=K, shirt='#1f9e8c', style='v', cards=TEAL, mystery=False):
    s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160">'
    s += torso(jacket, shirt, style) + HAIR_BACK.get(hair, '') + neck(style)
    s += f'<ellipse cx="49" cy="62" rx="7" ry="11" fill="{SK}"/><ellipse cx="111" cy="62" rx="7" ry="11" fill="{SK}"/>'
    s += f'<path d="M48,56 C45,61 46,67 50,70 M112,56 C115,61 114,67 110,70" stroke="{K}" stroke-width="2.4" fill="none"/>'
    s += f'<path d="{HEAD}" fill="{SK}"/><path d="M103,78 C100,91 92,99 82,101 C97,101 107,90 109,72 Z" fill="{K}"/>'
    if mystery:
        s += f'<path d="{HEAD}" fill="{K}"/><text x="80" y="80" font-family="Georgia,serif" font-weight="700" font-size="46" text-anchor="middle" fill="#2cc2aa">?</text>'
    else:
        s += face(expr, extras)
    s += HAIR_FRONT.get(hair, '') + (HAT[hat] if hat else '')
    s += hands_cards(cards) + '</svg>'
    return s

OPTS = [
 ('Tousled, smirk (first draft)', dict(hair='tousled')),
 ('Dealer visor and vest', dict(hair='side', hat='visor', style='vest', shirt='#c0392b', expr='sly')),
 ('Would-be King: crown', dict(hair='tousled', hat='crown', expr='sly', jacket='#5a2d82', shirt='#f2c14e')),
 ('Bob and round glasses', dict(hair='bob', expr='calm', extras=('round',), jacket='#2b4f7a', style='turtle')),
 ('Afro, big grin', dict(hair='afro', expr='grin', jacket='#b8562e', style='v', shirt=SK)),
 ('Bun and gold earrings', dict(hair='bun', expr='smirk', extras=('rings',), jacket='#7a1f3d', shirt='#2cc2aa')),
 ('Beanie and stubble beard', dict(hair='buzz', hat='beanie', extras=('beard',), expr='calm', jacket='#3a4a5a', style='hoodie')),
 ('Long hair, sly look', dict(hair='long', expr='sly', jacket=K, shirt='#2cc2aa')),
 ('Ponytail and hoodie', dict(hair='pony', expr='grin', jacket='#1f6f8b', style='hoodie')),
 ('Buzz cut and mustache', dict(hair='buzz', extras=('stache',), expr='smirk', jacket='#6b4f2a', style='bowtie', shirt='#c0392b')),
 ('Headphones, gamer', dict(hair='curly', hat='phones', expr='grin', jacket='#2b3440', style='hoodie')),
 ('Ball cap, team colors', dict(hair='buzz', hat='cap', expr='smirk', jacket='#1a8f7f', style='v', shirt=SK)),
 ('Shades, cool', dict(hair='side', extras=('shades',), expr='sly', jacket='#1d1d2b', style='turtle')),
 ('Gold glasses, bald', dict(hair='bald', extras=('square', 'beard'), expr='calm', jacket='#4a3a6a', style='bowtie', shirt='#f2c14e')),
 ('Curly, friendly', dict(hair='curly', expr='grin', jacket='#8a6d1f', style='v', shirt=SK)),
 ('Mystery player', dict(hair='tousled', mystery=True)),
]
import json
for i, (label, kw) in enumerate(OPTS, 1):
    open(os.path.join(OUT, f'{i:02d}.svg'), 'w').write(bust(**kw))
json.dump([l for l, _ in OPTS], open(os.path.join(OUT, 'labels.json'), 'w'))
