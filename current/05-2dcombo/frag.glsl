precision mediump float;

uniform vec2 resolution;
uniform float time;

vec3 getBackgroundColor(vec2 uv) {
    uv += 0.5;
    vec3 gradientStartColor = vec3(1., 0., 1.);
    vec3 gradientEndColor = vec3(0., 1., 1.);
    return mix(gradientStartColor, gradientEndColor, uv.y);
}

float sdSquare(vec2 uv, float size, vec2 offset) {
    float x = uv.x - offset.x;
    float y = uv.y - offset.y;
    return max(abs(x), abs(y)) - size;
}

float sdCircle(vec2 uv, float r, vec2 offset) {
    float x = uv.x - offset.x;
    float y = uv.y - offset.y;
    return length(vec2(x, y)) - r;
}

float smin(float a, float b, float k) {
    float h = max(k-abs(a-b), 0.0)/k;
    return min(a, b) - h*h*k*(1.0/4.0);
}

float smax(float a, float b, float k) {
    return -smin(-a, -b, k);
}

vec3 drawScene(vec2 uv) {
    vec3 col = getBackgroundColor(uv);
    float d1 = sdCircle(uv, 0.1, vec2(0., 0.));
    float d2 = sdSquare(uv, 0.1, vec2(0.1, 0));
    float res;
    float k = .1;
    res = smin(d1, d2, k);
    res = step(0., res);
    col = mix(vec3(1, 0, 0), col, res);
    return col;
}

void main() {
    // gl_FragCoord is screen coordinates
    // We remap so uv.y goes [-0.5, 0.5]; x proportional by apect ratio
    vec2 uv = gl_FragCoord.xy / resolution;
    uv -= 0.5;
    uv.x *= resolution.x / resolution.y;

    vec3 col = drawScene(uv);

    gl_FragColor = vec4(col, 1.0);
}
