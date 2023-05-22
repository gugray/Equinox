vec2 opU(vec2 d1, vec2 d2) {
    return (d1.x<d2.x) ? d1 : d2;
}

float onion(float d, float h) {
    return abs(d)-h;
}

float sdSphere(vec3 p, float s) {
    return length(p)-s;
}

float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz)-t.x, p.y);
    return length(q)-t.y;
}

float sdBoxFrame(vec3 p, vec3 b, float e) {
    p = abs(p)-b;
    vec3 q = abs(p+e)-e;
    return min(min(
    length(max(vec3(p.x, q.y, q.z), 0.0))+min(max(p.x, max(q.y, q.z)), 0.0),
    length(max(vec3(q.x, p.y, q.z), 0.0))+min(max(q.x, max(p.y, q.z)), 0.0)),
    length(max(vec3(q.x, q.y, p.z), 0.0))+min(max(q.x, max(q.y, p.z)), 0.0));
}

float sdPlane(vec3 p, vec3 n, float h) {
    // n must be normalized
    return dot(p, n) + h;
}

float sdBox(vec3 p, vec3 dim) {
    vec3 q = abs(p) - dim;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdCappedCylinder(vec3 p, vec2 h) {
    vec2 d = abs(vec2(length(p.xz), p.y)) - h;
    return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float sdCircle(vec2 p, float r)
{
    return length(p) - r;
}

float sdOctahedron(vec3 p, float s) {
    p = abs(p);
    float m = p.x+p.y+p.z-s;
    vec3 q;
    if (3.0*p.x < m) q = p.xyz;
    else if (3.0*p.y < m) q = p.yzx;
    else if (3.0*p.z < m) q = p.zxy;
    else return m*0.57735027;

    float k = clamp(0.5*(q.z-q.y+s), 0.0, s);
    return length(vec3(q.x, q.y-s+k, q.z-k));
}


// Create multiple copies of an object - https://iquilezles.org/articles/distfunctions
vec2 opRepLim(in vec2 p, in float s, in vec2 lima, in vec2 limb)
{
    return p-s*clamp(round(p/s), lima, limb);
}

// Create multiple copies of an object - https://iquilezles.org/articles/distfunctions
// https://www.shadertoy.com/view/3syGzz Limited Repetition SDF by iq
// https://www.shadertoy.com/view/3tyBDW Limited Mirrored Repetition SDF modification by Dain
vec3 opRepLimFlip(in vec3 p, in float s, in vec3 lima, in vec3 limb)
{
    vec3 c = clamp(round(p/s), lima, limb);
    vec3 o = p-s*c;
    // flip every other cell
    if ((int(c.x)&1) == 1) o.x = -o.x;
    if ((int(c.y)&1) == 1) o.y = -o.y;

    return o;
}

// Circular repetition
// From https://www.shadertoy.com/view/3l3Bzn
float opCircRep(inout vec2 p, float count) {
    float an = 2.*PI/count;
    float a = atan(p.y, p.x)+an/2.;
    float c = floor(a/an);
    c = mix(c, abs(c), step(count*.5, abs(c)));
    a = mod(a, an)-an/2.;
    p.xy = vec2(cos(a), sin(a))*length(p);
    return c;
}
