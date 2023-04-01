#version 300 es
precision highp float;

// https://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
// https://michaelwalczyk.com/blog-ray-marching.html

out vec4 outColor;

uniform vec2 resolution;
uniform float time;

#include "consts.glsl"
#include "geo.glsl"
#include "sdf.glsl"
#include "scene.glsl"
#include "march.glsl"

void main() {
    vec3 viewDir = rayDirection(45.0, resolution.xy, gl_FragCoord.xy);
    vec3 eye = vec3(5. * sin(time), 0., 5. * cos(time));
    mat4 viewToWorld = viewMatrix(eye, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
    vec3 worldDir = (viewToWorld * vec4(viewDir, 0.0)).xyz;

    float dist = march(eye, worldDir, MIN_DIST, MAX_DIST);

    // Didn't hit anything
    if (dist > MAX_DIST - EPSILON) {
        outColor = vec4(0.);
        return;
    }

    // The closest point on the surface to the eyepoint along the view ray
    vec3 p = eye + dist * worldDir;
    outColor = vec4(p, 1.0);
}
