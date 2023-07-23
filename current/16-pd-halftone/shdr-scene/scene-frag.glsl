#version 300 es
precision highp float;

// https://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
// https://michaelwalczyk.com/blog-ray-marching.html

out vec4 outColor;

uniform vec2 resolution;
uniform bool curvatureLight;

#include "../shdr-share/globals.glsl"
#include "../shdr-share/geo.glsl"
#include "../shdr-share/sdf.glsl"
#include "../shdr-share/utils.glsl"
// GIST.GLSL
#include "light.glsl"

// Using the gradient of the SDF, estimate the normal on the surface at point p.
vec3 estimateNormal(vec3 p) {
    vec2 e = vec2(1.0, -1.0) * EPSILON;
    return normalize(
    e.xyy * map(p + e.xyy).x +
    e.yyx * map(p + e.yyx).x +
    e.yxy * map(p + e.yxy).x +
    e.xxx * map(p + e.xxx).x);
}

// From https://www.shadertoy.com/view/XsB3Rm
// Raymarching Sample Code by gltracy
// Not using for now; here for reference
vec2 ray_marching(vec3 ro, vec3 rd) {
    float depth = 0.0;
    float dist = 10000.0;
    float step = 0.0;
    float ep = 0.0001;
    float id = 0.0;
    for (int i = 0; i < 256; i++) {
        vec3 pt = ro + rd * depth;
        vec2 d_id = map(pt);
        dist = d_id.x;
        id = d_id.y;
        if (dist < ep) {
            break;
        }
        step = dist;
        depth += step;
        if (depth > MAX_DIST) {
            break;
        }
    }
    if (dist >= ep) {
        return vec2(0.0, 0.0);
    }
    dist -= step;
    for (int i = 0; i < 4; i++) {
        step *= 0.5;
        vec3 pt = ro + rd * (dist + step);
        vec2 d_id = map(pt);
        if (d_id.x >= ep) {
            dist += step;
        }
    }
    return vec2(depth, id);
}

vec2 march(vec3 ro, vec3 rd) {
    float depth = MIN_DIST;
    vec2 res = vec2(0.0);
    float id = 0.;
    for (int i = 0; i < MAX_MARCHING_STEPS; i++) {
        vec3 p = ro + depth * rd;
        res = map(p);
        depth += res.x;
        id = res.y;
        if (res.x < EPSILON || depth > MAX_DIST) break;
    }
    return vec2(depth, id);
}


struct PointInfo {
    vec4 color; // Display color
    float dlum; // Luminosity from diffuse illumination from eye
    float dist; // Distance from eye
    float id;
};

PointInfo calcPoint(vec2 coord) {

    PointInfo res;
    res.color = vec4(0.);
    res.dist = 0.;
    res.dlum = 0.;

    vec3 eye = vec3(cos(eyeAltitude) * sin(eyeAzimuth), sin(eyeAltitude), cos(eyeAltitude) * cos(eyeAzimuth));
    eye *= eyeDistance;

    vec3 viewDir = rayDirection(eyeFOV, resolution.xy, coord.xy);
    mat4 viewToWorld = viewMatrix(eye, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
    vec3 worldDir = (viewToWorld * vec4(viewDir, 0.0)).xyz;

    vec2 marchRes = march(eye, worldDir);
    res.dist = marchRes.x;
    res.id = marchRes.y;

    // Didn't hit anything
    if (res.dist > MAX_DIST - EPSILON) {
        res.color = vec4(vec3(bgLum), 1.);
        res.dist = 0.;
        res.id = 0.;
        return res;
    }

    // The closest point on the surface to the eyepoint along the view ray
    vec3 p = eye + res.dist * worldDir;
    // Surface normal here
    vec3 normal = estimateNormal(p);
    // Diffuse illumination from eye ~ for curvature modeling
    res.dlum = clamp(dot(normal, normalize(eye - p)), 0.0, 1.0);

    // No transparency where there's an object
    res.color.w = 1.0;

    // Diffuse illumination with shadow - light 1
    if (light1Strength > 0.0)
    {
        vec3 normLightDir = normalize(light1Vec);
        float strength = light1Strength * clamp(dot(normal, normLightDir), 0.0, 1.0);
        float shadow = 1.0;
        if (shadows) shadow = calcSoftshadow(p, normLightDir, 0.001, 20.0, 64.0);
        res.color.xyz += vec3(strength * shadow);
    }
    // Diffuse illumination with shadow - light 2
    if (light2Strength > 0.0)
    {
        vec3 normLightDir = normalize(light2Vec);
        float strength = light2Strength * clamp(dot(normal, normLightDir), 0.0, 1.0);
        float shadow = 1.0;
        if (shadows) shadow = calcSoftshadow(p, normLightDir, 0.001, 20.0, 64.0);
        res.color.xyz += vec3(strength * shadow);
    }
    // Ambient light
    float ambient = ambientLightStrength;
    res.color.xyz += vec3(ambient);

    return res;
}

void main() {

    view();
    vec2 coord = gl_FragCoord.xy;
    PointInfo info = calcPoint(coord);
    float light = clamp(info.color.r + info.color.b + info.color.g / 3., 0., 1.);
    outColor = vec4(info.dlum, info.dist, light, info.id);
}
