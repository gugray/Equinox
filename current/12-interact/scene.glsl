
float sceneSDF(vec3 p) {

    mat3 t1 = rotateX(PI * 0.15);
    mat3 t2 = rotateY(PI * 0.25);
    mat3 t3 = rotateZ(PI * 0.08);

//    float d = sdTorus(t2 * t1 * p, vec2(1, 0.5));
//    float d = sdTorus(t1 * p, vec2(1, 0.5));
//    return d;

    float d = sdBox(t1 * p + vec3(0., 3., 10.), vec3(20.5, 20.5, 0.6));
    d = min(d, sdBoxFrame(t3 * t2 * t1 * p, vec3(0.7, 1.0, 1.3), 0.2));
    return d;

//    float d = sphereSDF(p);
//    float glump = (sin(2.0 * p.x) * sin(5.0 * p.y) * sin(7.0 * p.z)) * 0.25;
//    return d + glump;
}
