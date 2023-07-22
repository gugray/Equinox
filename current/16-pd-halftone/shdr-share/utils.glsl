// From https://www.shadertoy.com/view/XljGzV
// =============================================================================
vec3 hsl2rgb(float h, float s, float l) {
    vec3 rgb = clamp(abs(mod(h*6.0+vec3(0.0, 4.0, 2.0), 6.0)-3.0)-1.0, 0.0, 1.0);
    return l + s * (rgb-0.5)*(1.0-abs(2.0*l-1.0));
}



float map(float value, float inMin, float inMax, float outMin, float outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

vec2 map(vec2 value, vec2 inMin, vec2 inMax, vec2 outMin, vec2 outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

vec3 map(vec3 value, vec3 inMin, vec3 inMax, vec3 outMin, vec3 outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}

vec4 map(vec4 value, vec4 inMin, vec4 inMax, vec4 outMin, vec4 outMax) {
    return outMin + (outMax - outMin) * (value - inMin) / (inMax - inMin);
}


// From https://gist.github.com/patriciogonzalezvivo/670c22f3966e662d2f83
// =============================================================================
//	Simplex 3D Noise
//	by Ian McEwan, Ashima Arts
vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
float taylorInvSqrt(float r){ return 1.79284291400159 - 0.85373472095314 * r; }
vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v){
    const vec2  C = vec2(1.0/6.0, 1.0/3.0);
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 =   v - i + dot(i, C.xxx);

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    //  x0 = x0 - 0. + 0.0 * C
    vec3 x1 = x0 - i1 + 1.0 * C.xxx;
    vec3 x2 = x0 - i2 + 2.0 * C.xxx;
    vec3 x3 = x0 - 1. + 3.0 * C.xxx;

    // Permutations
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    // Gradients
    // ( N*N points uniformly over a square, mapped onto an octahedron.)
    float n_ = 1.0/7.0;// N=7
    vec3  ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z *ns.z);//  mod(p,N*N)

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);// mod(j,N)

    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    // Normalize gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix final noise value
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0, x0), dot(p1, x1),
    dot(p2, x2), dot(p3, x3)));
}

