#version 300 es
precision highp float;

#include "./utils.glsl"
#include "./shared.glsl"
// GIST.GLSL

uniform sampler2D tx0;
out vec4 outColor;

void main() {
    outColor = vec4(render1(tx0, gl_FragCoord.xy), 1.);
}
