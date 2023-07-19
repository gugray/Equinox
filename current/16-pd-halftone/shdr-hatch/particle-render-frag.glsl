#version 300 es
precision highp float;

#include "../shdr-share/globals.glsl"
#include "../shdr-share/geo.glsl"
#include "../shdr-share/sdf.glsl"
#include "../shdr-share/utils.glsl"
// GIST.GLSL

in vec2 props;
uniform vec2 resolution;
out vec4 outColor;

void main() {
    outColor.a = 1.;
    outColor.rgb = renderParticle(gl_FragCoord.xy, resolution, props);
}
