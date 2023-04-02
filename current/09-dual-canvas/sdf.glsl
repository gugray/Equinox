/**
 * Signed distance function for a sphere centered at the origin with radius 1.0;
 */
float sphereSDF(vec3 samplePoint) {
    vec3 center = vec3(2. * sin(time), -2. * cos(time * 0.25), 0.);
    center = vec3(0.);
    return length(samplePoint - center) - 1.;
}

float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz)-t.x, p.y);
    return length(q)-t.y;
}
