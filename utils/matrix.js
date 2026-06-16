function toRad(degrees) {
    return degrees * Math.PI / 180;
}

export function multiply(a, b) {
    return [
        a[0] * b[0] + a[1] * b[4] + a[2] * b[8],
        a[0] * b[1] + a[1] * b[5] + a[2] * b[9],
        a[0] * b[2] + a[1] * b[6] + a[2] * b[10],
        a[0] * b[3] + a[1] * b[7] + a[2] * b[11] + a[3],

        a[4] * b[0] + a[5] * b[4] + a[6] * b[8],
        a[4] * b[1] + a[5] * b[5] + a[6] * b[9],
        a[4] * b[2] + a[5] * b[6] + a[6] * b[10],
        a[4] * b[3] + a[5] * b[7] + a[6] * b[11] + a[7],

        a[8] * b[0] + a[9] * b[4] + a[10] * b[8],
        a[8] * b[1] + a[9] * b[5] + a[10] * b[9],
        a[8] * b[2] + a[9] * b[6] + a[10] * b[10],
        a[8] * b[3] + a[9] * b[7] + a[10] * b[11] + a[11]
    ];
}

export function translation([x, y, z]) {
    return [
        1, 0, 0, x,
        0, 1, 0, y,
        0, 0, 1, z
    ];
}

export function scale([x, y, z]) {
    return [
        x, 0, 0, 0,
        0, y, 0, 0,
        0, 0, z, 0
    ];
}

export function rotationX(degrees) {
    const angle = toRad(degrees);
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    return [
        1, 0, 0, 0,
        0, c, -s, 0,
        0, s, c, 0
    ];
}

export function rotationY(degrees) {
    const angle = toRad(degrees);
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    return [
        c, 0, s, 0,
        0, 1, 0, 0,
        -s, 0, c, 0
    ];
}

export function rotationZ(degrees) {
    const angle = toRad(degrees);
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    return [
        c, -s, 0, 0,
        s, c, 0, 0,
        0, 0, 1, 0
    ];
}
