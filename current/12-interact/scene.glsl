float scene10(vec3 p) {
    float d = 1e10;
    {
        // Rotated octahedron
        mat4 trans = rotateY(PI * 0.1);
        vec3 q = (trans * vec4(p, 1.)).xyz;
        q -= vec3(-0.7, 0., -2.);
        d = min(d, sdOctahedron(q, 1.8) - 0.01);
    }
    {
        mat4 trans = rotateX(PI * 0.2);
        vec3 q = (trans * vec4(p, 1.)).xyz;
        q -= vec3(0.5, 0.8, 1.0);
        float e = onion(sdCappedCylinder(q, vec2(0.8, 0.4)), 0.13);
        e = max(e, q.y);
        d = min(d, e);
    }
    return d;
}


float element(vec2 p, ivec2 s)
{
    vec2 r = opRepLim(p, 2.0, vec2(-s), vec2(+s));
    return abs(sdCircle(r, 0.5)) - 0.01;
}

float extrude_element(vec3 p, ivec2 s, float h)
{
    float d = element(p.xy, s);// distance to 2d SDF

    // extrude https://iquilezles.org/articles/distfunctions/
    vec2 w = vec2(d, abs(p.z-0.5) - h);
    return min(max(w.x, w.y), 0.0) + length(max(w, 0.0));
}

// underlying structure: https://en.wikipedia.org/wiki/Tetrastix
float structure(vec3 p, ivec3 s)
{
    return
    min
    (
    extrude_element(p.zxy+vec3(1, 0, 1), s.zx, float(2*s.y)+1.0),
    min
    (
    extrude_element(p.xyz+vec3(1, 0, 1), s.xy, float(2*s.z)+1.0),
    extrude_element(p.yzx+vec3(1, 0, 1), s.yz, float(2*s.x)+1.0)
    )
    );
}

float scene20(vec3 p) {
    // From Stacked Pipes: https://www.shadertoy.com/view/slcfDl
    float d = 1e10;
    ivec3 s = ivec3(0, 1, 1);
    return structure(p, s);
}

// Transformed https://www.shadertoy.com/view/XsdBW8 helix 1 by FabriceNeyret2
// to a hyperbolic paraboloid:
//  * adjust number of rotations
//  * replace bounding cylinder by bounding unit box
//  * adjust rotation angle to match diagonals
//  * straighten-out intersection of helix with box-wall to line
// Probably not an exact sdf (had to scale distance by factor 3 to avoid glitches).
float approx_hyperbolic_paraboloid(vec3 q)
{
    float t = sdBox(q, vec3(1,1,1)); // bounding box
    t = max(t, abs(sin(atan(q.y,q.x)-q.z*0.95/*???*//sqrt(1.+q.z*q.z/2.)))/3./*noglitch*/ * min(1.,length(q.xy))); // hyperbolic paraboloid
    //t = max(t, abs(sin(atan(q.y,q.x)-q.z*pi/4.0))/3. * min(1.,length(q.xy))); // original helix
    return t;
}

float halfspace(vec3 p)
{
    return p.z+1.0;
}

float scene30(vec3 p) {
    // hyperbolic paraboloid structure
    // https://www.shadertoy.com/view/mdX3Rn
    float d = 1e10;
    //d = min(d, sdBoxFrame(p, vec3(1), 0.01)); // unit-frame
    d = min(d, halfspace(p));
    //d = min(d, approx_hyperbolic_paraboloid(p));
    vec3 r = opRepLimFlip(p-vec3(1,1,0), 2.0, vec3(-2,-1,0), vec3(1,0,0));
    d = min(d, approx_hyperbolic_paraboloid(r.xzy));
    return d;
}

float scene40(vec3 p) {
    // Autumn grid
    // https://www.shadertoy.com/view/Ns23z1
    float d = 1e10;

    vec3 q = p;

    //Here we compute the cell coordinates + index per cell
    float size = 2.;
    vec3 iq = floor((p+size/2.)/size);
    q = mod(q+size/2.,size)-size/2.;

    //Some noisy pattern
    float n=0.;
    n+=0.5*sin(0.8*iq.x+1.1*time)*sin(0.71*iq.y+0.2*time+0.4)*sin(0.85*iq.z+0.3*time+1.4);
    n+=0.5*sin(0.5*iq.x+1.1*time+1.5)*sin(0.3*iq.y+1.3*time+1.7)*sin(0.1*iq.z+0.3*time+2.4);
    n = 1.-smoothstep(0.,0.2,n+0.1);


    //Distance to box in a cell + space clamp (tweak box distance to raymarch slow)
    d = 0.1*sdBox(q,0.5*vec3(n));
    d = max(d,sdBox(p,vec3(2.)));
    return d;
}

float sphere(vec3 p, vec3 c, float r) {
    return length(p-c) - r;
}

float cylinder(vec3 p, vec3 c, float r, float h) {
    vec3 d = p-c;
    return max(length(d.xz - c.xz) - r, abs(d.y) - h);
}

float box(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float plane(vec3 p, vec3 c, vec3 n) {
    return dot(p-c, n);
}

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
    return mix( b, a, h ) - k*h*(1.0-h);
}

float scene50(vec3 p) {
    // https://www.shadertoy.com/view/XlfyR4
    // Creepy Cylinders
    return smin(cylinder(vec3(mod(p.x, 2.1)-0.5*2.1,
    p.y,
    mod(p.z, 2.1)-2.1/2.0), vec3(0), 0.47, .8),
    plane(p, vec3(0,-0.2,0), vec3(0.0,1.0,0.0)), 0.4);
}


float map(vec3 p) {
    return scene50(p);
}
