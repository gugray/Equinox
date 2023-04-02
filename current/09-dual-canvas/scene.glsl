
float sceneSDF(vec3 p) {

    mat3 t1 = rotateX(PI * 0.5);

    return sdTorus(t1 * p, vec2(1, 0.5));

    //float d = sphereSDF(p);
    //float glump = (sin(2.0 * p.x) * sin(5.0 * p.y) * sin(7.0 * p.z)) * 0.25;
    //return d + glump;
}