// From https://www.shadertoy.com/view/Msf3WH
// =============================================================================
vec2 noise_hash(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

float noise(in vec2 p) {
    const float K1 = 0.366025404;// (sqrt(3)-1)/2;
    const float K2 = 0.211324865;// (3-sqrt(3))/6;

    vec2  i = floor(p + (p.x+p.y)*K1);
    vec2  a = p - i + (i.x+i.y)*K2;
    float m = step(a.y, a.x);
    vec2  o = vec2(m, 1.0-m);
    vec2  b = a - o + K2;
    vec2  c = a - 1.0 + 2.0*K2;
    vec3  h = max(0.5-vec3(dot(a, a), dot(b, b), dot(c, c)), 0.0);
    vec3  n = h*h*h*h*vec3(dot(a, noise_hash(i+0.0)), dot(b, noise_hash(i+o)), dot(c, noise_hash(i+1.0)));
    return dot(n, vec3(70.0));
}

// From https://stackoverflow.com/a/17479300
// =============================================================================
// A single iteration of Bob Jenkins' One-At-A-Time hashing algorithm.
uint hash(uint x) {
    x += (x << 10u);
    x ^= (x >>  6u);
    x += (x <<  3u);
    x ^= (x >> 11u);
    x += (x << 15u);
    return x;
}

// Compound versions of the hashing algorithm I whipped together.
uint hash(uvec2 v) { return hash(v.x ^ hash(v.y)); }
uint hash(uvec3 v) { return hash(v.x ^ hash(v.y) ^ hash(v.z)); }
uint hash(uvec4 v) { return hash(v.x ^ hash(v.y) ^ hash(v.z) ^ hash(v.w)); }

// Construct a float with half-open range [0:1] using low 23 bits.
// All zeroes yields 0.0, all ones yields the next smallest representable value below 1.0.
float floatConstruct(uint m) {
    const uint ieeeMantissa = 0x007FFFFFu;// binary32 mantissa bitmask
    const uint ieeeOne      = 0x3F800000u;// 1.0 in IEEE binary32

    m &= ieeeMantissa;// Keep only mantissa bits (fractional part)
    m |= ieeeOne;// Add fractional part to 1.0

    float  f = uintBitsToFloat(m);// Range [1:2]
    return f - 1.0;// Range [0:1]
}

// Pseudo-random value in half-open range [0:1].
float random(float x) { return floatConstruct(hash(floatBitsToUint(x))); }
float random(vec2  v) { return floatConstruct(hash(floatBitsToUint(v))); }
float random(vec3  v) { return floatConstruct(hash(floatBitsToUint(v))); }
float random(vec4  v) { return floatConstruct(hash(floatBitsToUint(v))); }

// From https://www.shadertoy.com/view/dlfXDN
// Stevan Gustavson's 4D simplex noise: https://github.com/stegu/webgl-noise/blob/master/src/noise4D.glsl
// I left the scalar output intact for anyone who just wants
// to copy and paste it to use for a project.

// (sqrt(5) - 1)/4 = F4
#define F4 0.309016994374947451

const int maxstps = 100;
const float maxdst = 100.0;
const float mindst = 0.001;
const float pi = 3.1415927410125732421875;
const float tau = 6.283185482025146484375;
const float nscale = 2.0; // scales noise

vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

float mod289(float x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 permute289(vec4 x) {
    return mod289(((x * 34.0) + 10.0) * x);
}

float permute289(float x) {
    return mod289(((x * 34.0) + 10.0) * x);
}

vec4 grad4(float j, vec4 ip) {
    const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
    vec4 p, s;

    p.xyz = floor(fract (vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
    p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
    s = vec4(lessThan(p, vec4(0.0)));
    p.xyz = p.xyz + (s.xyz * 2.0 - 1.0) * s.www;

    return p;
}

float snoise(vec4 v, out vec4 grad) {
    const vec4  C = vec4( 0.138196601125011,  // (5 - sqrt(5))/20  G4
    0.276393202250021,  //  2 * G4
    0.414589803375032,  //  3 * G4
    -0.447213595499958); // -1 + 4 * G4

    vec4 i = floor(v + dot(v, vec4(F4)));
    vec4 x0 = v - i + dot(i, C.xxxx);

    vec4 i0;
    vec3 isX = step(x0.yzw, x0.xxx);
    vec3 isYZ = step(x0.zww, x0.yyz);
    i0.x = isX.x + isX.y + isX.z;
    i0.yzw = 1.0 - isX;
    i0.y += isYZ.x + isYZ.y;
    i0.zw += 1.0 - isYZ.xy;
    i0.z += isYZ.z;
    i0.w += 1.0 - isYZ.z;

    vec4 i3 = clamp(i0,  0.0, 1.0 );
    vec4 i2 = clamp(i0 - 1.0, 0.0, 1.0 );
    vec4 i1 = clamp(i0 - 2.0, 0.0, 1.0 );

    vec4 x1 = x0 - i1 + C.xxxx;
    vec4 x2 = x0 - i2 + C.yyyy;
    vec4 x3 = x0 - i3 + C.zzzz;
    vec4 x4 = x0 + C.wwww;

    i = mod289(i);
    float j0 = permute289(permute289(permute289(permute289(i.w) + i.z) + i.y) + i.x);
    vec4 j1 = permute289(permute289(permute289(permute289(
    i.w + vec4(i1.w, i2.w, i3.w, 1.0))
    + i.z + vec4(i1.z, i2.z, i3.z, 1.0))
    + i.y + vec4(i1.y, i2.y, i3.y, 1.0))
    + i.x + vec4(i1.x, i2.x, i3.x, 1.0));

    vec4 ip = vec4(1.0 / 294.0, 1.0 / 49.0, 1.0 / 7.0, 0.0);

    vec4 p0 = grad4(j0,   ip);
    vec4 p1 = grad4(j1.x, ip);
    vec4 p2 = grad4(j1.y, ip);
    vec4 p3 = grad4(j1.z, ip);
    vec4 p4 = grad4(j1.w, ip);

    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    p4 *= taylorInvSqrt(dot(p4, p4));

    vec3 m0 = max(0.6 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2)), 0.0);
    vec2 m1 = max(0.6 - vec2(dot(x3, x3), dot(x4, x4)             ), 0.0);
    vec3 m02 = m0 * m0;
    vec2 m12 = m1 * m1;
    vec3 m04 = m02 * m02;
    vec2 m14 = m12 * m12;
    vec3 pdotx0 = vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2));
    vec2 pdotx1 = vec2(dot(p3, x3), dot(p4, x4));

    vec3 temp0 = m02 * m0 * pdotx0;
    vec2 temp1 = m12 * m1 * pdotx1;

    // Here the gradient is calculated
    grad = -8.0 * (temp0.x * x0 + temp0.y * x1 + temp0.z * x2 + temp1.x * x3 + temp1.y * x4);
    grad += m04.x * p0 + m04.y * p1 + m04.z * p2 + m14.x * p3 + m14.y * p4;

    // There's probably an exact factor the result can be
    // multiplied by to get a range of -1.0 to 1.0,
    // but I didn't know how to find it, so I just normalized the vector
    grad = normalize(grad);

    return 49.0 * (dot(m04, pdotx0) + dot(m14, pdotx1));
}
