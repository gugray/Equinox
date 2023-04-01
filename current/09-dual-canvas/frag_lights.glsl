#version 300 es
precision highp float;

// https://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
// https://michaelwalczyk.com/blog-ray-marching.html

out vec4 outColor;

uniform vec2 resolution;
uniform float time;
uniform sampler2D surface;
uniform sampler2D normals;

#include "consts.glsl"
#include "geo.glsl"
#include "sdf.glsl"
#include "scene.glsl"
#include "march.glsl"

/**
 * Lighting contribution of a single point light source via Phong illumination.
 *
 * The vec3 returned is the RGB color of the light's contribution.
 *
 * k_a: Ambient color
 * k_d: Diffuse color
 * k_s: Specular color
 * alpha: Shininess coefficient
 * p: position of point being lit
 * eye: the position of the camera
 * lightPos: the position of the light
 * lightIntensity: color/intensity of the light
 *
 * See https://en.wikipedia.org/wiki/Phong_reflection_model#Description
 */
vec3 phongContribForLight(vec3 k_d, vec3 k_s, float alpha, vec2 uv, vec3 p, vec3 eye, vec3 lightPos, vec3 lightIntensity) {

    ivec2 coords = ivec2(uv);
    vec3 N = texelFetch(normals, coords, 0).xyz;

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
 *
 * The vec3 returned is the RGB color of that point after lighting is applied.
 * k_a: Ambient color
 * k_d: Diffuse color
 * k_s: Specular color
 * alpha: Shininess coefficient
 * p: position of point being lit
 * eye: the position of the camera
 *
 * See https://en.wikipedia.org/wiki/Phong_reflection_model#Description
 */
vec3 phongIllumination(vec3 k_a, vec3 k_d, vec3 k_s, float alpha, vec2 uv, vec3 p, vec3 eye) {

    const vec3 ambientLight = 0.5 * vec3(1.0, 1.0, 1.0);
    vec3 color = ambientLight * k_a;

    vec3 light1Pos = vec3(4.0 * sin(time), 2.0, 4.0 * cos(time));
    vec3 light1Intensity = vec3(0.4, 0.4, 0.4);
    color += phongContribForLight(k_d, k_s, alpha, uv, p, eye, light1Pos, light1Intensity);

    vec3 light2Pos = vec3(2.0 * sin(0.37 * time), 2.0 * cos(0.37 * time), 2.0);
    vec3 light2Intensity = vec3(0.4, 0.4, 0.4);
    color += phongContribForLight(k_d, k_s, alpha, uv, p, eye, light2Pos, light2Intensity);
    return color;
}

void main() {

    vec3 eye = vec3(5. * sin(time), 0., 5. * cos(time));

    // Previously calculated surface position at this pixel
    ivec2 coords = ivec2(gl_FragCoord.xy);
    vec3 p = texelFetch(surface, coords, 0).xyz;

    // No object here
    if (p.z == 0.0) {
        outColor = vec4(0.);
        return;
    }

    vec3 K_a = vec3(0.3, 0.3, 0.4);
    vec3 K_d = vec3(0.7, 0.7, 0.);
    vec3 K_s = vec3(1.9, 1.9, 0.);
    float shininess = 100.;

    vec3 color = phongIllumination(K_a, K_d, K_s, shininess, gl_FragCoord.xy, p, eye);

    outColor = vec4(color, 1.0);
}
