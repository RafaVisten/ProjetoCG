import { drawline } from './drawing.js';
import * as Projections from './projections.js'

// modulo para definição e manipulação de objetos 3d

function toScreen([x, y], width, height, zoom = 100) {
    return [
        Math.round(width/2 + x * zoom),
        Math.round(height/2 - y * zoom)
    ];
}

function applyRotation([x, y, z], [rx, ry, rz]) {
    const toRad = deg => deg * Math.PI / 180;
 
    // X
    const ax = toRad(rx);
    let y1 = y * Math.cos(ax) - z * Math.sin(ax);
    let z1 = y * Math.sin(ax) + z * Math.cos(ax);
 
    // Y
    const ay = toRad(ry);
    let x2 = x  * Math.cos(ay) + z1 * Math.sin(ay);
    let z2 = -x * Math.sin(ay) + z1 * Math.cos(ay);
 
    // Z
    const az = toRad(rz);
    let x3 = x2 * Math.cos(az) - y1 * Math.sin(az);
    let y3 = x2 * Math.sin(az) + y1 * Math.cos(az);
 
    return [x3, y3, z2];
}
 
function applyTransform(point, translate, rotate, scale) {
    let [x, y, z] = point;
 
    // aplica escala
    x *= scale[0];
    y *= scale[1];
    z *= scale[2];
 
    // aplica rotação
    [x, y, z] = applyRotation([x, y, z], rotate);
 
    // aplica translação
    x += translate[0];
    y += translate[1];
    z += translate[2];
 
    return [x, y, z];
}

const AXIS = { x: 0, y: 1, z: 2 };

export class Wireframe {

    constructor(data) {
        
        const params = data.trim().split('\n');

        this.n_points = parseInt(params[0]);
        this.n_lines = parseInt(params[1]);

        let index = 2;

        this.points = [];
        for (let i = 0; i < this.n_points; i++) {
            this.points.push(
                params[index++].split(" ").map(Number)
            );
        }

        this.lines = [];
        for (let i = 0; i < this.n_lines; i++) {
            this.lines.push(
                params[index++].split(" ").map(Number)
            );
        }

        this.translate = params[index] ? params[index++].split(" ").map(Number) : [0,0,0];
        this.rotate    = params[index] ? params[index++].split(" ").map(Number) : [0,0,0];
        this.scale     = params[index] ? params[index++].split(" ").map(Number) : [1,1,1];
    }

    static async fromFile(path) {
        const res = await fetch(path);
        const data = await res.text();
        return new Wireframe(data);
    }

    draw(width, height, zoom = 100, projection = 'cavalier', angle = 45, lambda = 1) {

        // escolhe a projeção
        const projections = {
            cavalier: (point) => Projections.cavalier(point, angle, lambda),
            cabinet:  (point) => Projections.cabinet(point, angle),
            isometric: (point) => Projections.isometric(point),
            perspectivez: (point) => Projections.perspectiveZ(point),
            perspectivexz: (point) => Projections.perspectiveXZ(point)
        };
        const applyProjection = projections[projection];

        // projeta
        for (let [i, j] of this.lines) {

            let p1 = applyTransform(this.points[i], this.translate, this.rotate, this.scale);
            let p2 = applyTransform(this.points[j], this.translate, this.rotate, this.scale);

            let proj1 = applyProjection(p1);
            let proj2 = applyProjection(p2);

            let [x1, y1] = toScreen(proj1, width, height, zoom);
            let [x2, y2] = toScreen(proj2, width, height, zoom);

            drawline(x1, y1, x2, y2, 'white');
        }
    }

    // funções para as keybinds

    applyTranslationDelta(coord, delta) {
        this.translate[AXIS[coord]] += delta;
    }
 
    applyRotationDelta(coord, delta) {
        this.rotate[AXIS[coord]] += delta;
    }
 
    applyScaleDelta(coord, delta) {
        this.scale[AXIS[coord]] += delta;
    }

    applyDelta(mode, coord, delta) {
        if (mode == '1') this.applyTranslationDelta(coord, delta);
        if (mode == '2') this.applyRotationDelta(coord, delta);
        if (mode == '3') this.applyScaleDelta(coord, delta);
    }

}
