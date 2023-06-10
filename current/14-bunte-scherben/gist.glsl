float H2 (vec2 st) {
    return fract(sin(dot(st,vec2(12.9898,8.233))) * 43758.5453123);
}

vec3 T(vec2 p) {
    return texture(txNoise, p).rgb;
}

vec2 grid(vec2 uv, float sz) {
    uv *= sz;
    return uv + 0.5 * sin(uv*1.9);
}

vec2 edge(vec2 sz) {
    return abs(fract(sz) - .5);
}

// const vec3 dims = vec3(5., 9., 13.);
// const vec3 dims = vec3(10., 25., 50.);
const vec3 dims = vec3(12.5, 17.5, 3.);

vec3 render0(vec2 coord) {

    vec2 uv = coord / res;

    float amp = 0.;

    float t = time * .000002;
    // t = 0.;

    vec2 a = grid(uv, dims.x);
    vec2 b = grid(uv, dims.y);
    vec2 c = grid(uv, dims.z);
    vec2 p = floor(a) / dims.x + 1.0 * t;
    vec2 q = floor(b) / dims.y + 0.7 * t;
    vec2 s = floor(c) / dims.z + 1.3 * t;

    vec2 bp = (edge(a) + edge(b) + edge(c)) / 2.5;
    bp = bp * bp * bp;

    vec3 tex = 0.7 * T(p) + 0.6 * T(q) + 0.7 * T(s);
    tex -= 0.2 * (bp.x + bp.y);

    float driver;
    driver = tex.r * tex.r * tex.b * 0.8;
    tex = tex * tex * 2. * smoothstep(1. + amp, 3.8, driver);

    return tex;
}

vec3 render1(sampler2D tx0, vec2 coord) {
    vec2 uv = coord / res;
    vec3 col = texelFetch(tx0, ivec2(coord), 0).rgb;
    // vec3 col = texture(tx0, uv).rgb;

    vec2 light = vec2(sin(time * 0.000003), cos(time * 0.00007));
    vec2 d = (.3 * light - uv) / 2.;
    d = light * 0.07;
    float w = 0.6;
    // vec2 s = uv + d * 0.3 * random(uv);
    vec2 s = uv + d * 0.003 * random(uv);;
    for (int i = 0; i < 4; i++) {
        col += w * texture(tx0, s).rgb;
        w *= 0.9;
        s += d;
    }

    // col = vec3(0.);
    return col;
}

