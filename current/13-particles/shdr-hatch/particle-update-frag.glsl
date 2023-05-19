#version 300 es
precision highp float;

#include "random.glsl"

uniform float szParticleState;
uniform sampler2D txPrev;
uniform vec2 resolution;
uniform float time;
out vec4 outColor;

void main() {
    vec4 prevState = texelFetch(txPrev, ivec2(gl_FragCoord.xy), 0);
    outColor.xy = prevState.xy + vec2(2.5);
    outColor.xy = mod(outColor.xy, resolution);

    float rndReset = random(length(prevState));
    if (rndReset < 0.01) {
        outColor.x = resolution.x * random(prevState.y);
        outColor.y = resolution.y * random(prevState.x);
    }
}
