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

vec3 renderParticle(vec2 props) {
    vec3 res;
    // No object
    if (props.y == 0.) {
        res.rgb = hsl2rgb(vec3(0.7, 0.4, 0.4));
    }
    else {
        float id = props.y;
        float light = props.x;
        if (id == 2.) res.rgb = hsl2rgb(vec3(0., pow(props.x, 2.), props.x));
        else if (id == 3.) res.rgb = hsl2rgb(vec3(0.3, pow(props.x, 4.), props.x));
    }
    return res;
}
