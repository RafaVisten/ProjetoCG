import { drawline, fillPolygon } from './drawing.js';
import * as Projections from './projections.js'
import * as Matrix from './matrix.js'

// modulo para definição e manipulação de objetos 3d

function toScreen([x, y], width, height, viewport) {
    const [xMin, xMax, yMin, yMax] = viewport;
    const centerX = (xMin + xMax) / 2;
    const centerY = (yMin + yMax) / 2;
    const padding = Math.min(96, Math.max(32, Math.min(width, height) * 0.08));
    const scale = Math.min((width - padding * 2) / (xMax - xMin), (height - padding * 2) / (yMax - yMin));

    return [
        Math.round(width / 2 + (x - centerX) * scale),
        Math.round(height / 2 - (y - centerY) * scale)
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

function computeNormal(p0, p1, p2) {
    const u = [p1[0]-p0[0], p1[1]-p0[1], p1[2]-p0[2]];
    const v = [p2[0]-p0[0], p2[1]-p0[1], p2[2]-p0[2]];
    return [
        u[1]*v[2] - u[2]*v[1],
        u[2]*v[0] - u[0]*v[2],
        u[0]*v[1] - u[1]*v[0]
    ];
}

const AXIS = { x: 0, y: 1, z: 2 };

function rgbToCss([r, g, b], alpha = 1) {
    const clamp = (value) => Math.max(0, Math.min(1, value));
    const [red, green, blue] = [r, g, b].map(value => Math.round(clamp(value) * 255));

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function projectionFunction(projection, angle = 45, lambda = 1) {
    const projections = {
        cavalier: (point) => Projections.cavalier(point, angle, lambda),
        cabinet:  (point) => Projections.cabinet(point, angle),
        isometric: (point) => Projections.isometric(point),
        perspectivez: (point) => Projections.perspectiveZ(point),
        perspectivexz: (point) => Projections.perspectiveXZ(point)
    };

    return projections[projection] || projections.cavalier;
}

export class Wireframe {
    static coord_system = [-100, 100, -100, 100];
    static fig_name = '';

    constructor(data) {
        
        const params = data.trim().split('\n').map(line => line.trim()).filter(Boolean);

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
            this.addFace(params[index++].split(" ").map(Number));
        }

        this.rotate    = params[index] ? params[index++].split(" ").map(Number) : [0,0,0];
        this.scale     = params[index] ? params[index++].split(" ").map(Number) : [1,1,1];
        this.translate = params[index] ? params[index++].split(" ").map(Number) : [0,0,0];
        this.transform = composeTransform(this.translate, this.rotate, this.scale);
    }

    addFace(values) {
        const nPoints = values[0];
        const pointIndices = values.slice(1, 1 + nPoints).map(v => v - 1);
        const color = values.slice(1 + nPoints, 1 + nPoints + 3);

        this.faces.push({
            points: pointIndices,
            color,
            zAverage: 0,
            normal: [0, 0, 0],
            visible: true
        });
    }

    static parseFile(data) {
        if (!data) throw new Error("Nenhum arquivo fornecido.");

        const params = data.trim().split('\n').map(line => line.trim()).filter(Boolean);
        if (!params[0].startsWith("#")) return this.parseLegacyFile(params);

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
        if (text.length !== n_objs) {
            throw new Error(`Arquivo informa ${n_objs} objeto(s), mas ${text.length} foram encontrados.`);
        }

        for(let i = 0; i < n_objs; i++) objs.push(new Wireframe(text[i]));

        return objs;
    }

    static parseLegacyFile(params) {
        this.fig_name = 'Objeto antigo';
        this.coord_system = [-5, 5, -5, 5];

        const obj = Object.create(Wireframe.prototype);
        obj.name = 'Objeto antigo';
        obj.n_points = parseInt(params[0]);
        obj.n_lines = parseInt(params[1]);
        obj.n_faces = 0;

        let index = 2;

        obj.points = [];
        for (let i = 0; i < obj.n_points; i++) {
            obj.points.push(params[index++].split(" ").map(Number));
        }

        obj.lines = [];
        for (let i = 0; i < obj.n_lines; i++) {
            obj.lines.push(params[index++].split(" ").map(Number));
        }

        obj.faces = [];
        obj.translate = params[index] ? params[index++].split(" ").map(Number) : [0,0,0];
        obj.rotate    = params[index] ? params[index++].split(" ").map(Number) : [0,0,0];
        obj.scale     = params[index] ? params[index++].split(" ").map(Number) : [1,1,1];
        obj.transform = composeTransform(obj.translate, obj.rotate, obj.scale);

        return [obj];
    }

    static async fromFile(path, file) {
        let data;
        if(path) {
            const res = await fetch(path);
            data = await res.text();
        }
        if(file) data = file;
        return this.parseFile(data);
    }

    static sceneViewport(objects, projection = 'cavalier') {
        const points = objects.flatMap(object => object.projectedPoints(projection));

        if (points.length === 0) return this.coord_system;

        const xs = points.map(([x]) => x);
        const ys = points.map(([, y]) => y);
        let xMin = Math.min(...xs);
        let xMax = Math.max(...xs);
        let yMin = Math.min(...ys);
        let yMax = Math.max(...ys);
        let xRange = xMax - xMin;
        let yRange = yMax - yMin;

        if (xRange === 0) {
            xMin -= 1;
            xMax += 1;
            xRange = 2;
        }

        if (yRange === 0) {
            yMin -= 1;
            yMax += 1;
            yRange = 2;
        }

        const marginX = xRange * 0.12;
        const marginY = yRange * 0.12;

        return [xMin - marginX, xMax + marginX, yMin - marginY, yMax + marginY];
    }

    copy() {
        return new Wireframe(this.toDataString());
    }

    toDataString() {
        const lines = [
            `# ${this.name}`,
            `${this.n_points} ${this.n_lines} ${this.n_faces}`,
            ...this.points.map(point => point.join(' ')),
            ...this.lines.map(line => line.map(v => v + 1).join(' ')),
            ...this.faces.map(face => `${face.points.length} ${face.points.map(v => v + 1).join(' ')} ${face.color.join(' ')}`),
            this.rotate.join(' '),
            this.scale.join(' '),
            this.translate.join(' ')
        ];

        return lines.join('\n');
    }

    print() {
        console.log({
            name: this.name,
            points: this.points,
            lines: this.lines,
            faces: this.faces,
            rotate: this.rotate,
            scale: this.scale,
            translate: this.translate
        });
    }

    transformedPoints() {
        return this.points.map(point => transformPoint(point, this.transform));
    }

    projectedPoints(projection = 'cavalier', angle = 45, lambda = 1) {
        const applyProjection = projectionFunction(projection, angle, lambda);

        return this.transformedPoints().map(point => applyProjection(point));
    }

    getProjectedGeometry(width, height, viewport, projection = 'cavalier', angle = 45, lambda = 1) {
        const applyProjection = projectionFunction(projection, angle, lambda);
        const transformedPoints = this.points.map(point => transformPoint(point, this.transform));
        const screenPoints = transformedPoints.map(point => toScreen(applyProjection(point), width, height, viewport));

        for (let face of this.faces) {
            const zSum = face.points.reduce((sum, pointIndex) => sum + transformedPoints[pointIndex][2], 0);
            face.zAverage = zSum / face.points.length;
            if (face.points.length >= 3) {
                const p0 = transformedPoints[face.points[0]];
                const p1 = transformedPoints[face.points[1]];
                const p2 = transformedPoints[face.points[2]];
                face.normal = computeNormal(p0, p1, p2);
                face.visible = face.normal[2] >= 0;
            } else {
                face.normal = [0, 0, 1];
                face.visible = true;
            }
        }

        return { screenPoints };
    }

    getVisibleFaces(screenPoints, selected = false) {
        return this.faces
            .filter(face => face.visible)
            .map(face => ({
                points: face.points.map(pointIndex => screenPoints[pointIndex]),
                color: face.color,
                zAverage: face.zAverage,
                selected
            }));
    }

    drawFaces(screenPoints, selected = false) {
        const orderedFaces = [...this.faces].sort((a, b) => b.zAverage - a.zAverage);

        for (let face of orderedFaces) {
            const points = face.points.map(pointIndex => screenPoints[pointIndex]);
            const fillColor = rgbToCss(face.color, selected ? 0.78 : 0.55);
            const lineColor = selected ? 'red' : rgbToCss(face.color, 1);

            fillPolygon(points, lineColor, fillColor);
        }
    }

    drawLines(screenPoints, selected = false) {
        for (let [i, j] of this.lines) {
            let [x1, y1] = screenPoints[i];
            let [x2, y2] = screenPoints[j];

            drawline(x1, y1, x2, y2, selected ? 'red' : 'white');
        }
    }

    draw(width, height, viewport, projection = 'cavalier', selected = false, angle = 45, lambda = 1) {
        const { screenPoints } = this.getProjectedGeometry(width, height, viewport, projection, angle, lambda);

        return { screenPoints };
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