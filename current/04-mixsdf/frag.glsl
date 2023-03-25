precision mediump float;

uniform vec2 resolution;
uniform float time;

vec3 getBackgroundColor(vec2 uv) {
    uv += 0.5;
    vec3 gradientStartColor = vec3(1., 0., 1.);
    vec3 gradientEndColor = vec3(0., 1., 1.);
    return mix(gradientStartColor, gradientEndColor, uv.y);
}

float sdfSquare(vec2 uv, float size, vec2 offset) {
    float x = uv.x - offset.x;
    float y = uv.y - offset.y;
    return max(abs(x), abs(y)) - size;
}

float sdfCircle(vec2 uv, float r, vec2 offset) {
    float x = uv.x - offset.x;
    float y = uv.y - offset.y;
    return length(vec2(x, y)) - r;
}

vec3 drawScene(vec2 uv) {
    vec3 col = getBackgroundColor(uv);
    float circle = sdfCircle(uv, 0.1, vec2(0, 0));
    float square = sdfSquare(uv, 0.07, vec2(0.1, 0));
    col = mix(vec3(0, 0, 1), col, step(0., circle));
    col = mix(vec3(1, 0, 0), col, step(0., square));
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
