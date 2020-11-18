const jtsk2wgs84 = (x, y, h = 200) => {
    const coords = {
        jtsk_x: x,
        jtsk_y: y,
        wgs84_lat: "",
        wgs84_lon: "",
        // tslint:disable-next-line: object-literal-sort-keys
        lat: 0,
        lon: 0,
        altitude: 0,
    };

    let a = 6377397.15508;
    const e = 0.081696831215303;
    const n = 0.97992470462083;
    const uRo = 12310230.12797036;
    const sinUQ = 0.863499969506341;
    const cosUQ = 0.504348889819882;
    const sinVQ = 0.420215144586493;
    const cosVQ = 0.907424504992097;
    const alpha = 1.000597498371542;
    const k = 1.003419163966575;

    let ro = Math.sqrt(x * x + y * y);
    const epsilon = 2 * Math.atan(y / (ro + x));
    const D = epsilon / n;
    const S = 2 * Math.atan(Math.exp(1 / n * Math.log(uRo / ro))) - Math.PI / 2;
    const sinS = Math.sin(S);
    const cosS = Math.cos(S);
    const sinU = sinUQ * sinS - cosUQ * cosS * Math.cos(D);
    const cosU = Math.sqrt(1 - sinU * sinU);
    const sinDV = Math.sin(D) * cosS / cosU;
    const cosDV = Math.sqrt(1 - sinDV * sinDV);
    const sinV = sinVQ * cosDV - cosVQ * sinDV;
    const cosV = cosVQ * cosDV + sinVQ * sinDV;
    const lJtsk = 2 * Math.atan(sinV / (1 + cosV)) / alpha;
    let t = Math.exp(2 / alpha * Math.log((1 + sinU) / cosU / k));
    let pom = (t - 1) / (t + 1);

    let sinB = pom;

    do {
        sinB = pom;
        pom = t * Math.exp(e * Math.log((1 + e * sinB) / (1 - e * sinB)));
        pom = (pom - 1) / (pom + 1);
    } while (Math.abs(pom - sinB) > 1e-15);

    const bJtsk = Math.atan(pom / Math.sqrt(1 - pom * pom));

    let f1 = 299.152812853;
    let e2 = 1 - (1 - 1 / f1) * (1 - 1 / f1);
    ro = a / Math.sqrt(1 - e2 * Math.sin(bJtsk) * Math.sin(bJtsk));
    x = (ro + h) * Math.cos(bJtsk) * Math.cos(lJtsk);
    y = (ro + h) * Math.cos(bJtsk) * Math.sin(lJtsk);
    const z = ((1 - e2) * ro + h) * Math.sin(bJtsk);

    const dx = 570.69;
    const dy = 85.69;
    const dz = 462.84;
    const wz = -5.2611 / 3600 * Math.PI / 18;
    const wy = -1.58676 / 3600 * Math.PI / 180;
    const wx = -4.99821 / 3600 * Math.PI / 180;
    const m = 3.543e-6;
    const xn = dx + (1 + m) * (x + wz * y - wy * z);
    const yn = dy + (1 + m) * (-wz * x + y + wx * z);
    const zn = dz + (1 + m) * (wy * x - wx * y + z);

    a = 6378137.0;
    f1 = 298.257223563;
    const aB = f1 / (f1 - 1);
    const p = Math.sqrt(xn * xn + yn * yn);
    e2 = 1 - (1 - 1 / f1) * (1 - 1 / f1);
    const theta = Math.atan(zn * aB / p);
    const st = Math.sin(theta);
    const ct = Math.cos(theta);
    t = (zn + e2 * aB * a * st * st * st) / (p - e2 * a * ct * ct * ct);
    let B = Math.atan(t);
    let L = 2 * Math.atan(yn / (p + xn));
    h = Math.sqrt(1 + t * t) * (p - a / Math.sqrt(1 + (1 - e2) * t * t));

    B = B / Math.PI * 180;

    coords.lat = B;

    let latitude = "N";
    if (B < 0) {
        B = -B;
        latitude = "S";
    }

    const latDeg = Math.floor(B);
    B = (B - latDeg) * 60;
    const latMin = Math.floor(B);
    B = (B - latMin) * 60;
    const latSec = Math.round(B * 1000) / 1000;
    latitude = latDeg + "°" + latMin + "'" + latSec + latitude;
    coords.wgs84_lat = latitude;

    L = L / Math.PI * 180;
    coords.lon = L;
    let longitude = "E";
    if (L < 0) {
        L = -L;
        longitude = "W";
    }

    const lonDeg = Math.floor(L);
    L = (L - lonDeg) * 60;
    const lonMin = Math.floor(L);
    L = (L - lonMin) * 60;
    const lonSec = Math.round(L * 1000) / 1000;
    longitude = lonDeg + "°" + lonMin + "'" + lonSec + longitude;
    coords.wgs84_lon = longitude;

    coords.altitude = Math.round((h) * 100) / 100;

    return coords;
};

export {
    jtsk2wgs84,
};
