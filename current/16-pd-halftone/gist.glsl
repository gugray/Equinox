void view() {
    eyeFOV = 55.0 * PI / 180.0;
    eyeAzimuth = 0.001 * PI / 180.0;
    eyeAltitude = 0.0 * PI / 180.0;
    eyeDistance = 32.0;

    bgLum = 0.0;
    float azi = random(floor(time * 0.003)) * 170.0 - 85.0;
    float hei = random(floor(time * 0.003) + 0.3) * 170.0 - 85.0;
    azi = mod(time * 0.1, 360.0) - 180.0;
    azi = -60.0;
    hei = 40.;

    light1Vec = angleToVec(azi, hei);
    light1Strength = 0.3;

    light2Vec = angleToVec(-70.0, 0.0);
    light2Strength = 0.1;
    ambientLightStrength = 0.1;

}

float sdSpiral(vec3 p, float r, float e, float th) {
    float phi = atan(p.z, p.x);
    float t = floor(p.y * e / 2.0 / PI) * 2.0 * PI + phi;
    t += float(abs(phi) < PI && (t + PI) / e < p.y) * 2.0 * PI;
    return length(p - vec3(r * cos(t), t / e, r * sin(t))) - th;
}

vec2 fleet(vec3 q, vec2 res, float sz, float rad, float n, float t, bool colors) {
    q.x *= 0.5;
    float d = sdOctahedron(q, sz);
    res = opU(res, vec2(d, 5.0));
    q = doRotX(q, t);
    float ix = opCircRep(q.zy, n);
    q.z -= rad;
    d = sdOctahedron(q, sz * 0.5);
    float id = 5.0;
    if (colors) id += (ix + n * 0.5) / n;
    return opU(res, vec2(d, id));
}

