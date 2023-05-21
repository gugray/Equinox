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

vec4 updateParticle(vec4 prevState, sampler2D txScene, vec2 sceneRes, vec2 trgRes) {

    vec4 res = prevState;

    int delta = 2;
    vec2 resRatio = sceneRes / trgRes;
    ivec2 sc = ivec2(prevState.xy * resRatio);

    ivec2 scAbove = ivec2(sc.x, min(int(trgRes.y - 1.), sc.y + delta));
    ivec2 scBelow = ivec2(sc.x, max(0, sc.y - delta));
    ivec2 scRight = ivec2(min(int(trgRes.x - 1.), sc.x + delta), sc.y);
    ivec2 scLeft = ivec2(max(0, sc.x - delta), sc.y);

    vec4 field = texelFetch(txScene, sc, 0);
    vec4 fieldAbove = texelFetch(txScene, scAbove, 0);
    vec4 fieldBelow = texelFetch(txScene, scBelow, 0);
    vec4 fieldRight = texelFetch(txScene, scRight, 0);
    vec4 fieldLeft = texelFetch(txScene, scLeft, 0);

    float gradX = fieldRight.x - fieldLeft.x;
    float gradY = fieldAbove.x - fieldBelow.x;
    vec2 grad = vec2(gradX, gradY);

    vec2 p = prevState.xy / trgRes;
    vec2 uv = p * vec2(trgRes.x / trgRes.y, 1.0) * 5.;
    float nofsX = snoise(vec3(uv, time * 0.0001));
    float nofsY = snoise(vec3(uv, 100. + time * 0.0001));

    if (length(grad) > 0. && field.y != 0.) {
        vec2 dir = normalize(grad);
        dir = vec2(-dir.y, dir.x);
        res.xy += 2. * dir * pow(field.z, 0.5);
        res.xy += vec2(nofsX, nofsY) * 0.8;
        res.xy = mod(res.xy, trgRes);
        res.zw = field.zw; // Light; ID
    }
    else {
        //res = flow(prevState);
        res.xy += vec2(nofsX, nofsY) * 2.;
        res.xy = mod(res.xy, trgRes);
        res.zw = vec2(0.);
    }

    float rndReset = random(length(prevState));
    if (rndReset < 0.05) {
        res.x = trgRes.x * random(prevState.y);
        res.y = trgRes.y * random(prevState.x);
        ivec2 sc = ivec2(res.xy * resRatio);
        vec4 field = texelFetch(txScene, sc, 0);
        if (field.y == 0.) res.zw = vec2(0.);
        else res.zw = field.zw;
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
