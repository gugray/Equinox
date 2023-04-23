#version 300 es
precision highp float;

// https://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
// https://michaelwalczyk.com/blog-ray-marching.html

out vec4 outColor;

uniform vec2 resolution;
uniform float time;
uniform float eyeFOV;
uniform float eyeAzimuth;
uniform float eyeAltitude;
uniform float eyeDistance;
uniform vec3 light1Vec;
uniform float light1Strength;
uniform vec3 light2Vec;
uniform float light2Strength;
uniform float ambientLightStrength;
uniform bool curvatureLight;

#include "consts.glsl"
#include "geo.glsl"
#include "sdf.glsl"
#include "scene.glsl"
#include "march.glsl"
#include "light.glsl"

// Using the gradient of the SDF, estimate the normal on the surface at point p.
vec3 estimateNormal(vec3 p) {
    return normalize(vec3(
    map(vec3(p.x + EPSILON, p.y, p.z)) - map(vec3(p.x - EPSILON, p.y, p.z)),
    map(vec3(p.x, p.y + EPSILON, p.z)) - map(vec3(p.x, p.y - EPSILON, p.z)),
    map(vec3(p.x, p.y, p.z  + EPSILON)) - map(vec3(p.x, p.y, p.z - EPSILON))
    ));
}

struct PointInfo {
    vec4 color; // Display color
    float dlum; // Luminosity from diffuse illumination from eye
    float dist; // Distance from eye
    vec2 dlumGradient; // Diffuse luminosity gradient
};

PointInfo calcPoint(vec2 coord) {

    PointInfo res;
    res.color = vec4(0.);
    res.dist = 0.;
    res.dlum = 0.;
    res.dlumGradient = vec2(0.);

    vec3 eye = vec3(cos(eyeAltitude) * sin(eyeAzimuth), sin(eyeAltitude), cos(eyeAltitude) * cos(eyeAzimuth));
    eye *= eyeDistance;

    vec3 viewDir = rayDirection(eyeFOV, resolution.xy, coord.xy);
    mat4 viewToWorld = viewMatrix(eye, vec3(0.0, 0.0, 0.0), vec3(0.0, 1.0, 0.0));
    vec3 worldDir = (viewToWorld * vec4(viewDir, 0.0)).xyz;

    res.dist = march(eye, worldDir, MIN_DIST, MAX_DIST);

    // Didn't hit anything
    if (res.dist > MAX_DIST - EPSILON) {
        //outColor = vec4(0.);
        res.dist = 0.;
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
    {
        vec3 normLightDir = normalize(light1Vec);
        float strength = light1Strength * clamp(dot(normal, normLightDir), 0.0, 1.0);
        float shadow = calcSoftshadow(p, normLightDir, 0.001, 20.0, 64.0);
        res.color.xyz += vec3(strength * shadow);
    }
    // Diffuse illumination with shadow - light 2
    {
        vec3 normLightDir = normalize(light2Vec);
        float strength = light2Strength * clamp(dot(normal, normLightDir), 0.0, 1.0);
        float shadow = calcSoftshadow(p, normLightDir, 0.001, 20.0, 64.0);
        res.color.xyz += vec3(strength * shadow);
    }
    // Ambient light, plus some light from above
    //float ambient = ambientLightStrength * (1.0 + 0.5 * normal.y);
    float ambient = ambientLightStrength;
    res.color.xyz += vec3(ambient);

    // // Phong illumunation
    // vec3 K_a = vec3(0.2); // Ambient color
    // vec3 K_d = vec3(1.); // Diffuse color
    // vec3 K_s = vec3(1.8); // Specular color
    // float shininess = 5.;
    // res.color = vec4(phongIllumination(K_a, K_d, K_s, shininess, p, normal, eye), 1.);

    return res;
}

void main() {

    bool isPaneA = gl_FragCoord.x < resolution.x;
    vec2 coord = vec2(mod(gl_FragCoord.x, resolution.x), gl_FragCoord.y);

    float e = 3.;
    PointInfo info = calcPoint(coord);
    PointInfo infoAbove = calcPoint(vec2(coord.x, min(resolution.y - 1., coord.y + e)));
    PointInfo infoBelow = calcPoint(vec2(coord.x, max(0., coord.y -e)));
    PointInfo infoLeft = calcPoint(vec2(max(0., coord.x - e), coord.y));
    PointInfo infoRight = calcPoint(vec2(min(resolution.x - 1., coord.x + e), coord.y));

    if (isPaneA) {
        if (curvatureLight) outColor = vec4(info.dlum, info.dlum, info.dlum, 1.);
        else outColor = info.color;
    }
    else {
        float lum = clamp(info.color.r + info.color.b + info.color.g / 3., 0., 1.);
        if (curvatureLight) lum = info.dlum;
        outColor = vec4(lum, info.dist, infoRight.dlum - infoLeft.dlum, infoAbove.dlum - infoBelow.dlum);
    }
}
