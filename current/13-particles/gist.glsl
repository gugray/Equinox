vec2 map(vec3 p) {

    // return vec2(0.);

    vec2 res = vec2(1e10, 0.);
    float t = time + 500.;

    p -= vec3(3., 0., 0);
    p = doRotX(p, -PI * 0.05);

    {
        // Intro / Box frame
        vec3 q = p;
        q -= vec3(2., 0., 0.);
        q = doRotY(q, PI * -t * 0.00006);
        q = doRotY(q, PI * 0.7);
        float d = sdBoxFrame(q, vec3(3., 4., 2.), 0.4);
        // res = opU(res, vec2(d, 50.));
    }
    {
        // Intro / Donut
        vec3 q = p;

        float swing = 0.;
        swing = 0.3 * sin(t * 0.002 + 1.);
        q -= vec3(-8., 0, swing);
        q = doRotY(q, PI * 0.00003 * t);
        q = doRotX(q, PI * 0.00004 * t);
        q = doRotX(q, PI * 0.45);

        float d = sdTorus(q, vec2(3., 0.9));
        // res = opU(res, vec2(d, 3.));
    }

    {
        // Base
        vec3 q = p;
        float radius = 5.;
        vec3 rodDim = vec3(3.0, 0.3, 0.3);
        q -= vec3(0.0, -4., 0.);
        q = doRotX(q, -PI * 0.5);

        q = doRotZ(q, t * 0.0001);
        float index = opCircRep(q.xy, 7.);
        q.x -= radius + 2.;
        q = doRotX(q, PI * .25);

        float d = sdBox(q, rodDim);
        res = opU(res, vec2(d, 2.));
    }
    {
        // Trunk
        vec3 q = p;
        float d = sdCappedCylinder(q, vec2(1., 6.));
        res = opU(res, vec2(d, 3.));
    }
    {
        // Inner ring
        vec3 q = p;
        q.y -= -4. + 8. * pow((sin(t * 0.0003) + 1.) / 2., 0.7);
        float d = sdTorus(q, vec2(2.2, 0.4));
        res = opU(res, vec2(d, 2.));
    }
    {
        // Outner ring
        vec3 q = p;
        q.y -= -3. + 6. * pow((cos(t * 0.00049) + 1.) / 2., 0.5);
        float d = sdTorus(q, vec2(5.2, 0.4));
        res = opU(res, vec2(d, 2.));
    }
    {
        // Sentinels
        vec3 q = p;
        float radius = 8.;
        radius += 1.5 * sin(t * 0.0009);
        q -= vec3(0.0, 2., 0.);
        q = doRotX(q, -PI * 0.5);

        q = doRotZ(q, -t * 0.00009);
        float index = opCircRep(q.xy, 11.);
        q.x -= radius + 2.;
        q = doRotY(q, t * 0.0002 + PI * index / 11.);

        float d = sdOctahedron(q, 1.5) - 0.01;
        res = opU(res, vec2(d, 2.));
    }

    return res;
}

