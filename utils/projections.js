export function cavalier([x, y, z], angle = 45, lambda = 1) {
        const rad = angle * Math.PI / 180;

        const x2d = x + lambda * z * Math.cos(rad);
        const y2d = y + lambda * z * Math.sin(rad);

        return [x2d, y2d];
}

export function cabinet([x, y, z], angle = 45) {
        return cavalier([x, y, z], angle, 0.5);
}   

export function isometric([x, y, z]) {
        const ry = 45 * Math.PI / 180;
        const rx = Math.atan(1 / Math.sqrt(2));

        // rotação em Y
        let x1 = x * Math.cos(ry) + z * Math.sin(ry);
        let z1 = -x * Math.sin(ry) + z * Math.cos(ry);

        // rotação em X
        let y2 = y * Math.cos(rx) - z1 * Math.sin(rx);

        return [x1, y2];
}   

export function perspectiveZ([x, y, z], d = 5) {
        const factor = d / (d + z);
        return [x * factor, y * factor];
}

export function perspectiveXZ([x, y, z], dx = 5, dz = 5) {
        const factorX = dx / (dx + x);
        const factorZ = dz / (dz + z);
        return [x * factorZ, y * factorX * factorZ];
}
