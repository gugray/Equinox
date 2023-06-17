/**
 * Return the shortest distance from the eyepoint to the scene surface along
 * the marching direction. If no part of the surface is found between start and end,
 * return end.
 *
 * ro: the eye point, acting as the origin of the ray
 * rd: the normalized direction to march in
 */
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
