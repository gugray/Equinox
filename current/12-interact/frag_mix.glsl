#version 300 es
precision highp float;

// https://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
// https://michaelwalczyk.com/blog-ray-marching.html

out vec4 outColor;

uniform vec2 resolution;
uniform float time;
uniform bool onscreen;

#include "consts.glsl"
#include "geo.glsl"
#include "sdf.glsl"
#include "scene.glsl"
#include "march.glsl"

// Using the gradient of the SDF, estimate the normal on the surface at point p.
vec3 estimateNormal(vec3 p) {
    return normalize(vec3(
    sceneSDF(vec3(p.x + EPSILON, p.y, p.z)) - sceneSDF(vec3(p.x - EPSILON, p.y, p.z)),
    sceneSDF(vec3(p.x, p.y + EPSILON, p.z)) - sceneSDF(vec3(p.x, p.y - EPSILON, p.z)),
    sceneSDF(vec3(p.x, p.y, p.z  + EPSILON)) - sceneSDF(vec3(p.x, p.y, p.z - EPSILON))
    ));
}

float diffuseIllumination(vec3 p, vec3 normal, vec3 eye) {
    vec3 dir = normalize(eye - p);
    return dot(normal, dir);
}

/**
 * Lighting contribution of a single point light source via Phong illumination.
 * The vec3 returned is the RGB color of the light's contribution.
 * k_a: Ambient color
 * k_d: Diffuse color
 * k_s: Specular color
 * alpha: Shininess coefficient
 * p: position of point being lit
 * eye: the position of the camera
 * lightPos: the position of the light
 * lightIntensity: color/intensity of the light
 */
vec3 phongContribForLight(vec3 k_d, vec3 k_s, float alpha, vec3 p, vec3 N, vec3 eye, vec3 lightPos, vec3 lightIntensity) {

    vec3 L = normalize(lightPos - p);
    vec3 V = normalize(eye - p);
    vec3 R = normalize(reflect(-L, N));

    float dotLN = dot(L, N);
    float dotRV = dot(R, V);

    if (dotLN < 0.0) {
        // Light not visible from this point on the surface
        return vec3(0.0, 0.0, 0.0);
    }

    if (dotRV < 0.0) {
        // Light reflection in opposite direction as viewer, apply only diffuse
        // component
        return lightIntensity * (k_d * dotLN);
    }
    return lightIntensity * (k_d * dotLN + k_s * pow(dotRV, alpha));
}

/**
 * Lighting via Phong illumination.
 * The vec3 returned is the RGB color of that point after lighting is applied.
 * k_a: Ambient color
 * k_d: Diffuse color
 * k_s: Specular color
 * alpha: Shininess coefficient
 * p: position of point being lit
 * eye: the position of the camera
 */
vec3 phongIllumination(vec3 k_a, vec3 k_d, vec3 k_s, float alpha, vec3 p, vec3 N, vec3 eye) {

    const vec3 ambientLight = 0.5 * vec3(1.0, 1.0, 1.0);
    vec3 color = ambientLight * k_a;

    float t = 8.;

    vec3 light1Pos = vec3(4.0 * sin(t), 2.0, 4.0 * cos(t));
    vec3 light1Intensity = vec3(0.4, 0.4, 0.4);
    color += phongContribForLight(k_d, k_s, alpha, p, N, eye, light1Pos, light1Intensity);

    vec3 light2Pos = vec3(2.0 * sin(0.37 * t), 2.0 * cos(0.37 * t), 2.0);
    vec3 light2Intensity = vec3(0.4, 0.4, 0.4);
    color += phongContribForLight(k_d, k_s, alpha, p, N, eye, light2Pos, light2Intensity);
    return color;
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

    vec3 viewDir = rayDirection(45.0, resolution.xy, coord.xy);
    vec3 eye = vec3(0., 0., 5.);
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
    // Diffuse illumination from eye
    res.dlum = diffuseIllumination(p, normal, eye);

    // Phong illumunation
    vec3 K_a = vec3(0.2); // Ambient color
    vec3 K_d = vec3(1.); // Diffuse color
    vec3 K_s = vec3(1.8); // Specular color
    float shininess = 5.;
    res.color = vec4(phongIllumination(K_a, K_d, K_s, shininess, p, normal, eye), 1.);

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
        outColor = info.color;
        //outColor = vec4(info.dlum, info.dlum, info.dlum, 1.);
    }
    else {
        outColor = vec4(info.dlum, info.dist, infoRight.dlum - infoLeft.dlum, infoAbove.dlum - infoBelow.dlum);
    }
}