vec2 orbiter(vec3 p, vec2 res, float a, float sz, float rad, float n, vec3 tt, bool colors) {
    vec3 q = p;
    float cos1 = cos(tt.x);
    float sin1 = sin(tt.x);
    vec2 curve = vec2(a*cos1/(1.0+pow(sin1,2.0)), a*sin1*cos1/(1.0+pow(sin1,2.0)));
    q.xz += curve;
    q = doRotY(q, -3.0*atan(sin1) + PI *0.5);
    q.y += 50.0 * sin(tt.y);
    q = doRotZ(q, -cos(tt.y) * 0.2);
    return fleet(q, res, sz, rad, n, tt.z, colors);
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


    // Rotating moony loonies
    float rad = 1.;
    if (c_m1 != 0.0)
    {
        rad += c_m1;
        float t = t + c_suma * 1000.0;
        vec3 q = p;
        // q -= vec3(11., 0., 0.);
        vec2 id = opMod2(q.xy, vec2(rad * 5.0, rad * 3.3));
        q = doRotY(q, PI * 0.4 * (sin(time * 0.001)));
        float ax = random(floor(t * 0.005)) * 7.0 * PI;
        ax = t * 0.001;
        q = doRotX(q, ax);
        float d = sdCutHollowSphere(q, rad, 0.1, 0.3);
        d *= 0.85; // This SDF needs a bit of help
        res = opU(res, vec2(d, 20.0));
        // // Loony separator walls
        // {
        //     vec3 q = p;
        //     q -= vec3(rad * 2.5, 0.0, -4.0);
        //     vec2 id =opMod2(q.xy, vec2(rad * 5.0, rad * 3.3));
        //     // q = doRotX(q, t * 0.001);
        //     float d = sdBox(q, vec3(0.2, rad * 1.3, rad * 1.3));
        //     res = opU(res, vec2(d, 20.0));
        // }
    }

    // Cubes composite
    if (c_m2 != 0.0)
    {
        vec3 q = p;
        float sz = 2.0;
        float d;
        q -= vec3(0.0, 0., 0.);
        q = doRotY(q, (t + c_suma * 1000.0) * 0.0003);
        q = doRotX(q, t * 0.0001);
        q = doRotY(q, t * 0.0002);
        q = doRotZ(q, t * 0.0002);
        float t1 = t * 0.001;
        d = sdBox(q, sz * vec3(sin(t1) + 2.0, sin(t1 + PI * 0.3) + 2.0, sin(t1 + PI * 0.9) + 2.0));
        res = opU(res, vec2(d, 3.1));
        q = doRotX(q, 1.0);
        q = doRotY(q, 2.0);
        q = doRotZ(q, 3.0);
        float t2 = t * 0.0013 + PI * 0.2;
        d = sdBox(q, sz * vec3(sin(t2) + 2.0, sin(t2 + PI * 0.3) + 2.0, sin(t2 + PI * 0.9) + 2.0));
        res = opU(res, vec2(d, 3.4));
        q = doRotX(q, 3.0);
        q = doRotY(q, 1.0);
        q = doRotZ(q, 2.0);
        float t3 = t * 0.0019 + PI * 0.4;
        d = sdBox(q, sz * vec3(sin(t3) + 2.0, sin(t3 + PI * 0.3) + 2.0, sin(t3 + PI * 0.9) + 2.0));
        res = opU(res, vec2(d, 3.7));
    }

    // Transmuter
    if (c_m3 != 0.0)
    {
        float tt = t + c_sumb * 1000.0;
        vec3 q = p;
        float sz =8.0 + 5.0 * pow((sin(tt * 0.001) + 1.0), 0.5);
        q = doRotY(q, t * 0.001);
        q = doRotX(q, PI * 0.5);
        float d1 = sdTorus(q, vec2(sz, sz*0.15));
        d1 = min(d1, sdTorus(doRotX(q, PI * 0.5), vec2(sz, sz*0.15)));
        d1 = min(d1, sdTorus(doRotZ(q, PI * 0.5), vec2(sz, sz*0.15)));
        float d2 = sdBoxFrame(q, vec3(sz), sz*0.12);
        float v = (sin(tt * 0.001) + 1.0) * 0.5;
        if (c_m3 == 1.0) v = 0.0;
        else if (c_m3 == 2.0) v = 1.0;
        // v = 0.5 + 0.1 * sin(t * 0.003);
        float d = (d1*v+d2*(1.0-v));
        res = opU(res, vec2(d, 7.0));
    }

    // Infinite conveyor belt
    if (c_m4 != 0.0)
    {
        vec3 q = p;
        float ay = t * 0.0001;
        float sy = sin(t * 0.005) + 1.0;
        // q = doRotY(q, ay);
        // q = doRotY(q, c_index);
        // q = doRotX(q, t * 0.0001);
        q -= vec3(15., 5., -t * 0.01);
        opMod2(q.yz, vec2(10., 12.));
        float d = sdBox(q, vec3(5., 0.2, 4.));
        res = opU(res, vec2(d, 10.0));
    }

    float wsep = 15.0;
    // Wavy thingies
    if (c_m5 != 0.0)
    {
        float tt = t + c_suma * 1000.0;
        vec3 q = p;
        q.x += wsep * 0.3;
        q.z += wsep * 0.7;
        q.y += 5.0;
        q = doRotZ(q, sin(tt * 0.00061) * 0.2);
        q = doRotX(q, sin(tt * 0.00049) * 0.2);
        q = doRotX(q, PI * 0.05);
        vec2 id;
        if (c_m5 == 1.0) id = opModInterval2(q.xz, vec2(wsep), vec2(-1.0, 0.0), vec2(1.0, 0.0));
        else if (c_m5 == 2.0) id = opModInterval2(q.xz, vec2(wsep), vec2(-3.0, -2.0), vec2(3.0, 0.0));
        else id = opMod2(q.xz, vec2(wsep));
        vec2 ctr = id * wsep;
        q.y += sin(ctr.x * 0.05 + ctr.y * 0.02 + tt * 0.001) * 3.0;
        float ynz = snoise(vec3(ctr.xy * 0.1, tt * 0.0003));
        q.y += ynz * 3.0;
        q.x += (random(ctr.x) - 0.5) * wsep * 0.2;
        q.z += (random(ctr.y) - 0.5) * wsep * 0.1;
        // Till here
        float d = sdSphere(q, 2.5);
        d *= 0.75;
        res = opU(res, vec2(d, 1.0));
    }


    // Spiral experiment
    if (c_m6 != 0.0)
    {
        float tt = t + c_suma * 1000.0;
        vec3 q = p;
        q.z += wsep * 2.5;
        q.x += wsep * 0.3;
        q.z += wsep * 0.7;
        q = doRotZ(q, sin(tt * 0.00061) * 0.2);
        q = doRotX(q, sin(tt * 0.00049) * 0.2);
        q = doRotX(q, PI * 0.05);
        // q = doRotZ(q, PI * 0.5);
        q = doRotY(q, t * 0.003);
        float dia = 40.0 * exp(-pow(abs(q.y * 0.4), 1.0) * 0.1);
        float e = sdSpiral(q, dia, 0.3, 1.0);
        e *= 0.5;
        res = opU(res, vec2(e, 2.0));
    }

    // Starships
    if (c_m7 != 0.0)
    {
        // Anchored
        {
            vec3 q = p;
            // q.y -= 5.0 * sin(t * 0.001);
            q -= vec3(0.0, 0.0, -60.0);
            // q = doRotY(q, t * 0.0001);
            res = fleet(q, res, 9.0, 27.0, 15.0, 0.0, true);
        }
        // // Traveler
        // {
        //     vec3 q = p;
        //     q.z += 200.0;
        //     // q = doRotZ(q, PI * 0.25);
        //     q = doRotY(q, PI * 0.25 + t * 0.001);
        //     // q = doRotY(q, PI * 0.25 + t * c_valc * 0.1);
        //     res = orbiter(q, res, 180.0, 19.0, 37.0, 11.0, vec3(t * 0.0013, 0.0, t * 0.0024), false);
        //     // res = orbiter(q, res, 180.0, 19.0, 37.0, 11.0, vec3(t * 0.1 * c_valb, 0.0, t * 0.0), true);
        // }
    }

    return res;
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
        // if (iid == 0.0) return vec4(0.0, 0.0, 0.2, 1.0);
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


    // vec4 clrScene = texture(txScene, uv);
    vec4 clrScene = texelFetch(txScene, ivec2(trgCoord / dotRad / 2.0), 0);
    float liScene = clrScene[2];
    float dstScene = clrScene[1];
    float idScene = clrScene[3];

    uv.y = 1.0 - uv.y;
    vec4 clrImg = texture(txImg1, uv);
    float liImg = (clrImg.r + clrImg.g + clrImg.b) / 3.0;

    float hue, sat, li;

    if (idScene > 0.0) {
        li = pow(liScene, 1.0);
        // Infinite conveyor belt
        if (idScene == 10.0) {
            hue = 29./360.;
            sat = 0.1;
        }
        // Water thingies
        else if (idScene >= 1.0 && idScene < 2.0) {
            hue = 237. / 360.;
            sat = 0.6;
        }
        // Spiral
        else if (idScene == 2.0) {
            hue = 0.0;
            sat = 0.6;
        }
        // Orbital fleet
        else if (idScene >= 5.0 && idScene < 6.0) {
            hue = idScene - 5.0;
            sat = 0.6;
        }
        // Transmuter
        else if (idScene == 7.0) {
            hue = 11.0 / 360.0;
            sat = 0.4;
        }
        // Cube composite
        else if (idScene >= 3.0 && idScene < 4.0) {
            hue = fract(idScene);
            sat = 0.1;
        }
        // Default sepia
        else {
            hue = 29. / 360.;
            sat = 0.1;
        }
    }
    else {
        if (c_s1 != 0.0) {
            if (c_s1 == 4.0)
            li = pow(liImg, 0.5) + 0.1;
            else if (c_s1 < 4.0)
            li = pow(liImg, 1.4) + 0.1;
            else
            li = pow(liImg, 1.5) + 0.1;
        }
        else li = 0.0;
        hue = 29./360.;
        sat = 0.1;
    }

    vec3 clr = hsb2rgb(hue, sat, 1.0);

    if (pow(length(cellXY / rad) - 0.05, 0.8) < li)
    return vec4(clr.rgb, 1.);

    return vec4(vec3(0.1), 1.);

}
