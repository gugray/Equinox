precision mediump float;

uniform vec2 resolution;
uniform float time;

vec3 sdfCircle(vec2 uv, float r, vec2 offset) {
    uv -= offset;
    float d = length(uv) - r;

    //    float rg = smoothstep(-0.01, 0.01, d);
    //    return (vec3(rg, rg, 1.));
    return d > 0. ? vec3(0.) : 0.5 + 0.5 * cos(time + uv.xyx + vec3(0, 2, 4));
}

vec2 rotate(vec2 uv, float th) {
    return mat2(cos(th), sin(th), -sin(th), cos(th)) * uv;
}

vec3 sdfSquare(vec2 uv, float size, vec2 offset) {
    float x = uv.x - offset.x;
    float y = uv.y - offset.y;
    vec2 rotated = rotate(vec2(x,y), 3.14 * 0.125);
    float d = max(abs(rotated.x), abs(rotated.y)) - size;

    return d > 0. ? vec3(1.) : vec3(1., 0., 0.);
}

void main() {
    // gl_FragCoord is screen coordinates
    // uv is [0, 1]
    vec2 uv = gl_FragCoord.xy / resolution;
    uv -= 0.5;
    uv.x *= resolution.x / resolution.y;

    vec2 offset = vec2(0);
    vec3 col = sdfSquare(uv, 0.2, offset);
    gl_FragColor = vec4(col, 1.0);
}
