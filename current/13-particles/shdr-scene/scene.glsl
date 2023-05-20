
float sphere(vec3 p, vec3 c, float r) {
    return length(p-c) - r;
}

float cylinder(vec3 p, vec3 c, float r, float h) {
    vec3 d = p-c;
    return max(length(d.xz - c.xz) - r, abs(d.y) - h);
}

float box(vec3 p, vec3 b) {
    vec3 d = abs(p) - b;
    return min(max(d.x, max(d.y, d.z)), 0.0) + length(max(d, 0.0));
}

float plane(vec3 p, vec3 c, vec3 n) {
    return dot(p-c, n);
}

vec2 map(vec3 p) {

    vec2 res = vec2(1e10, 0.);
    float t = time * 0.3 + 500.;

    // Octahedron
    {
        vec3 q = p;

        float swing = 0.8 * sin(t * 0.003);
        q = q + vec3(-2., 0, swing);

        mat4 trans1 = rotateY(PI * 0.0001 * t);
        mat4 trans2 = rotateX(PI * 0.00017 * t);
        q = (trans1 * vec4(q, 1.)).xyz;
        q = (trans2 * vec4(q, 1.)).xyz;

        res = opU(res, vec2(sdOctahedron(q, 1.8) - 0.01, 2.));
    }
    // Torus
    {
        vec3 q = p;

        float swing = 0.8 * sin(t * 0.002 + 1.);
        q = q + vec3(2., 0, swing);

        mat4 trans1 = rotateY(PI * 0.0001 * t);
        mat4 trans2 = rotateX(PI * 0.00017 * t);
        q = (trans1 * vec4(q, 1.)).xyz;
        q = (trans2 * vec4(q, 1.)).xyz;

        res = opU(res, vec2(sdTorus(q, vec2(1., 0.3)), 3.));
    }

    return res;
}
