import {Wireframe} from './utils/3d.js';
import { fillPolygon } from './utils/drawing.js';

const tela = document.getElementById("tela");
const c = tela.getContext("2d");
const picker = document.getElementById("picker");
const ajuda = document.getElementById("ajuda");
const figuraLabel = document.getElementById("figura");
const modoLabel = document.getElementById("modo");
const eixoLabel = document.getElementById("eixo");
const projLabel = document.getElementById("proj");
const objetoLabel = document.getElementById("objeto");
const anteriorButton = document.getElementById("anterior");
const proximoButton = document.getElementById("proximo");

const MODES = { '1': 'Translação', '2': 'Rotação', '3': 'Escala' };
const AXES = { '4': 'x', '5': 'y', '6': 'z' };
const PROJECTIONS = [
    { key: 'cavalier', label: 'Cavaleira' },
    { key: 'cabinet', label: 'Cabinet' },
    { key: 'isometric', label: 'Isométrica' },
    { key: 'perspectivez', label: 'Perspectiva Z' },
    { key: 'perspectivexz', label: 'Perspectiva XZ' }
];

let objects = [];
let selectedIndex = 0;
let mode = '1';
let axis = 'x';
let projectionIndex = 0;
let viewport = Wireframe.coord_system;

ajuda.hidden = true;

function toggleHelp() {
    ajuda.hidden = !ajuda.hidden;
}

function resizeCanvas() {
    tela.width = window.innerWidth;
    tela.height = window.innerHeight;
}

function selectedProjection() {
    return PROJECTIONS[projectionIndex];
}

function updateLabels() {
    const selected = objects[selectedIndex];

    figuraLabel.innerHTML = `<b>Figura: </b> ${Wireframe.fig_name || '-'}`;
    modoLabel.innerHTML = `<b>Modo:</b> ${MODES[mode]}`;
    eixoLabel.innerHTML = `<b>Eixo:</b> ${axis}`;
    projLabel.innerHTML = `<b>Projeção:</b> ${selectedProjection().label}`;
    objetoLabel.innerHTML = selected ? `Objeto: ${selected.name} (${selectedIndex + 1}/${objects.length})` : 'Objeto: -';
}

function rgbToCssLocal([r, g, b], alpha = 1) {
    const clamp = v => Math.max(0, Math.min(1, v));
    const [red, green, blue] = [r, g, b].map(v => Math.round(clamp(v) * 255));
    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function redraw() {
    c.clearRect(0, 0, tela.width, tela.height);

    const allVisibleFaces = [];

    for (let i = 0; i < objects.length; i++) {
        const selected = (i === selectedIndex);
        const { screenPoints } = objects[i].draw(tela.width, tela.height, viewport, selectedProjection().key);
        if (objects[i].faces.length > 0) {
            allVisibleFaces.push(...objects[i].getVisibleFaces(screenPoints, selected));
        }
    }

    allVisibleFaces.sort((a, b) => a.zAverage - b.zAverage);

    for (let face of allVisibleFaces) {
        const fillColor = rgbToCssLocal(face.color, face.selected ? 0.78 : 0.55);
        const lineColor = face.selected ? 'red' : '';
        fillPolygon(face.points, lineColor, fillColor);
    }

    c.stroke();
}


function updateViewport() {
    viewport = Wireframe.sceneViewport(objects, selectedProjection().key);
}

function setObjects(nextObjects) {
    objects = nextObjects;
    selectedIndex = 0;
    updateViewport();
    updateLabels();
    redraw();
}

function selectObject(delta) {
    selectedIndex = (selectedIndex + delta + objects.length) % objects.length;
    updateLabels();
    redraw();
}

resizeCanvas();
setObjects(await Wireframe.fromFile('./objects/figure.dat', null));

// usa o file input pra mudar o objeto mostrado na tela
picker.addEventListener('change', (event) => {

    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {
        try {
            setObjects(Wireframe.parseFile(e.target.result));
        } catch (error) {
            console.error(error);
            objetoLabel.innerHTML = 'Objeto: erro ao carregar arquivo';
        }
    };

    reader.readAsText(file);
});

anteriorButton.addEventListener('click', () => selectObject(-1));
proximoButton.addEventListener('click', () => selectObject(1));

// recebe inputs do teclado
document.addEventListener('keydown', (e) => {

    if (!objects.length) return;

    let press = e.key.toLowerCase();

    if (press == 'tab') {
        e.preventDefault();
        selectObject(e.shiftKey ? -1 : 1);
        return;
    }

    // modo de transformação: 1 - translação, 2 - rotação, 3 - escala
    if (['1', '2', '3'].includes(press)) {
        if (press != mode) {
            mode = press; 
            updateLabels();
        }
    }
    
    // modo de eixo
    if(Object.keys(AXES).includes(press)) {
        if (AXES[press] != axis) {
            axis = AXES[press]; 
            updateLabels();
        }
    }

    // modo de projeção
    if (press == 'p') {
        projectionIndex = (projectionIndex + 1) % PROJECTIONS.length;
        updateViewport();
        updateLabels();
        redraw();
        return;
    }

    const bindings = {
        '+': () => objects[selectedIndex].applyDelta(mode, axis,  1),
        '=': () => objects[selectedIndex].applyDelta(mode, axis,  1),
        '-':  () => objects[selectedIndex].applyDelta(mode, axis,  -1),
        ',':  () => selectObject(-1),
        '.':  () => selectObject(1),
        'F1': () => toggleHelp()
    };

    if (bindings[e.key]) {
        if (e.key == 'F1') e.preventDefault();
        bindings[e.key]();
        redraw();
    }
});

window.addEventListener('resize', () => {
    resizeCanvas();
    redraw();
});
