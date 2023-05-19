#version 300 es
precision highp float;

uniform sampler2D txOutput;
uniform float blendMul;
uniform float blendSub;
out vec4 outColor;

void main() {
    outColor = texelFetch(txOutput, ivec2(gl_FragCoord.xy), 0);
    outColor.a = 1.;
    outColor.rgb *= blendMul;
    outColor.rgb -= vec3(blendSub);
}
