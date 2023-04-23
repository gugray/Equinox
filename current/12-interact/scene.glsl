float scene10(vec3 p) {
    float d = 1e10;
    {
        // Rotated octahedron
        mat4 trans = rotateY(PI * 0.1);
        vec3 q = (trans * vec4(p, 1.)).xyz;
        q -= vec3(-0.7, 0., -2.);
        d = min(d, sdOctahedron(q, 1.8) - 0.01);
    }
    {
        mat4 trans = rotateX(PI * 0.2);
        vec3 q = (trans * vec4(p, 1.)).xyz;
        q -= vec3(0.5, 0.8, 1.0);
        float e = onion(sdCappedCylinder(q, vec2(0.8, 0.4)), 0.13);
        e = max(e, q.y);
        d = min(d, e);
    }
    return d;
}


float map(vec3 p) {

    return scene10(p);

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
