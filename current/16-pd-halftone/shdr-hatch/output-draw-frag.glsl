#version 300 es
precision highp float;

uniform sampler2D txSource;
uniform vec2 srcRes;
uniform vec2 trgRes;
uniform bool rawScene;
uniform float blendMul;
uniform float blendSub;
out vec4 outColor;

void main() {

    outColor.a = 1.;

    vec2 ratio = srcRes / trgRes;
    vec4 tx = texelFetch(txSource, ivec2(gl_FragCoord.xy * ratio), 0);
    if (rawScene) outColor.rgb = vec3(tx.z);
    else outColor.rgb = tx.rgb;

    outColor.rgb *= blendMul;
    outColor.rgb -= vec3(blendSub);
}
