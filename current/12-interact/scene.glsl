
float sceneSDF(vec3 p) {

    mat4 rotX = rotateX(PI * 0.25);
    mat4 rotY = rotateY(PI * time * 0.00005);
    mat4 rotZ = rotateZ(PI * 0.25);

//    float box = sdBox(t1 * t2 * (p - vec3(0.8, 0., 0.7)), vec3(0.8, 0.5, 0.5));
//    float torus = sdTorus(t3 * t1 * (p - vec3(-0.8, 0., 0.)), vec2(1, 0.5));
//    return min(box, torus);

    mat4 trans = rotX * rotY;
    vec3 ptTrans = (trans*vec4(p, 1.)).xyz;
    float d = sdTorus(ptTrans, vec2(1, 0.5));
    return d;

//    float d = sdTorus(t1 * p, vec2(1, 0.5));
//    return d;

//    float d = sdBox(t1 * p + vec3(0., 3., 10.), vec3(20.5, 20.5, 0.6));
//    d = min(d, sdBoxFrame(t3 * t2 * t1 * p, vec3(0.7, 1.0, 1.3), 0.2));
//    return d;

//    float d = sdBoxFrame(t3 * t2 * t1 * p, vec3(0.7, 1.0, 1.3), 0.2);
//    return d;

//    float d = sphereSDF(p);
//    float glump = (sin(2.0 * p.x) * sin(5.0 * p.y) * sin(7.0 * p.z)) * 0.25;
//    return d + glump;
}
