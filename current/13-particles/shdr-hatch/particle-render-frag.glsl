#version 300 es
precision highp float;

#include "../shdr-share/consts.glsl"
#include "../shdr-share/geo.glsl"
#include "../shdr-share/sdf.glsl"
#include "../shdr-share/utils.glsl"
// GIST.GLSL

in vec2 props;
out vec4 outColor;

void main() {
    outColor.a = 1.;
    outColor.rgb = renderParticle(props);
}
