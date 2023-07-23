void view() {
    eyeFOV = 55.0 * PI / 180.0;
    eyeAzimuth = 0.001 * PI / 180.0;
    eyeAltitude = 0.0 * PI / 180.0;
    eyeDistance = 32.0;

    bgLum = 0.0;
    float azi = random(floor(time * 0.003)) * 170.0 - 85.0;
    float hei = random(floor(time * 0.003) + 0.3) * 170.0 - 85.0;
    azi = mod(time * 0.1, 360.0) - 180.0;
    // hei = ((time * 0.00003) + 0.3) * 170.0 - 85.0;
    azi = 60.0;
    //hei = 30. * sin(time * 0.0003);
    hei = 0.;

    light1Vec = angleToVec(azi, hei);
    light1Strength = 0.3;

    light2Vec = angleToVec(30.0, -50.0);
    light2Strength = 0.1;
    ambientLightStrength = 0.1;

}

float sdSpiral(vec3 p, float r, float e, float th) {
    float phi = atan(p.z, p.x);
    float t = floor(p.y * e / 2.0 / PI) * 2.0 * PI + phi;
    t += float(abs(phi) < PI && (t + PI) / e < p.y) * 2.0 * PI;
    return length(p - vec3(r * cos(t), t / e, r * sin(t))) - th;
}

vec2 map(vec3 p) {

    // opMod1(q.y, 4.0);
    // opCircRep(q.xz, 2.);
    // float d = sdBox(q, vec3(8., 0.2, 12.));
    // res = opU(res, vec2(d, 1.));
    // vec2 ix = opModInterval2(q.xz, vec2(sz * 2.0 + 0.5), vec2(-2.0), vec2(2.0));
    // float clr = (snoise(vec3(ix.xy, mod(t * 0.0005, 20.0))) + 1.0) * 0.5;

    vec2 res = vec2(1e13, 0.);
    float t = time + 500.;

    // {
    //     vec3 q = p;
    //     q -= vec3(5.25, 0., 0.);
    //     q -= vec3(-c_ratio, c_ratio, 0.);
    //     q = doRotX(q, t * 0.0001 + c_ratio * 1.);
    //     float dia = c_ratio;
    //     dia = 9.;
    //     float d = sdTorus(q, vec2(dia, 1.5 + c_ratio * 0.5));
    //     res = opU(res, vec2(d, 1.0));
    // }

    // float rad = 2.;
    // {
    //     vec3 q = p;
    //     // q -= vec3(11., 0., 0.);
    //     vec2 id = opMod2(q.xy, vec2(rad * 5.0, rad * 3.3));
    //     q = doRotY(q, PI * 0.4 * (sin(time * 0.001)));
    //     float ax = random(floor(t * 0.005)) * 7.0 * PI;
    //     ax = t * 0.001;
    //     q = doRotX(q, ax);
    //     float d = sdCutHollowSphere(q, rad, 0.1, 0.3);
    //     res = opU(res, vec2(d, 10.0 + id.x * 0.7 + id.y * 0.2));
    // }
    // {
    //     vec3 q = p;
    //     q -= vec3(rad * 2.5, 0.0, -4.0);
    //     vec2 id =opMod2(q.xy, vec2(rad * 5.0, rad * 3.3));
    //     // q = doRotX(q, t * 0.001);
    //     float d = sdBox(q, vec3(0.2, rad * 1.3, rad * 1.3));
    //     res = opU(res, vec2(d, id.x * 0.9 + id.y * 0.7));
    // }

    {
        vec3 q = p;
        float ay = t * 0.0001;
        float sy = sin(t * 0.005) + 1.0;
        // q = doRotY(q, ay);
        // q = doRotY(q, c_index);
        // q = doRotX(q, t * 0.0001);
        q -= vec3(15., 5., -t * 0.01);
        // if (sy < 0.1) q.x += 15.0;

        opMod2(q.yz, vec2(10., 12.));
        float d = sdBox(q, vec3(5., 0.2, 4.));
        // res = opU(res, vec2(d, 1.0));
    }
    {
        vec3 q = p;
        q -= vec3(-9.0, 0., 0.);
        q = doRotX(q, t * 0.0001);
        q = doRotY(q, t * 0.0002);
        q = doRotZ(q, t * 0.0002);
        float d = sdBox(q, vec3(5.0));
        q = doRotX(q, 1.0);
        q = doRotY(q, 2.0);
        q = doRotZ(q, 3.0);
        d = min(d, sdBox(q, vec3(5.0)));
        q = doRotX(q, 3.0);
        q = doRotY(q, 1.0);
        q = doRotZ(q, 2.0);
        d = min(d, sdBox(q, vec3(5.0)));
        res = opU(res, vec2(d, 1.0));
    }

    {
        vec3 q = p;
        q -= vec3(11.0, 0.0, 0.0);
        q = doRotZ(q, t * 0.001);
        q = doRotX(q, t * 0.001);
        // float d = length(q.yz - vec2(1.5*sin(q.x), 0.)) - 1.0;
        // q = doRotY(q, t * 0.001);
        float dia = 10.0 * exp(-pow(abs(q.y * 0.4), 1.0) * 0.1);
        float d = sdSpiral(q, dia, 0.5, 1.0);
        d *= 0.5;
        // res = opU(res, vec2(d, 1.0));
    }

    return res;
}

