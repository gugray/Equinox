/**
 * Signed distance function describing the scene.
 *
 * Absolute value of the return value indicates the distance to the surface.
 * Sign indicates whether the point is inside or outside the surface,
 * negative indicating inside.
 */
float sceneSDF(vec3 p) {
    float d = sphereSDF(p);
    float glump = (sin(2.0 * p.x) * sin(5.0 * p.y) * sin(7.0 * p.z)) * 0.25;
    return d + glump;
}
