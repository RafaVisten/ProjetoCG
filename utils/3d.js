import { drawline } from './drawing.js';
import * as Projections from './projections.js'
import * as Matrix from './matrix.js'

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

function composeTransform(translate, rotate, scale) {
    const scaleTransform = Matrix.scale(scale);
    const rotateXTransform = Matrix.rotationX(rotate[0]);
    const rotateYTransform = Matrix.rotationY(rotate[1]);
    const rotateZTransform = Matrix.rotationZ(rotate[2]);
    const translateTransform = Matrix.translation(translate);

    return Matrix.multiply(
        translateTransform,
        Matrix.multiply(
            rotateZTransform,
            Matrix.multiply(
                rotateYTransform,
                Matrix.multiply(rotateXTransform, scaleTransform)
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