vec2 getSurfaceGradient(sampler2D txScene, vec2 trgRes, ivec2 sc) {

    int delta = 2;

    ivec2 scAbove = ivec2(sc.x, min(int(trgRes.y - 1.), sc.y + delta));
    ivec2 scBelow = ivec2(sc.x, max(0, sc.y - delta));
    ivec2 scRight = ivec2(min(int(trgRes.x - 1.), sc.x + delta), sc.y);
    ivec2 scLeft = ivec2(max(0, sc.x - delta), sc.y);

    vec4 fieldAbove = texelFetch(txScene, scAbove, 0);
    vec4 fieldBelow = texelFetch(txScene, scBelow, 0);
    vec4 fieldRight = texelFetch(txScene, scRight, 0);
    vec4 fieldLeft = texelFetch(txScene, scLeft, 0);

    float gradX = fieldRight.x - fieldLeft.x;
    float gradY = fieldAbove.x - fieldBelow.x;
    return vec2(gradX, gradY);
}

vec4 renderScene(vec2 trgCoord, vec2 trgRes, sampler2D txScene, vec2 sceneRes) {

    float rad = dotRad;
    float dia = rad * 2.0;
    vec2 cellXY = mod(trgCoord, dia) - vec2(rad);
    vec2 cellCenter = floor(trgCoord / dia) * dia + vec2(rad);
    vec2 uv = cellCenter / trgRes;

    // Raw render
    if (false) {
        vec4 ccc = texture(txScene, trgCoord / trgRes);
        float iid = ccc[3];
        //if (iid == 0.0) return vec4(0.0, 0.0, 0.2, 1.0);
        float lll = ccc[0];
        return vec4(vec3(lll), 1.0);
    }

    //     vec4 noiseGrad;
    //     float scale = 5.0;
    //     float nzAngle = time * 0.00003;
    //     vec2 nzCirc = 10.0 * vec2(sin(nzAngle), cos(nzAngle));
    //     float nz = snoise(vec4(uv * scale, nzCirc), noiseGrad);
    //     nz = (nz + 1.0) * 0.5;
    //     float nzCut = (c_valb * 0.1);
    //     nz -= nzCut;
    //     nz = max(0., nz);
    //     nz *= 1.0 / nzCut;
    //     if (nz > 0.) nz += 0.1;

    // 	vec3 nzClr = hsl2rgb(0.1, 0.7, 0.5);
    //     if (length(cellXY) < rad * nz)
    //     	return vec4(nzClr.rgb, 1.);
    //     if (nz > 0.)
    //     	return vec4(0.1, 0.1, 0.1, 1.);


    vec4 clrScene = texture(txScene, uv);
    float liScene = clrScene[2];
    float dstScene = clrScene[1];
    float idScene = clrScene[3];

    uv.y = 1.0 - uv.y;
    vec4 clrImg = texture(txImg1, uv);
    float liImg = (clrImg.r + clrImg.g + clrImg.b) / 3.0;

    float hue, sat, li;

    if (idScene > 0.) {
        li = pow(liScene, 2.0);
        hue = 233. / 360.;
        sat = 0.6;
    }
    else {
        li = pow(liImg, 0.7) + 0.05;
        hue = 0.;
        sat = 0.;
    }

    vec3 clr = hsb2rgb(hue, sat, 1.0);

    if (pow(length(cellXY / rad), 0.5) < li)
    return vec4(clr.rgb, 1.);

    return vec4(vec3(0.1), 1.);

}
