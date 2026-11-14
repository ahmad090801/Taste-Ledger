import random, math
def svg(name, body, bg):
    open(f'public/img/{name}.svg','w').write(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"><rect width="400" height="300" fill="{bg}"/><ellipse cx="200" cy="268" rx="130" ry="12" fill="#00000022"/>{body}</svg>')
def dots(seed,n,cx,cy,r,col,sz,shape='c'):
    random.seed(seed); o=''
    for _ in range(n):
        a=random.random()*6.28; d=r*math.sqrt(random.random()); x=cx+d*math.cos(a); y=cy+d*math.sin(a)
        c=random.choice(col)
        o+= f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{sz}" fill="{c}"/>' if shape=='c' else f'<rect x="{x:.0f}" y="{y:.0f}" width="{sz*2}" height="{sz*2}" rx="2" fill="{c}" transform="rotate({random.randint(0,90)} {x:.0f} {y:.0f})"/>'
    return o
plate='<circle cx="200" cy="150" r="125" fill="#fff"/><circle cx="200" cy="150" r="105" fill="#f1ede6"/>'
svg('koshari',plate+'<circle cx="200" cy="150" r="90" fill="#f4d58d"/>'+dots(1,90,200,150,85,['#6b4423','#8a5a2b'],6)+dots(2,40,200,150,80,['#e9c46a','#f6e7b0'],5,'r')+'<circle cx="200" cy="150" r="32" fill="#c0392b"/>'+dots(3,30,200,150,30,['#a93226','#d35446'],5)+dots(4,26,200,150,62,['#3b2412','#5a3a1c'],4,'r'),'#fde8d0')
svg('pizza','<circle cx="200" cy="150" r="125" fill="#c68b59"/><circle cx="200" cy="150" r="108" fill="#d94a2f"/><circle cx="200" cy="150" r="102" fill="#f7e29b"/>'+dots(5,22,200,150,85,['#e8c76a','#fff3c4'],14)+''.join(f'<circle cx="{200+60*math.cos(i*1.05):.0f}" cy="{150+60*math.sin(i*1.05):.0f}" r="16" fill="#d94a2f"/>' for i in range(6))+''.join(f'<ellipse cx="{200+35*math.cos(i*2.1+.5):.0f}" cy="{150+35*math.sin(i*2.1+.5):.0f}" rx="14" ry="7" fill="#2f7d32" transform="rotate({i*60} {200+35*math.cos(i*2.1+.5):.0f} {150+35*math.sin(i*2.1+.5):.0f})"/>' for i in range(3)),'#fdebd3')
svg('curry',plate+'<circle cx="200" cy="150" r="90" fill="#d9822b"/><circle cx="200" cy="150" r="78" fill="#e8a33d"/>'+dots(6,10,200,150,55,['#f2d7a1','#e9c68a'],13,'r')+dots(7,30,200,150,70,['#2f7d32'],3)+'<circle cx="290" cy="215" r="32" fill="#fff" stroke="#ddd"/>'+dots(8,40,290,215,28,['#f7f3ea'],3),'#fbe9c8')
svg('salad',plate+'<circle cx="200" cy="150" r="92" fill="#5fae4e"/>'+dots(9,14,200,150,70,['#d62828'],14)+dots(10,16,200,150,72,['#b7e4a0'],12)+dots(11,10,200,150,70,['#2b2b2b'],7)+dots(12,10,200,150,65,['#ffffff'],9,'r'),'#e6f4dd')
svg('pancakes','<ellipse cx="200" cy="200" rx="130" ry="40" fill="#fff"/>'+''.join(f'<ellipse cx="200" cy="{190-i*32}" rx="95" ry="28" fill="{c}"/><rect x="105" y="{190-i*32}" width="190" height="22" fill="{c}"/><ellipse cx="200" cy="{212-i*32}" rx="95" ry="26" fill="{c}"/>' for i,c in enumerate(['#c88a4a','#d99a58','#e6aa66']))+'<ellipse cx="200" cy="92" rx="80" ry="22" fill="#e6aa66"/><ellipse cx="200" cy="92" rx="55" ry="16" fill="#8a4b1c"/><rect x="180" y="78" width="40" height="22" rx="4" fill="#ffe27a"/>','#fff0d6')
svg('soup',plate+'<circle cx="200" cy="150" r="88" fill="#a83b2a"/><circle cx="200" cy="150" r="78" fill="#d9573d"/><path d="M150 150 Q200 110 250 150 Q200 190 150 150" fill="none" stroke="#fbe8d0" stroke-width="8"/><ellipse cx="200" cy="150" rx="22" ry="11" fill="#2f7d32" transform="rotate(-30 200 150)"/><rect x="285" y="190" width="70" height="40" rx="8" fill="#d7a35f" transform="rotate(-20 320 210)"/>','#fde3d9')
