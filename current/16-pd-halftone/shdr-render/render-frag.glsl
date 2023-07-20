#version 300 es
precision highp float;

uniform sampler2D txScene;
uniform vec2 sceneRes;
uniform vec2 trgRes;
uniform bool rawScene;
out vec4 outColor;

#include "../shdr-share/globals.glsl"
#include "../shdr-share/geo.glsl"
#include "../shdr-share/sdf.glsl"
#include "../shdr-share/utils.glsl"
// GIST.GLSL

void main() {

    outColor = renderScene(gl_FragCoord.xy, trgRes, txScene, sceneRes);

//    outColor.a = 1.;
//
//    vec2 ratio = srcRes / trgRes;
//    vec4 tx = texelFetch(txSource, ivec2(gl_FragCoord.xy * ratio), 0);
//    if (rawScene) outColor.rgb = vec3(tx.z);
//    else outColor.rgb = tx.rgb;
//
//    outColor.rgb *= blendMul;
//    outColor.rgb -= vec3(blendSub);
}
