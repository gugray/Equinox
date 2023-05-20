#version 300 es
precision highp float;

#include "../shdr-share/consts.glsl"
#include "../shdr-share/utils.glsl"

uniform float szParticleState;
uniform sampler2D txPrev;
uniform sampler2D txScene;
uniform vec2 sceneRes;
uniform vec2 trgRes;
out vec4 outColor;

vec4 flow(vec4 prevState) {
    vec4 res;
    res.xy = prevState.xy + vec2(0.1);
    res.xy = mod(res.xy, trgRes);
    return res;
}

void main() {
    vec4 prevState = texelFetch(txPrev, ivec2(gl_FragCoord.xy), 0);
    outColor = prevState;

    int delta = 2;
    vec2 resRatio = sceneRes / trgRes;
    ivec2 sc = ivec2(prevState.xy * resRatio);

    ivec2 scAbove = ivec2(sc.x, min(int(trgRes.y - 1.), sc.y + delta));
    ivec2 scBelow = ivec2(sc.x, max(0, sc.y - delta));
    ivec2 scRight = ivec2(min(int(trgRes.x - 1.), sc.x + delta), sc.y);
    ivec2 scLeft = ivec2(max(0, sc.x - delta), sc.y);

    vec4 field = texelFetch(txScene, sc, 0);
    vec4 fieldAbove = texelFetch(txScene, scAbove, 0);
    vec4 fieldBelow = texelFetch(txScene, scBelow, 0);
    vec4 fieldRight = texelFetch(txScene, scRight, 0);
    vec4 fieldLeft = texelFetch(txScene, scLeft, 0);

    float gradX = fieldRight.x - fieldLeft.x;
    float gradY = fieldAbove.x - fieldBelow.x;
    vec2 grad = vec2(gradX, gradY);

    vec2 p = prevState.xy / trgRes;
    vec2 uv = p * vec2(trgRes.x / trgRes.y, 1.0) * 5.;
    float nofsX = snoise(vec3(uv, time * 0.0001));
    float nofsY = snoise(vec3(uv, 100. + time * 0.0001));

    if (length(grad) > 0. && field.y != 0.) {
        vec2 dir = normalize(grad);
        dir = vec2(-dir.y, dir.x);
        outColor.xy += 2. * dir * pow(field.z, 0.5);
        outColor.xy += vec2(nofsX, nofsY) * 0.8;
        outColor.xy = mod(outColor.xy, trgRes);
        outColor.zw = field.zw; // Light; ID
    }
    else {
        //outColor = flow(prevState);
        outColor.xy += vec2(nofsX, nofsY) * 2.;
        outColor.xy = mod(outColor.xy, trgRes);
        outColor.zw = vec2(0.);
    }

    float rndReset = random(length(prevState));
    if (rndReset < 0.05) {
        outColor.x = trgRes.x * random(prevState.y);
        outColor.y = trgRes.y * random(prevState.x);
        ivec2 sc = ivec2(outColor.xy * resRatio);
        vec4 field = texelFetch(txScene, sc, 0);
        if (field.y == 0.) outColor.zw = vec2(0.);
        else outColor.zw = field.zw;
    }
}
