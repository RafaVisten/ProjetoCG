import { drawline } from './drawing.js';
import * as Projections from './projections.js'

// modulo para definição e manipulação de objetos 3d

function toScreen([x, y], width, height, zoom = 100) {
    let norm = normalize([x, y], Wireframe.coord_system);
    return [
        Math.round(width/2 + x * zoom),
        Math.round(height/2 - y * zoom)
    ];
}

function normalize([x, y], sys) {
    let [x_min, x_max, y_min, y_max] = sys;
    return [
        (x - x_min) / (x_max - x_min),
        (y - y_min) / (y_max - y_min) 
    ];
}


function toRad(degrees) {
    return degrees * Math.PI / 180;
}

function multiplyMatrices(a, b) {
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

function translationMatrix([x, y, z]) {
    return [
        1, 0, 0, x,
        0, 1, 0, y,
        0, 0, 1, z
    ];
}

function scaleMatrix([x, y, z]) {
    return [
        x, 0, 0, 0,
        0, y, 0, 0,
        0, 0, z, 0
    ];
}

function rotationXMatrix(degrees) {
    const angle = toRad(degrees);
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    return [
        1, 0, 0, 0,
        0, c, -s, 0,
        0, s, c, 0
    ];
}

function rotationYMatrix(degrees) {
    const angle = toRad(degrees);
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    return [
        c, 0, s, 0,
        0, 1, 0, 0,
        -s, 0, c, 0
    ];
}

function rotationZMatrix(degrees) {
    const angle = toRad(degrees);
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    return [
        c, -s, 0, 0,
        s, c, 0, 0,
        0, 0, 1, 0
    ];
}

function composeTransform(translate, rotate, scale) {
    const scaleTransform = scaleMatrix(scale);
    const rotateXTransform = rotationXMatrix(rotate[0]);
    const rotateYTransform = rotationYMatrix(rotate[1]);
    const rotateZTransform = rotationZMatrix(rotate[2]);
    const translateTransform = translationMatrix(translate);

    return multiplyMatrices(
        translateTransform,
        multiplyMatrices(
            rotateZTransform,
            multiplyMatrices(
                rotateYTransform,
                multiplyMatrices(rotateXTransform, scaleTransform)
            )
        )
    );
}

function transformPoint([x, y, z], matrix) {
    return [
        matrix[0] * x + matrix[1] * y + matrix[2] * z + matrix[3],
        matrix[4] * x + matrix[5] * y + matrix[6] * z + matrix[7],
        matrix[8] * x + matrix[9] * y + matrix[10] * z + matrix[11]
    ];
}

const AXIS = { x: 0, y: 1, z: 2 };

export class Wireframe {
    static coord_system;
    static fig_name;
    constructor(data) {
        
        const params = data.trim().split('\n');

        this.name = params[0].substring(1).trim();
        let plf = params[1].split(" ").map(Number)
        this.n_points = plf[0];
        this.n_lines = plf[1];
        this.n_faces = plf[2];

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
                params[index++].split(" ").map(Number).map(v => v - 1) // vértices precisam começar em 0
            );
        }

        this.faces = [];
        for (let i = 0; i < this.n_faces; i++) {
            this.faces.push(
                params[index++].split(" ").map(Number)
            );
        }

        this.rotate    = params[index] ? params[index++].split(" ").map(Number) : [0,0,0];
        this.scale     = params[index] ? params[index++].split(" ").map(Number) : [1,1,1];
        this.translate = params[index] ? params[index++].split(" ").map(Number) : [0,0,0];
        this.transform = composeTransform(this.translate, this.rotate, this.scale);
    }

    static async fromFile(path, file) {
        let data;
        if(path) {
            const res = await fetch(path);
            data = await res.text();
        }
        if(file) data = file;
        if (!data) throw new Error("Nenhum arquivo fornecido.");

        const params = data.trim().split('\n');
        this.fig_name = params[0].substring(1).trim();
        this.coord_system = params[1].split(" ").map(Number);
        const n_objs = parseInt(params[2]);
        let first = null;
        let text = [], objs = [];
        
        for(let i = 3; i < params.length; i++) {
            if(params[i].startsWith("#")) {
                if(first !== null) text.push(params.slice(first, i).join('\n')); // termina o objeto anterior
                first = i; // marca o início do próximo
            }
        }
        if(first !== null) text.push(params.slice(first).join('\n')); // último
        for(let i = 0; i < n_objs; i++) objs.push(new Wireframe(text[i]));

        return objs;
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
        const transformedPoints = this.points.map(point => transformPoint(point, this.transform));

        // projeta
        for (let [i, j] of this.lines) {

            let p1 = transformedPoints[i];
            let p2 = transformedPoints[j];

            let proj1 = applyProjection(p1);
            let proj2 = applyProjection(p2);

            let [x1, y1] = toScreen(proj1, width, height, 1);
            let [x2, y2] = toScreen(proj2, width, height, 1);

            drawline(x1, y1, x2, y2, 'white');
        }
    }

    // funções para as keybinds

    updateTransform() {
        this.transform = composeTransform(this.translate, this.rotate, this.scale);
    }

    applyDelta(mode, coord, delta) {
        const axisIndex = AXIS[coord];

        if (mode == '1') this.translate[axisIndex] += delta;
        if (mode == '2') this.rotate[axisIndex] += delta;
        if (mode == '3') this.scale[axisIndex] += delta;

        this.updateTransform();
    }

}