vec4 updateParticle(vec4 prevState, sampler2D txScene, vec2 sceneRes, vec2 trgRes) {

    bool renderScene = false;
    bool onlyHint = true;
    float hintLum = 0.4;

    vec4 res = prevState;

    int delta = 2;
    vec2 resRatio = sceneRes / trgRes;
    ivec2 sc = ivec2(prevState.xy * resRatio);
    vec2 uv = prevState.xy / trgRes;
    vec2 ab = uv * vec2(trgRes.x / trgRes.y, 1.0);
    float t = time;
    // Noises
    vec2 nofsLo, nNova, nofsHi;
    {
        float nofsX = snoise(vec3(ab * 1., t * 0.0001));
        float nofsY = snoise(vec3(ab * 1., 100. + t * 0.0001));
        nofsLo = normalize(vec2(nofsX, nofsY));
    }
    {
        float freq = 7.;
        float nofsX = snoise(vec3(ab * freq, t * 0.0001));
        float nofsY = snoise(vec3(ab * freq, 100. + t * 0.0001));
        nofsHi = vec2(nofsX, nofsY);
    }
    {
        float freq = 7.;
        float nofsX = snoise(vec3(ab * freq, 10. + t * 0.0001));
        float nofsY = snoise(vec3(ab * freq, 110. + t * 0.0001));
        nNova = vec2(nofsX, nofsY);
    }
    // Sine and diag
    vec2 sinofs = normalize(vec2(1., 3. * sin(uv.x * PI * 10.)));
    vec2 diagofs = vec2(1.);

    // Background flow
    res.xy += sinofs;
    // res.xy += nofsHi * 1.;
    res.zw = vec2(0.);


    // Novas
    if (false)
    {
        // res.xy += nofsHi;
        res.zw = vec2(0.);
        float lim = 0.98;
        float len = length(nNova);
        // len = 0.;
        if (len > lim) {
            float lum = map(len, lim, 1.0, 0.0, 1.0);
            res.z = pow(lum, 0.5) *  0.5; // Lum
            res.w = 100.; // ID
            return res;
        }
    }

    // SDF scene
    if (renderScene)
    {

        ivec2 scAbove = ivec2(sc.x, min(int(trgRes.y - 1.), sc.y + delta));
        ivec2 scBelow = ivec2(sc.x, max(0, sc.y - delta));
        ivec2 scRight = ivec2(min(int(trgRes.x - 1.), sc.x + delta), sc.y);
        ivec2 scLeft = ivec2(max(0, sc.x - delta), sc.y);

        vec4 field = texelFetch(txScene, sc, 0);
        vec4 fieldAbove = texelFetch(txScene, scAbove, 0);
        vec4 fieldBelow = texelFetch(txScene, scBelow, 0);
        vec4 fieldRight = texelFetch(txScene, scRight, 0);
        vec4 fieldLeft = texelFetch(txScene, scLeft, 0);

        float lum = field.z;
        float id = field.w;

        float gradX = fieldRight.x - fieldLeft.x;
        float gradY = fieldAbove.x - fieldBelow.x;
        vec2 grad = vec2(gradX, gradY);

        // Got object gradiend and depth
        if (length(grad) > 0. && field.y != 0.) {
            if (onlyHint) {
                res.z = hintLum;
                res.w = 90.;
            }
            else {
                vec2 dir = normalize(grad);
                dir = vec2(-dir.y, dir.x);
                res.xy += 2. * dir * pow(lum, 0.5); // Brighter moves faster
                res.xy += nofsLo * 0.3;
                res.xy = mod(res.xy, trgRes);
                res.z = lum;
                res.w = id;
            }
        }
    }

    // Stay on screen
    res.xy = mod(res.xy, trgRes);

    float rndReset = random(length(prevState));
    if (rndReset < 0.05) {
        res.x = trgRes.x * random(prevState.y);
        res.y = trgRes.y * random(prevState.x);
        ivec2 sc = ivec2(res.xy * resRatio);
        vec4 field = texelFetch(txScene, sc, 0);
        if (!renderScene || field.y == 0.) res.zw = vec2(0.);
        else {
            if (onlyHint) {
                res.z = hintLum;
                res.w = 90.;
            }
            else {
                res.z = field.z; // Lum
                res.w = field.w; // ID
            }
        }
    }

    return res;
}

vec3 renderParticle(vec2 coord, vec2 resolution, vec2 props) {
    vec3 res;
    float lum = props.x;
    float id = props.y;
    // No object
    if (id == 0.) {
        res.rgb = hsl2rgb(0.7, 0.4, 0.4);
    }
    // Nova
    else if (id == 100.) {
        res.rgb = hsl2rgb(0.1, 0.4, lum);
    }
    // Intro objects
    else if (id == 50.) {
        res.rgb = hsl2rgb(0.05, pow(lum, 0.8), lum);
    }
    // Hint at object
    else if (id == 90.) {
        res.rgb = hsl2rgb(0.7, 0.4, lum);
    }
    // Space station objects
    else {
        if (id == 2.) res.rgb = hsl2rgb(0., pow(lum, 2.), lum);
        else if (id == 3.) res.rgb = hsl2rgb(0.3, pow(lum, 4.), lum);
    }
    return res;
}
