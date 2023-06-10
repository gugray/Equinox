/*
// #65 Elout de Kok
// https://www.fxhash.xyz/gentk/FX1-40882

U(
  bx3(mod(x, 3) - 1.5, y, mod(z, 3) - 1.5, 1.3) - 0.1,
  bx3(mod(x, 11) - 5.5, y + 0.5, mod(z, 11) - 5.5, 3) - 0.8
)

// #57 Speginel
// https://www.fxhash.xyz/gentk/FX1-40770
x=6*log(L(x,y-4)) + 4*atan2(x,y+1)/PI,
L(mod(x,4)-2, 0, z) -.7

// #121 NftEconomist
// https://www.fxhash.xyz/gentk/FX1-41692
min(
  bx3(x, y, z + 48, 20, 10, 2),
  don(x, y, mod(z, 20) - 5, 10, 2),
  y+=10,
  U(L(x,y)-2),
  L(y,z-60)-2,
  (L(x,B(y)-10,B(z)-30)-1)-3
)

// #152 kylo.tez
// https://www.fxhash.xyz/gentk/FX1-42039
n1=.1,n2=.3,n3=.3,s1=sin(n1),c1=cos(n1),s2=sin(n2),c2=cos(n2),s3=sin(n3),c3=cos(n3),sa=12,dd=0.2,sk=sa*(1-dd),sd=sa*dd;
  [x,y]=rot(x,y,c1,s1),
  [y,z]=rot(y,z,c2,s2),
  [z,x]=rot(z,x,c3,s3),
  [h,j,n]=[B(x),B(y),B(z)],
  @2{@hnj{$=B($)-sa,}}
  @xyz{$=($+sk*1.5)/(sk*3),}
  bx3(h,j,n,sk)-1
  +nz(x,y,z,((G((ri(Z(x)+2,Z(y),Z(z),2)+.5),.1)-.1)*50)**2,0)
  *.04

// #169 Liam Egan
// https://www.fxhash.xyz/gentk/FX1-42384
px=-5, py=20, pz=-20, pr=15, ko=5, kt=1.5,  [x, y] = r0(x,y), [y, z] = r1(y,z), @xyz{r$=$,}  cx=L(x-px, z-pz)-pr, cy = y-py, ca = atan2(x-px, z-pz)*kt, [cx, cy] = rot(cx, cy, cos(ca), sin(ca)), cy=B(cy)-ko, cx=B(cx)-ko,  dx=3.2, dy=.2,  @xy{n$=B(c$)-d$,}  d= L(G(nx, 0) + U(G(nx, ny),0), G(ny, 0) + U(G(nx, ny),0))-.4

// #232 poperbu
// https://www.fxhash.xyz/gentk/FX1-43674
bx3(mod(x,2.5), y-12, mod(z,-6), 1, 2, 8, 8)

// #228 NftBiker
// https://www.fxhash.xyz/gentk/FX1-43646
[x,z]=r0(x,z),
[x,z]=r1(z,x),
c=ri(mod(x,25),mod(y,2)-1,z),
s=nz(x/25,25,z,2,0,2),
s2=nz(x/5,0,mod(z,10)-5,1,0,1),
y-c-scl(TR(x+s), 0.25, -1.75*s2, 2.5)

// #78 pixelwank
// https://www.fxhash.xyz/gentk/FX1-41083
b=bx3(mod(x,4)-2,y,mod(z,4)-2,5)-0.2,
n=nz(x,y,z,0.4,0,2)*22;
B(b-(L(x,y+8,z)-5))-n


TS: antibodies

ng=(nz(x,y,z,1,0,1)+0.5)*1.8,
  nh=(nz(x,y,z,1,2,1)+0.5)*1.8,
  n=nz(x,y,z,0.4,0,2)*1;
U(
  L(mod(x-ng,18+ng)-9-ng*0.5,mod(y,18+nh)-9-nh*0.5,mod(z,24)-12)-3.5-n,
  L(x,y,z)-6-nh*0.3
)

Getting the hang of reps
U(
(@2{
x=B(x)-8,y=B(y*2)-8,
}(L(x,y,z)-8)*0.1),
)

Sugar Cube

[xa,za]=[x+0,z+0],
[xb,yb]=r0(xa,y),zb=za;
U(
bx2(L(x,z)-40,y,40,(sin(L(x,z)+2))),
bx2(L(xb,zb)-40,yb,40,(sin(L(xb,zb)/2+1)**4)),
(@7{@z{$=B($)-4,}}L((x-21),(y-16),z)-2.5)
)

Impartial Observers

[xa,za]=[x+0,z+0],
[xb,yb]=r0(xa,y),zb=za;
U(
bx2(L(x,z)-40,y,40,(sin(L(x,z)+2))),
bx2(L(xb,zb)-40,yb,40,(sin(L(xb,zb)/2+1)**4)),
(@7{@z{$=B($)-8,}}L((x-21),(y-16),z)-6.5)
)


[x,z]=rot(x,z,0.3,-0.3),y+=10,
s=(z<-5?0:nz(x*15,z*15,0,1,3)*0.4),
U(
bx3((x+50),(y+50+s),z,50,50,50),
bx3((x-50),(y+50),(z-50),50,50,50),
bx3((x+50),(y-50),(z-50),50,50,50),
)

cs=5.01,cg=1;
x+=20,z-=20,y+=20,
[y,z]=r1(y,z),
[x,z]=r0(x,z),
max(
bx3(x,y,z,20,20,20),
-bx3(mod(x,cs),y,z,cg,100,100),
-bx3(x,y,mod(z,cs),100,100,cg),
-bx3(x,mod(y,cs),z,100,cg,100),
)

mb=(x,y,z,n,rd,t,w)=>(
rd/=PI*2,
c1=[L(x,y),z],
th=atan2(x,y),
ic=[rd-c1[0],-c1[1]],
ic=rot(ic[0],ic[1],cos(th*n-2),sin(th*n-2)),
it=[ic[0],ic[1],th*rd],
d=bx3(it[0],it[1],it[2],t,w,rd*6)-0.5,
d
);
y-=7,
U(
mb(x*0.75,y,z,2.5,230,0.3,8),
mb(x,y,z,1.5,120,0.2,6),
)

float de( in vec3 p, out vec3 color1, out vec3 color2, out float roughness ) {
    
    color1 = vec3(0.7);
    color2 = vec3(0.7);
    roughness = 4.0;
    
    #ifdef SHOW_ANT
    return deAnt(p.zxy, fract(iTime), color1, color2, roughness);
    #endif
    
    // perimeter of the moebius strip is 38
    #define RADIUS (1.0/(PI*2.0)*38.0)
    
    // cylindrical coordinates
    vec2 c1 = vec2(length(p.xy), p.z);
    float th = atan(p.x, p.y);
    vec2 ic = vec2(RADIUS, 0) - c1;
    // rotate 180° to form the loop
    ic *= rot(th*1.5-2.0);
    // coordinates in a torus (cylindrical coordinates + position on the stripe)
    vec3 it = vec3(ic, th * RADIUS);
    
    // add the band
    float bandDist = sdBox(it, vec3(0.05, 1, 100)) - 0.05;
    float d = bandDist;


    // add holes
    vec3 inHole = vec3(mod(it.yz, vec2(0.5)) - vec2(0.25), it.x);
    inHole.xyz = inHole.zxy;
    float holeDist = sdBox(inHole, vec3(0.18));
    d = smax(d, -holeDist, 0.05);
    
    
	return d;
}


*/
