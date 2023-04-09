#version 300 es
precision highp float;

// https://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
// https://michaelwalczyk.com/blog-ray-marching.html

out vec4 outColor;

uniform vec2 resolution;
uniform float time;
uniform sampler2D difflight;

#include "consts.glsl"

void main() {

    ivec2 coords = ivec2(gl_FragCoord.xy);

    // Avoid edges
    ivec2 ires = ivec2(resolution);
    if (coords.x == 0 || coords.y == 1 || coords.x == ires.x - 1 || coords.y == ires.y - 1) {
        outColor = vec4(0.);
        return;
    }

    // Previously calculated color at surrounding pixels
    ivec2 ptAbove = coords + ivec2(0, 1);
    ivec2 ptBelow = coords + ivec2(0, -1);
    ivec2 ptLeft = coords + ivec2(-1, 0);
    ivec2 ptRight = coords + ivec2(1, 0);

    vec4 clrAbove = texelFetch(difflight, ptAbove, 0);
    vec4 clrBelow = texelFetch(difflight, ptBelow, 0);
    vec4 clrLeft = texelFetch(difflight, ptLeft, 0);
    vec4 clrRight = texelFetch(difflight, ptRight, 0);

    // Falling off shape
    if (clrAbove.w == 0. || clrBelow.w == 0. || clrRight.w == 0. || clrLeft.w == 0.) {
        outColor = vec4(0.);
        return;
    }

    float lumAbove = length(clrAbove.xyz);
    float lumBelow = length(clrBelow.xyz);
    float lumLeft = length(clrLeft.xyz);
    float lumRight = length(clrRight.xyz);


    vec2 grad = vec2(lumRight - lumLeft, lumAbove - lumBelow);

    outColor = vec4(grad, 1.0, 1.0);
}
