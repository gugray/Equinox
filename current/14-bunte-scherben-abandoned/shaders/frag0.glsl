#version 300 es
precision highp float;

#include "./utils.glsl"
#include "./shared.glsl"
// GIST.GLSL

out vec4 outColor;

void main() {
    outColor = vec4(render0(gl_FragCoord.xy), 0.);
}
